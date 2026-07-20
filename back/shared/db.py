"""SQLite хранилище показаний ПЛК."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from shared.models import TagValue


@dataclass(frozen=True)
class DbConfig:
    path: Path


class PlcDatabase:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._init_schema()

    def _init_schema(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                server_id TEXT NOT NULL,
                tag_name TEXT NOT NULL,
                tag_address TEXT,
                value_text TEXT NOT NULL,
                value_type TEXT
            )
            """
        )
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tag_latest (
                server_id TEXT NOT NULL,
                tag_name TEXT NOT NULL,
                tag_address TEXT,
                value_text TEXT NOT NULL,
                value_type TEXT,
                tag_group TEXT,
                ts TEXT NOT NULL,
                PRIMARY KEY (server_id, tag_name)
            )
            """
        )
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS server_status (
                server_id TEXT PRIMARY KEY,
                endpoint TEXT NOT NULL,
                status TEXT NOT NULL,
                last_error TEXT,
                updated_at TEXT NOT NULL
            )
            """
        )
        self._conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_readings_ts ON readings (ts)"
        )
        self._conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_readings_server_tag ON readings (server_id, tag_name, ts)"
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

    def save_batch(
        self,
        server_id: str,
        tags: list[TagValue],
        ts: datetime | None = None,
    ) -> int:
        if not tags:
            return 0

        ts_text = (ts or datetime.now(timezone.utc)).isoformat()
        history_rows = []
        latest_rows = []

        for tag in tags:
            value_text, value_type = self._serialize(tag.value)
            if tag.value_type:
                value_type = tag.value_type
            history_rows.append(
                (ts_text, server_id, tag.name, tag.node_id, value_text, value_type)
            )
            latest_rows.append(
                (
                    server_id,
                    tag.name,
                    tag.node_id,
                    value_text,
                    value_type,
                    tag.group,
                    ts_text,
                )
            )

        self._conn.executemany(
            """
            INSERT INTO readings (ts, server_id, tag_name, tag_address, value_text, value_type)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            history_rows,
        )
        self._conn.executemany(
            """
            INSERT INTO tag_latest (
                server_id, tag_name, tag_address, value_text, value_type, tag_group, ts
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(server_id, tag_name) DO UPDATE SET
                tag_address=excluded.tag_address,
                value_text=excluded.value_text,
                value_type=excluded.value_type,
                tag_group=excluded.tag_group,
                ts=excluded.ts
            """,
            latest_rows,
        )
        self._conn.commit()
        return len(tags)

    def upsert_server_status(
        self,
        server_id: str,
        endpoint: str,
        status: str,
        last_error: str | None = None,
    ) -> None:
        self._conn.execute(
            """
            INSERT INTO server_status (server_id, endpoint, status, last_error, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(server_id) DO UPDATE SET
                endpoint=excluded.endpoint,
                status=excluded.status,
                last_error=excluded.last_error,
                updated_at=excluded.updated_at
            """,
            (
                server_id,
                endpoint,
                status,
                last_error,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        self._conn.commit()

    def get_servers(self) -> list[dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT server_id, endpoint, status, last_error, updated_at FROM server_status ORDER BY server_id"
        ).fetchall()
        return [dict(row) for row in rows]

    def get_latest_tags(self, server_id: str | None = None) -> list[dict[str, Any]]:
        if server_id:
            rows = self._conn.execute(
                """
                SELECT server_id, tag_name, tag_address, value_text, value_type, tag_group, ts
                FROM tag_latest WHERE server_id = ? ORDER BY tag_name
                """,
                (server_id,),
            ).fetchall()
        else:
            rows = self._conn.execute(
                """
                SELECT server_id, tag_name, tag_address, value_text, value_type, tag_group, ts
                FROM tag_latest ORDER BY server_id, tag_name
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def get_history(
        self,
        server_id: str,
        tag_name: str,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        rows = self._conn.execute(
            """
            SELECT ts, server_id, tag_name, tag_address, value_text, value_type
            FROM readings
            WHERE server_id = ? AND tag_name = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (server_id, tag_name, limit),
        ).fetchall()
        return [dict(row) for row in rows]

    def close(self) -> None:
        self._conn.close()
