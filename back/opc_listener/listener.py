"""OPC UA listener для одного сервера."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from asyncua import Client, ua

from opc_listener.publisher import KafkaPublisher
from shared.models import ServerStatusEvent, TagBatchEvent, TagValue, utc_now
from shared.opc_xml import OpcNode, parse_opcua_xml

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ServerConfig:
    id: str
    endpoint: str
    nodeset: Path
    groups: set[str]
    timeout_sec: float = 5.0
    user: str = ""
    password: str = ""


class OpcServerListener:
    def __init__(
        self,
        config: ServerConfig,
        publisher: KafkaPublisher,
        poll_interval: float = 1.0,
        reconnect_delay: float = 5.0,
    ) -> None:
        self._config = config
        self._publisher = publisher
        self._poll_interval = poll_interval
        self._reconnect_delay = reconnect_delay
        self._nodes: list[OpcNode] = []
        self._running = False

    def _load_nodes(self) -> list[OpcNode]:
        if not self._config.nodeset.exists():
            raise FileNotFoundError(f"NodeSet not found: {self._config.nodeset}")
        return parse_opcua_xml(self._config.nodeset, self._config.groups)

    def _make_client(self) -> Client:
        client = Client(url=self._config.endpoint, timeout=self._config.timeout_sec)
        if self._config.user:
            client.set_user(self._config.user)
            client.set_password(self._config.password)
        return client

    @staticmethod
    def _normalize_value(value: Any, data_type: str) -> Any:
        if data_type == "i=1" and isinstance(value, int) and value in (0, 1):
            return bool(value)
        return value

    @staticmethod
    def _value_type(value: Any, data_type: str = "") -> str:
        if data_type == "i=1" or isinstance(value, bool):
            return "bool"
        if isinstance(value, int) and not isinstance(value, bool):
            return "int"
        if isinstance(value, float):
            return "float"
        if value is None:
            return "null"
        return type(value).__name__

    async def _publish_status(self, status: str, last_error: str | None = None) -> None:
        await self._publisher.publish(
            ServerStatusEvent(
                server_id=self._config.id,
                endpoint=self._config.endpoint,
                status=status,  # type: ignore[arg-type]
                last_error=last_error,
            )
        )

    async def _read_cycle(self, client: Client) -> list[TagValue]:
        tags: list[TagValue] = []
        for node in self._nodes:
            try:
                opc_node = client.get_node(node.node_id)
                value = await opc_node.read_value()
                value = self._normalize_value(value, node.data_type)
                tags.append(
                    TagValue(
                        name=node.name,
                        node_id=node.node_id,
                        value=value,
                        value_type=self._value_type(value, node.data_type),
                        group=node.group,
                    )
                )
            except ua.UaError as error:
                logger.debug("[%s] read %s: %s", self._config.id, node.name, error)
        return tags

    async def run(self) -> None:
        self._running = True
        self._nodes = self._load_nodes()
        logger.info(
            "[%s] Listening %s (%d tags)",
            self._config.id,
            self._config.endpoint,
            len(self._nodes),
        )

        while self._running:
            try:
                async with self._make_client() as client:
                    await self._publish_status("online")
                    logger.info("[%s] Connected", self._config.id)

                    while self._running:
                        tags = await self._read_cycle(client)
                        if tags:
                            await self._publisher.publish(
                                TagBatchEvent(
                                    server_id=self._config.id,
                                    endpoint=self._config.endpoint,
                                    ts=utc_now(),
                                    tags=tags,
                                )
                            )
                        await asyncio.sleep(self._poll_interval)

            except asyncio.CancelledError:
                break
            except Exception as error:
                logger.warning("[%s] Connection error: %s", self._config.id, error)
                await self._publish_status("offline", str(error))
                await asyncio.sleep(self._reconnect_delay)

    def stop(self) -> None:
        self._running = False
