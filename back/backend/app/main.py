"""FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.api import router as api_router
from backend.app.kafka_consumer import KafkaEventConsumer
from backend.app.ws_manager import WebSocketManager
from shared.db import PlcDatabase
from shared.settings import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    db = PlcDatabase(Path(settings.database_path))
    ws_manager = WebSocketManager()
    consumer = KafkaEventConsumer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        topic=settings.kafka_topic,
        db=db,
        ws=ws_manager,
    )

    app.state.db = db
    app.state.ws_manager = ws_manager
    app.state.consumer = consumer
    app.state.settings = settings

    await consumer.start()
    logger.info(
        "Backend started (mode=%s, db=%s, ui=%s)",
        settings.plc_mode,
        settings.database_path,
        settings.ui_url,
    )

    yield

    await consumer.stop()
    db.close()
    logger.info("Backend stopped")


app = FastAPI(title="PLC OPC Dashboard", lifespan=lifespan)
app.include_router(api_router)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
async def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "mode": settings.plc_mode,
        "ui_url": settings.ui_url,
    }


@app.websocket("/ws/state")
async def websocket_state(websocket: WebSocket) -> None:
    ws_manager: WebSocketManager = app.state.ws_manager
    db: PlcDatabase = app.state.db

    await ws_manager.connect(websocket)
    try:
        await websocket.send_json(
            {
                "type": "snapshot",
                "servers": db.get_servers(),
                "tags": db.get_latest_tags(),
            }
        )

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(websocket)
