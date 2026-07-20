#!/usr/bin/env python3
"""Чтение данных с ПЛК Siemens через OPC UA."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from asyncua import Client, ua

from plc_db import DbConfig, PlcDatabase, load_db_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

UA_NS = {"ua": "http://opcfoundation.org/UA/2011/03/UANodeSet.xsd"}
GROUP_BY_PARENT = {
    "ns=3;s=Inputs": "inputs",
    "ns=3;s=Outputs": "outputs",
    "ns=3;s=Memory": "memory",
    "ns=3;s=PLC": "plc",
}


@dataclass(frozen=True)
class OpcConfig:
    endpoint: str
    timeout_sec: float
    user: str
    password: str
    nodeset: Path | None


@dataclass(frozen=True)
class NodeConfig:
    name: str
    node_id: str
    group: str = ""
    data_type: str = ""


def parse_opcua_xml(path: Path) -> list[NodeConfig]:
    root = ET.parse(path).getroot()
    nodes: list[NodeConfig] = []

    for element in root.findall("ua:UAVariable", UA_NS):
        node_id = element.attrib.get("NodeId", "")
        browse_name = element.attrib.get("BrowseName", "")
        data_type = element.attrib.get("DataType", "")
        parent = element.attrib.get("ParentNodeId", "")
        name = browse_name.split(":", 1)[-1] if ":" in browse_name else browse_name

        if not node_id or name == "EnumValues":
            continue

        group = GROUP_BY_PARENT.get(parent, "other")
        nodes.append(
            NodeConfig(
                name=name,
                node_id=node_id,
                group=group,
                data_type=data_type,
            )
        )

    return nodes


def load_config(path: Path) -> tuple[OpcConfig, list[NodeConfig], DbConfig, PollConfig]:
    with path.open(encoding="utf-8") as file:
        raw = yaml.safe_load(file)

    opc = raw["opc"]
    config_dir = path.parent
    nodeset_raw = opc.get("nodeset")
    nodeset = (config_dir / nodeset_raw).resolve() if nodeset_raw else None

    opc_config = OpcConfig(
        endpoint=opc["endpoint"],
        timeout_sec=float(opc.get("timeout_sec", 5.0)),
        user=opc.get("user", ""),
        password=opc.get("password", ""),
        nodeset=nodeset,
    )

    explicit_nodes = [
        NodeConfig(
            name=item["name"],
            node_id=item["node_id"],
            group=item.get("group", ""),
            data_type=item.get("type", ""),
        )
        for item in raw.get("nodes", [])
    ]

    db_config = load_db_config(raw.get("database"), config_dir)
    poll_config = load_poll_config(raw.get("poll"))

    if explicit_nodes:
        return opc_config, explicit_nodes, db_config, poll_config

    if not nodeset or not nodeset.exists():
        return opc_config, [], db_config, poll_config

    xml_nodes = parse_opcua_xml(nodeset)
    groups = {g.lower() for g in raw.get("groups", [])}
    if groups:
        xml_nodes = [node for node in xml_nodes if node.group in groups]

    return opc_config, xml_nodes, db_config, poll_config


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


def format_value(value: Any) -> str:
    if isinstance(value, bool):
        return "ON" if value else "OFF"
    if isinstance(value, float):
        return f"{value:.3f}".rstrip("0").rstrip(".")
    return str(value)


def list_xml_nodes(config_path: Path) -> int:
    with config_path.open(encoding="utf-8") as file:
        raw = yaml.safe_load(file)

    nodeset_raw = raw["opc"].get("nodeset")
    if not nodeset_raw:
        logger.error("Укажи opc.nodeset в config_opc.yaml")
        return 1

    nodeset = (config_path.parent / nodeset_raw).resolve()
    if not nodeset.exists():
        logger.error("NodeSet не найден: %s", nodeset)
        return 1

    nodes = parse_opcua_xml(nodeset)
    logger.info("NodeSet: %s", nodeset.name)
    logger.info("PLC: PLC_2 | Namespace: ns=3 | Всего переменных: %s", len(nodes))

    current_group = ""
    for node in sorted(nodes, key=lambda item: (item.group, item.name)):
        if node.group != current_group:
            current_group = node.group
            logger.info("")
            logger.info("=== %s ===", current_group.upper())
        logger.info("  %-45s %-8s %s", node.name, node.data_type, node.node_id)

    return 0


class OpcPlcReader:
    def __init__(self, config: OpcConfig) -> None:
        self._config = config

    def _make_client(self) -> Client:
        client = Client(url=self._config.endpoint, timeout=self._config.timeout_sec)
        if self._config.user:
            client.set_user(self._config.user)
            client.set_password(self._config.password)
        return client

    async def probe(self) -> None:
        async with self._make_client() as client:
            logger.info("Подключено к %s", self._config.endpoint)

            namespaces = await client.get_namespace_array()
            logger.info("Namespaces: %s", namespaces)

            try:
                plc = client.get_node('ns=3;s=PLC')
                model = await client.get_node('ns=3;s=Model').read_value()
                order = await client.get_node('ns=3;s=OrderNumber').read_value()
                mode = await client.get_node('ns=3;s=OperatingMode').read_value()
                logger.info("PLC: %s | Model: %s | Order: %s | Mode: %s", plc, model, order, mode)
            except ua.UaError as error:
                logger.warning("PLC info: %s", error)

            for folder in ("Inputs", "Outputs", "Memory"):
                try:
                    folder_node = client.get_node(f"ns=3;s={folder}")
                    children = await folder_node.get_children()
                    logger.info("%s: %s переменных", folder, len(children))
                except ua.UaError as error:
                    logger.warning("%s: %s", folder, error)

    async def read_nodes(
        self,
        nodes: list[NodeConfig],
        db_config: DbConfig | None = None,
    ) -> dict[str, Any]:
        if not nodes:
            raise ValueError(
                "Список nodes пуст. Заполни nodes в config_opc.yaml или groups + nodeset"
            )

        async with self._make_client() as client:
            logger.info("Подключено к %s", self._config.endpoint)
            result: dict[str, Any] = {}
            addresses: dict[str, str] = {}

            for item in nodes:
                try:
                    node = client.get_node(item.node_id)
                    value = await node.read_value()
                    result[item.name] = value
                    addresses[item.name] = item.node_id
                    logger.info("%s = %s", item.name, format_value(value))
                except ua.UaError as error:
                    raise RuntimeError(
                        f"Ошибка чтения {item.name} ({item.node_id}): {error}"
                    ) from error

            if db_config and db_config.enabled and result:
                database = PlcDatabase(db_config.path)
                try:
                    count = database.save_readings("opc", result, addresses)
                    logger.info("SQLite: записано %s значений в %s", count, db_config.path)
                finally:
                    database.close()

            return result

    async def read_loop(
        self,
        nodes: list[NodeConfig],
        db_config: DbConfig | None = None,
        interval_sec: float = 1.0,
    ) -> None:
        if not nodes:
            raise ValueError(
                "Список nodes пуст. Заполни nodes в config_opc.yaml или groups + nodeset"
            )

        database: PlcDatabase | None = None
        if db_config and db_config.enabled:
            database = PlcDatabase(db_config.path)

        addresses = {item.name: item.node_id for item in nodes}
        logger.info(
            "Непрерывный поток OPC: %s тегов, интервал %s с, Ctrl+C для остановки",
            len(nodes),
            interval_sec,
        )

        try:
            while True:
                try:
                    async with self._make_client() as client:
                        logger.info("Подключено к %s", self._config.endpoint)
                        opc_nodes = [client.get_node(item.node_id) for item in nodes]

                        while True:
                            result: dict[str, Any] = {}
                            for item, node in zip(nodes, opc_nodes, strict=True):
                                value = await node.read_value()
                                result[item.name] = value

                            if database and result:
                                count = database.save_readings("opc", result, addresses)
                                logger.info(
                                    "SQLite: +%s | %s",
                                    count,
                                    ", ".join(
                                        f"{name}={format_value(value)}"
                                        for name, value in list(result.items())[:5]
                                    ),
                                )
                            else:
                                logger.info(
                                    "Прочитано %s тегов",
                                    len(result),
                                )

                            await asyncio.sleep(interval_sec)
                except asyncio.CancelledError:
                    raise
                except (RuntimeError, ValueError, OSError, ua.UaError) as error:
                    logger.warning(
                        "Разрыв потока: %s — переподключение через %s с",
                        error,
                        interval_sec,
                    )
                    await asyncio.sleep(interval_sec)
        finally:
            if database:
                database.close()
                logger.info("SQLite закрыт: %s", db_config.path if db_config else "")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Чтение данных ПЛК через OPC UA")
    parser.add_argument(
        "-c",
        "--config",
        type=Path,
        default=Path(__file__).with_name("config_opc.yaml"),
        help="Путь к config_opc.yaml",
    )
    parser.add_argument(
        "--browse",
        action="store_true",
        help="Подключиться и показать дерево OPC UA на сервере",
    )
    parser.add_argument(
        "--list-xml",
        action="store_true",
        help="Показать все переменные из TIA Portal NodeSet XML",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Одно чтение и выход (по умолчанию — непрерывный поток)",
    )
    return parser.parse_args()


async def async_main(args: argparse.Namespace) -> int:
    if not args.config.exists():
        logger.error("Файл конфигурации не найден: %s", args.config)
        return 1

    if args.list_xml:
        return list_xml_nodes(args.config)

    opc_config, nodes, db_config, poll_config = load_config(args.config)
    reader = OpcPlcReader(opc_config)
    continuous = poll_config.continuous and not args.once

    try:
        if args.browse:
            await reader.probe()
        elif continuous:
            await reader.read_loop(
                nodes,
                db_config,
                interval_sec=poll_config.interval_sec,
            )
        else:
            await reader.read_nodes(nodes, db_config)
    except asyncio.CancelledError:
        logger.info("Поток остановлен")
    except (RuntimeError, ValueError, OSError, ua.UaError) as error:
        logger.error("%s", error)
        return 1

    return 0


def main() -> int:
    args = parse_args()
    try:
        return asyncio.run(async_main(args))
    except KeyboardInterrupt:
        logger.info("Поток остановлен")
        return 0


if __name__ == "__main__":
    sys.exit(main())
