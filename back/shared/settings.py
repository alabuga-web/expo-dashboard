"""Настройки из переменных окружения."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # dev  — симулятор + UI (без реального ПЛК)
    # prod — реальный ПЛК + UI
    plc_mode: str = Field(default="dev", validation_alias="PLC_MODE")

    # Kafka
    kafka_bootstrap_servers: str = Field(
        default="kafka:9092",
        validation_alias="KAFKA_BOOTSTRAP_SERVERS",
    )
    kafka_topic: str = Field(default="plc.tag.events", validation_alias="KAFKA_TOPIC")

    # OPC listener
    listener_servers: str = Field(default="", validation_alias="LISTENER_SERVERS")
    poll_interval_sec: float = Field(default=1.0, validation_alias="POLL_INTERVAL_SEC")
    plc_opc_endpoint: str = Field(
        default="opc.tcp://192.168.0.1:4840",
        validation_alias="PLC_OPC_ENDPOINT",
    )
    opc_nodeset: str = Field(
        default="Выставка демо.PLC_2.OPCUA.xml",
        validation_alias="OPC_NODESET",
    )

    # Backend / UI
    database_path: str = Field(default="plc_data.db", validation_alias="DATABASE_PATH")
    ui_port: int = Field(default=8000, validation_alias="UI_PORT")

    # Docker compose (только для stack.sh / compose)
    compose_profiles: str = Field(default="", validation_alias="COMPOSE_PROFILES")
    opc_simulator_port: int = Field(default=4840, validation_alias="OPC_SIMULATOR_PORT")
    kafka_external_port: int = Field(default=19092, validation_alias="KAFKA_EXTERNAL_PORT")

    @property
    def is_dev(self) -> bool:
        return self.plc_mode.lower() == "dev"

    @property
    def listener_server_ids(self) -> list[str]:
        if self.listener_servers.strip():
            return [s.strip() for s in self.listener_servers.split(",") if s.strip()]
        return ["simulator"] if self.is_dev else ["plc_2"]

    @property
    def ui_url(self) -> str:
        return f"http://localhost:{self.ui_port}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def apply_env_overrides(raw: dict, settings: Settings | None = None) -> dict:
    """Подставить env-переопределения в конфиг из servers.yaml."""
    settings = settings or get_settings()
    result = dict(raw)

    kafka = dict(result.get("kafka", {}))
    kafka["bootstrap_servers"] = os.environ.get(
        "KAFKA_BOOTSTRAP_SERVERS",
        kafka.get("bootstrap_servers", settings.kafka_bootstrap_servers),
    )
    kafka["topic"] = os.environ.get(
        "KAFKA_TOPIC",
        kafka.get("topic", settings.kafka_topic),
    )
    result["kafka"] = kafka

    poll = dict(result.get("poll", {}))
    poll["interval_sec"] = float(
        os.environ.get("POLL_INTERVAL_SEC", poll.get("interval_sec", settings.poll_interval_sec))
    )
    result["poll"] = poll

    database = dict(result.get("database", {}))
    database["path"] = os.environ.get(
        "DATABASE_PATH",
        database.get("path", settings.database_path),
    )
    result["database"] = database

    servers = []
    for item in result.get("servers", []):
        server = dict(item)
        if server.get("id") == "plc_2":
            server["endpoint"] = os.environ.get(
                "PLC_OPC_ENDPOINT",
                server.get("endpoint", settings.plc_opc_endpoint),
            )
        if os.environ.get("OPC_NODESET"):
            server["nodeset"] = settings.opc_nodeset
        servers.append(server)
    result["servers"] = servers

    return result
