"""Kafka consumer → SQLite + WebSocket."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from aiokafka import AIOKafkaConsumer

from backend.app.ws_manager import WebSocketManager
from shared.db import PlcDatabase
from shared.models import ServerStatusEvent, TagBatchEvent, TagValue

logger = logging.getLogger(__name__)


class KafkaEventConsumer:
    def __init__(
        self,
        bootstrap_servers: str,
        topic: str,
        db: PlcDatabase,
        ws: WebSocketManager,
        group_id: str = "plc-backend",
    ) -> None:
        self._bootstrap_servers = bootstrap_servers
        self._topic = topic
        self._db = db
        self._ws = ws
        self._group_id = group_id
        self._consumer: AIOKafkaConsumer | None = None
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        self._consumer = AIOKafkaConsumer(
            self._topic,
            bootstrap_servers=self._bootstrap_servers,
            group_id=self._group_id,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            auto_offset_reset="latest",
        )
        await self._consumer.start()
        self._task = asyncio.create_task(self._run())
        logger.info("Kafka consumer started on %s", self._topic)

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._consumer:
            await self._consumer.stop()

    async def _handle_message(self, payload: dict[str, Any]) -> None:
        event_type = payload.get("type")

        if event_type == "tag_batch":
            event = TagBatchEvent.model_validate(payload)
            self._db.save_batch(event.server_id, event.tags, event.ts)
            self._db.upsert_server_status(event.server_id, event.endpoint, "online")
            await self._ws.broadcast(
                {
                    "type": "update",
                    "server_id": event.server_id,
                    "ts": event.ts.isoformat(),
                    "tags": [t.model_dump() for t in event.tags],
                }
            )

        elif event_type == "server_status":
            event = ServerStatusEvent.model_validate(payload)
            self._db.upsert_server_status(
                event.server_id,
                event.endpoint,
                event.status,
                event.last_error,
            )
            await self._ws.broadcast(
                {
                    "type": "server_status",
                    "server_id": event.server_id,
                    "endpoint": event.endpoint,
                    "status": event.status,
                    "last_error": event.last_error,
                    "ts": event.ts.isoformat(),
                }
            )

    async def _run(self) -> None:
        assert self._consumer is not None
        try:
            async for message in self._consumer:
                try:
                    await self._handle_message(message.value)
                except Exception as error:
                    logger.exception("Failed to process message: %s", error)
        except asyncio.CancelledError:
            pass
