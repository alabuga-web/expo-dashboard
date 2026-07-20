#!/usr/bin/env python3
"""Multi-server OPC UA listener → Kafka."""

from __future__ import annotations

import argparse
import asyncio
import logging
import signal
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from opc_listener.listener import OpcServerListener, ServerConfig
from opc_listener.publisher import KafkaPublisher
from shared.settings import apply_env_overrides, get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AppConfig:
    kafka_bootstrap: str
    kafka_topic: str
    poll_interval: float
    servers: list[ServerConfig]


def load_config(path: Path) -> AppConfig:
    with path.open(encoding="utf-8") as file:
        raw: dict[str, Any] = yaml.safe_load(file)

    settings = get_settings()
    raw = apply_env_overrides(raw, settings)

    base = path.parent.parent
    kafka = raw.get("kafka", {})
    poll = raw.get("poll", {})

    servers: list[ServerConfig] = []
    for item in raw.get("servers", []):
        nodeset = (base / item["nodeset"]).resolve()
        groups = {g.lower() for g in item.get("groups", [])}
        servers.append(
            ServerConfig(
                id=item["id"],
                endpoint=item["endpoint"],
                nodeset=nodeset,
                groups=groups,
                timeout_sec=float(item.get("timeout_sec", 5.0)),
                user=item.get("user", ""),
                password=item.get("password", ""),
            )
        )

    return AppConfig(
        kafka_bootstrap=kafka.get("bootstrap_servers", "localhost:9092"),
        kafka_topic=kafka.get("topic", "plc.tag.events"),
        poll_interval=float(poll.get("interval_sec", 1.0)),
        servers=servers,
    )


async def main() -> None:
    parser = argparse.ArgumentParser(description="OPC UA → Kafka listener")
    parser.add_argument(
        "--config",
        default="config/servers.yaml",
        help="Path to servers.yaml",
    )
    parser.add_argument(
        "--servers",
        nargs="*",
        help="Only run listeners for these server ids",
    )
    args = parser.parse_args()

    base = Path(__file__).resolve().parent.parent
    config_path = (base / args.config).resolve()
    settings = get_settings()
    app_config = load_config(config_path)

    servers = app_config.servers
    server_filter = args.servers or settings.listener_server_ids
    if server_filter:
        allowed = set(server_filter)
        servers = [s for s in servers if s.id in allowed]

    if not servers:
        logger.error(
            "No servers configured (PLC_MODE=%s, filter=%s)",
            settings.plc_mode,
            server_filter,
        )
        return

    logger.info(
        "Mode: %s | Servers: %s | Kafka: %s",
        settings.plc_mode,
        [s.id for s in servers],
        app_config.kafka_bootstrap,
    )

    publisher = KafkaPublisher(app_config.kafka_bootstrap, app_config.kafka_topic)
    await publisher.start()

    listeners = [
        OpcServerListener(
            config=server,
            publisher=publisher,
            poll_interval=app_config.poll_interval,
        )
        for server in servers
    ]

    tasks = [asyncio.create_task(listener.run()) for listener in listeners]

    stop_event = asyncio.Event()

    def _stop(*_: object) -> None:
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _stop)

    await stop_event.wait()

    for listener in listeners:
        listener.stop()
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    await publisher.stop()
    logger.info("Listener stopped")


if __name__ == "__main__":
    asyncio.run(main())
