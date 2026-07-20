#!/usr/bin/env python3
"""Чтение данных с ПЛК Siemens по Ethernet (протокол S7)."""

from __future__ import annotations

import argparse
import logging
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from snap7 import Area, Client
from snap7.client import Parameter
from snap7.error import S7ProtocolError
from snap7.util import get_bool, get_dint, get_int, get_real, get_word

from plc_db import DbConfig, PlcDatabase, load_db_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

AREA_MAP = {
    "db": Area.DB,
    "inputs": Area.PE,
    "outputs": Area.PA,
    "merker": Area.MK,
}

TYPE_SIZES = {
    "bool": 1,
    "int": 2,
    "word": 2,
    "dint": 4,
    "real": 4,
}


@dataclass(frozen=True)
class PlcConfig:
    host: str
    port: int
    rack: int
    slot: int
    timeout_sec: float


@dataclass(frozen=True)
class SignalConfig:
    name: str
    area: str
    offset: int
    data_type: str
    db: int = 0
    bit: int = 0
    scale: float = 1.0
    unit: str = ""


@dataclass(frozen=True)
class PollConfig:
    interval_sec: float
    continuous: bool


def load_poll_config(raw: dict[str, Any] | None) -> PollConfig:
    poll = raw or {}
    return PollConfig(
        interval_sec=float(poll.get("interval_sec", 1.0)),
        continuous=bool(poll.get("continuous", True)),
    )


def load_config(path: Path) -> tuple[PlcConfig, list[SignalConfig], DbConfig, PollConfig]:
    with path.open(encoding="utf-8") as file:
        raw = yaml.safe_load(file)

    plc = raw["plc"]
    plc_config = PlcConfig(
        host=plc["host"],
        port=int(plc.get("port", 102)),
        rack=int(plc.get("rack", 0)),
        slot=int(plc.get("slot", 1)),
        timeout_sec=float(plc.get("timeout_sec", 3.0)),
    )

    signals: list[SignalConfig] = []
    for item in raw.get("signals", []):
        signals.append(
            SignalConfig(
                name=item["name"],
                area=item["area"],
                offset=int(item["offset"]),
                data_type=item["type"],
                db=int(item.get("db", 0)),
                bit=int(item.get("bit", 0)),
                scale=float(item.get("scale", 1.0)),
                unit=item.get("unit", ""),
            )
        )

    db_config = load_db_config(raw.get("database"), path.parent)
    poll_config = load_poll_config(raw.get("poll"))
    return plc_config, signals, db_config, poll_config


def decode_value(data: bytearray, signal: SignalConfig) -> Any:
    # db_read/read_area возвращают буфер с индексом 0 = signal.offset
    if signal.data_type == "bool":
        return get_bool(data, 0, signal.bit)
    if signal.data_type == "int":
        return get_int(data, 0) * signal.scale
    if signal.data_type == "word":
        return get_word(data, 0) * signal.scale
    if signal.data_type == "dint":
        return get_dint(data, 0) * signal.scale
    if signal.data_type == "real":
        return get_real(data, 0) * signal.scale

    raise ValueError(f"Неизвестный тип данных: {signal.data_type}")


def format_address(signal: SignalConfig) -> str:
    if signal.area == "db":
        if signal.data_type == "bool":
            return f"DB{signal.db}.DBX{signal.offset}.{signal.bit}"
        type_map = {"real": "DBD", "dint": "DBD", "int": "DBW", "word": "DBW"}
        prefix = type_map.get(signal.data_type, "DBB")
        return f"DB{signal.db}.{prefix}{signal.offset}"
    prefix = {"inputs": "I", "outputs": "Q", "merker": "M"}[signal.area]
    return f"{prefix}{signal.offset}.{signal.bit}"


class S7PlcReader:
    def __init__(self, config: PlcConfig) -> None:
        self._config = config
        self._client = Client()

    def connect(self) -> None:
        timeout_ms = int(self._config.timeout_sec * 1000)
        self._client.set_param(Parameter.PingTimeout, timeout_ms)
        self._client.set_param(Parameter.SendTimeout, timeout_ms)
        self._client.set_param(Parameter.RecvTimeout, timeout_ms)

        self._client.connect(
            self._config.host,
            self._config.rack,
            self._config.slot,
            tcp_port=self._config.port,
        )
        logger.info(
            "Подключено к %s:%s (rack=%s, slot=%s)",
            self._config.host,
            self._config.port,
            self._config.rack,
            self._config.slot,
        )

    def close(self) -> None:
        if self._client.get_connected():
            self._client.disconnect()
        self._client.destroy()
        logger.info("Соединение закрыто")

    def read_signal(self, signal: SignalConfig) -> Any:
        size = TYPE_SIZES.get(signal.data_type)
        if size is None:
            raise ValueError(f"Неизвестный тип данных: {signal.data_type}")

        if signal.area == "db":
            data = self._client.db_read(signal.db, signal.offset, size)
        else:
            area = AREA_MAP.get(signal.area)
            if area is None:
                raise ValueError(f"Неизвестная область памяти: {signal.area}")
            data = self._client.read_area(area, 0, signal.offset, size)

        return decode_value(bytearray(data), signal)


def probe_plc(config_path: Path, db_range: int = 30) -> None:
    plc_config, _, _, _ = load_config(config_path)
    reader = S7PlcReader(plc_config)

    try:
        reader.connect()
        client = reader._client

        cpu = client.get_cpu_info()
        logger.info(
            "CPU: %s (%s)",
            cpu.ModuleTypeName.decode().strip(),
            cpu.ASName.decode().strip(),
        )

        try:
            blocks = client.list_blocks()
            logger.info(
                "Блоки в ПЛК: DB=%s OB=%s FB=%s FC=%s",
                blocks.DBCount,
                blocks.OBCount,
                blocks.FBCount,
                blocks.FCCount,
            )
        except S7ProtocolError as error:
            logger.warning("list_blocks недоступен: %s", error)

        logger.info("Доступные DB (чтение 1 байта с offset 0):")
        found_db = False
        for db_number in range(1, db_range + 1):
            try:
                client.db_read(db_number, 0, 1)
                logger.info("  DB%s — OK", db_number)
                found_db = True
            except S7ProtocolError:
                continue
        if not found_db:
            logger.warning("  Ни один DB1..DB%s не читается", db_range)

        for name, area in [("inputs", Area.PE), ("outputs", Area.PA), ("merker", Area.MK)]:
            try:
                data = client.read_area(area, 0, 0, 1)
                logger.info("  %s — OK (байт 0 = %s)", name, data[0])
            except S7ProtocolError as error:
                logger.warning("  %s — %s", name, error)
    finally:
        reader.close()


def format_value(value: Any, unit: str) -> str:
    if isinstance(value, bool):
        text = "ON" if value else "OFF"
    elif isinstance(value, float):
        text = f"{value:.3f}".rstrip("0").rstrip(".")
    else:
        text = str(value)

    return f"{text} {unit}".strip()


def read_all(config_path: Path, db_config: DbConfig | None = None) -> dict[str, Any]:
    plc_config, signals, config_db, _ = load_config(config_path)
    db_config = db_config or config_db
    reader = S7PlcReader(plc_config)
    database: PlcDatabase | None = None

    try:
        reader.connect()
        result: dict[str, Any] = {}
        addresses: dict[str, str] = {}
        for signal in signals:
            try:
                value = reader.read_signal(signal)
            except S7ProtocolError as error:
                raise RuntimeError(
                    f"Ошибка чтения {signal.name} ({format_address(signal)}): {error}"
                ) from error
            result[signal.name] = value
            addresses[signal.name] = format_address(signal)
            logger.info("%s = %s", signal.name, format_value(value, signal.unit))

        if db_config.enabled and result:
            database = PlcDatabase(db_config.path)
            count = database.save_readings("s7", result, addresses)
            logger.info("SQLite: записано %s значений в %s", count, db_config.path)

        return result
    finally:
        reader.close()
        if database:
            database.close()


def read_loop(config_path: Path) -> None:
    plc_config, signals, db_config, poll_config = load_config(config_path)
    interval_sec = poll_config.interval_sec
    database: PlcDatabase | None = None

    if db_config.enabled:
        database = PlcDatabase(db_config.path)

    logger.info(
        "Непрерывный поток S7: %s сигналов, интервал %s с, Ctrl+C для остановки",
        len(signals),
        interval_sec,
    )

    try:
        while True:
            reader = S7PlcReader(plc_config)
            try:
                reader.connect()
                while True:
                    result: dict[str, Any] = {}
                    addresses: dict[str, str] = {}
                    for signal in signals:
                        value = reader.read_signal(signal)
                        result[signal.name] = value
                        addresses[signal.name] = format_address(signal)

                    if database and result:
                        count = database.save_readings("s7", result, addresses)
                        logger.info(
                            "SQLite: +%s | %s",
                            count,
                            ", ".join(
                                f"{name}={format_value(value, '')}"
                                for name, value in list(result.items())[:5]
                            ),
                        )

                    time.sleep(interval_sec)
            except S7ProtocolError as error:
                logger.warning(
                    "Разрыв потока: %s — переподключение через %s с",
                    error,
                    interval_sec,
                )
                time.sleep(interval_sec)
            finally:
                reader.close()
    except KeyboardInterrupt:
        logger.info("Поток остановлен")
    finally:
        if database:
            database.close()
            logger.info("SQLite закрыт: %s", db_config.path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Чтение данных с ПЛК Siemens S7")
    parser.add_argument(
        "-c",
        "--config",
        type=Path,
        default=Path(__file__).with_name("config.yaml"),
        help="Путь к config.yaml",
    )
    parser.add_argument(
        "--probe",
        action="store_true",
        help="Диагностика: показать CPU info и доступные DB/области памяти",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Одно чтение и выход (по умолчанию — непрерывный поток)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.config.exists():
        logger.error("Файл конфигурации не найден: %s", args.config)
        return 1

    try:
        if args.probe:
            probe_plc(args.config)
        elif args.once:
            read_all(args.config)
        else:
            _, _, _, poll_config = load_config(args.config)
            if poll_config.continuous:
                read_loop(args.config)
            else:
                read_all(args.config)
    except (RuntimeError, ValueError, KeyError) as error:
        logger.error("%s", error)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
