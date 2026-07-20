"""REST API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, Request

router = APIRouter(prefix="/api")


@router.get("/servers")
def get_servers(request: Request) -> list[dict[str, Any]]:
    return request.app.state.db.get_servers()


@router.get("/tags/latest")
def get_latest_tags(
    request: Request,
    server_id: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    return request.app.state.db.get_latest_tags(server_id)


@router.get("/history")
def get_history(
    request: Request,
    server_id: str = Query(...),
    tag: str = Query(...),
    limit: int = Query(default=100, ge=1, le=1000),
) -> list[dict[str, Any]]:
    return request.app.state.db.get_history(server_id, tag, limit)
