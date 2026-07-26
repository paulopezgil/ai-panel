import asyncio
import time

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.services.model_manager import ModelService
from app.services.process_manager import process_manager


router = APIRouter(prefix="/api/server", tags=["server"])
model_service = ModelService()


class StartRequest(BaseModel):
    filename: str
    n_gpu_layers: int = Field(default=-1, ge=-1)
    n_ctx: int = Field(default=2048, ge=128)
    port: int = Field(default=8001, ge=1024, le=65535)


class StopResponse(BaseModel):
    message: str


class StatusResponse(BaseModel):
    running: bool
    active_model: str | None
    pid: int | None
    port: int
    started_at: str | None


@router.post("/start")
async def start_server(body: StartRequest, request: Request):
    model_path = model_service.get_ai_model_path(body.filename)
    if model_path is None:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{body.filename}' not found. Download it first.",
        )

    lines: list[str] = []

    def on_line(line: str) -> None:
        lines.append(line)

    process_manager.start_server(
        model_path=model_path,
        model_name=body.filename,
        n_gpu_layers=body.n_gpu_layers,
        n_ctx=body.n_ctx,
        port=body.port,
        line_callback=on_line,
    )

    async def event_generator():
        last_count = 0
        idle_timeout = 5.0
        last_activity = time.monotonic()
        while True:
            if await request.is_disconnected():
                break
            while last_count < len(lines):
                yield {"data": lines[last_count]}
                last_count += 1
                last_activity = time.monotonic()
            if not process_manager.get_status()["running"]:
                yield {"data": "[DONE]"}
                break
            if time.monotonic() - last_activity > idle_timeout:
                yield {"data": "[DONE]"}
                break
            await asyncio.sleep(0.1)

    return EventSourceResponse(event_generator())


@router.post("/stop")
def stop_server() -> StopResponse:
    status = process_manager.get_status()
    if not status["running"]:
        raise HTTPException(status_code=400, detail="No server is running.")
    process_manager.stop_server()
    return StopResponse(message="Server stopped.")


@router.get("/status")
def server_status() -> StatusResponse:
    return StatusResponse(**process_manager.get_status())
