from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.model_manager import ModelService
from app.services.process_manager import process_manager


router = APIRouter(prefix="/api/server", tags=["server"])
model_service = ModelService()


class StartRequest(BaseModel):
    filename: str
    n_gpu_layers: int = Field(default=-1, ge=-1)
    n_ctx: int = Field(default=2048, ge=128)
    port: int = Field(default=8001, ge=1024, le=65535)


class StartResponse(BaseModel):
    message: str
    url: str


class StopResponse(BaseModel):
    message: str


class StatusResponse(BaseModel):
    running: bool
    active_model: str | None
    pid: int | None
    port: int
    started_at: str | None


@router.post("/start")
def start_server(body: StartRequest) -> StartResponse:
    model_path = model_service.get_ai_model_path(body.filename)
    if model_path is None:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{body.filename}' not found. Download it first.",
        )

    process_manager.start_server(
        model_path=model_path,
        model_name=body.filename,
        n_gpu_layers=body.n_gpu_layers,
        n_ctx=body.n_ctx,
        port=body.port,
    )
    return StartResponse(
        message=f"Server started for model '{body.filename}'",
        url=f"http://localhost:{body.port}/v1",
    )


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
