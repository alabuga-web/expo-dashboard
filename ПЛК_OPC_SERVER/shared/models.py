"""Pydantic-модели событий Kafka / WebSocket."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TagValue(BaseModel):
    name: str
    node_id: str
    value: Any
    value_type: str = ""
    group: str = ""


class TagBatchEvent(BaseModel):
    type: Literal["tag_batch"] = "tag_batch"
    server_id: str
    endpoint: str
    ts: datetime = Field(default_factory=utc_now)
    tags: list[TagValue]


class ServerStatusEvent(BaseModel):
    type: Literal["server_status"] = "server_status"
    server_id: str
    endpoint: str
    status: Literal["online", "offline"]
    last_error: str | None = None
    ts: datetime = Field(default_factory=utc_now)


KafkaEvent = TagBatchEvent | ServerStatusEvent
