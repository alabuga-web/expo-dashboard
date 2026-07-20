"""Запись показаний ПЛК в SQLite."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class DbConfig:
    enabled: bool
    path: Path


def load_db_config(raw: dict[str, Any] | None, config_dir: Path) -> DbConfig:
    db = raw or {}
    return DbConfig(
        enabled=bool(db.get("enabled", True)),
        path=(config_dir / db.get("path", "plc_data.db")).resolve(),
    )


class PlcDatabase:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._init_schema()

    def _init_schema(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                source TEXT NOT NULL,
                tag_name TEXT NOT NULL,
                tag_address TEXT,
                value_text TEXT NOT NULL,
                value_type TEXT
            )
            """
        )
        self._conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_readings_ts
            ON readings (ts)
            """
        )
        self._conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_readings_tag
            ON readings (tag_name, ts)
            """
        )
        self._conn.commit()

    @staticmethod
    def _serialize(value: Any) -> tuple[str, str]:
        if isinstance(value, bool):
            return ("ON" if value else "OFF", "bool")
        if isinstance(value, int) and not isinstance(value, bool):
            return (str(value), "int")
        if isinstance(value, float):
            return (repr(value), "float")
        if value is None:
            return ("null", "null")
        if isinstance(value, (list, dict)):
            return (json.dumps(value, ensure_ascii=False), type(value).__name__)
        return (str(value), type(value).__name__)

    def save_readings(
        self,
        source: str,
        readings: dict[str, Any],
        addresses: dict[str, str] | None = None,
    ) -> int:
        if not readings:
            return 0

        ts = datetime.now(timezone.utc).isoformat()
        rows = []
        for tag_name, value in readings.items():
            value_text, value_type = self._serialize(value)
            rows.append(
                (
                    ts,
                    source,
                    tag_name,
                    (addresses or {}).get(tag_name),
                    value_text,
                    value_type,
                )
            )

        self._conn.executemany(
            """
            INSERT INTO readings (ts, source, tag_name, tag_address, value_text, value_type)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        self._conn.commit()
        return len(rows)

    def close(self) -> None:
        self._conn.close()
