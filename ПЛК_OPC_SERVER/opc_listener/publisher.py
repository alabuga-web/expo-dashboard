"""Kafka producer для OPC-событий."""

from __future__ import annotations

import json
import logging
from typing import Any

from aiokafka import AIOKafkaProducer

from shared.models import KafkaEvent

logger = logging.getLogger(__name__)


class KafkaPublisher:
    def __init__(self, bootstrap_servers: str, topic: str) -> None:
        self._bootstrap_servers = bootstrap_servers
        self._topic = topic
        self._producer: AIOKafkaProducer | None = None

    async def start(self) -> None:
        self._producer = AIOKafkaProducer(
            bootstrap_servers=self._bootstrap_servers,
            value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
        )
        await self._producer.start()
        logger.info("Kafka producer connected to %s", self._bootstrap_servers)

    async def stop(self) -> None:
        if self._producer:
            await self._producer.stop()
            self._producer = None

    async def publish(self, event: KafkaEvent) -> None:
        if not self._producer:
            raise RuntimeError("Kafka producer not started")

        payload = event.model_dump(mode="json")
        key = event.server_id
        await self._producer.send_and_wait(self._topic, payload, key=key)
