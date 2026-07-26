import asyncio
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.services.model_manager import ModelService


router = APIRouter(prefix="/api/models", tags=["models"])
service = ModelService()


class DownloadRequest(BaseModel):
    repo_id: str
    filename: str


class ModelInfo(BaseModel):
    name: str
    size_bytes: int
    modified_at: str


class ListResponse(BaseModel):
    models: list[ModelInfo]


@router.post("/download")
async def download_model(body: DownloadRequest, request: Request):
    lines: list[str] = []
    last_pct = -1

    def progress(current: int, total: int) -> None:
        nonlocal last_pct
        pct = int(current / total * 100) if total else 0
        if pct != last_pct:
            last_pct = pct
            lines.append(f"Downloading... {pct}% ({current / 1024 / 1024:.0f} MB / {total / 1024 / 1024:.0f} MB)")

    async def event_generator():
        try:
            lines.append(f"Starting download: {body.repo_id}/{body.filename}")
            path = await asyncio.to_thread(
                service.download_ai_model,
                repo_id=body.repo_id,
                filename=body.filename,
                progress_callback=progress,
            )
            lines.append(f"Model downloaded to {path}")
        except Exception as e:
            lines.append(f"Error: {e}")
        finally:
            for line in lines:
                if await request.is_disconnected():
                    break
                yield {"data": line}
            yield {"data": "[DONE]"}

    return EventSourceResponse(event_generator())


@router.get("")
def list_models() -> ListResponse:
    raw = service.list_models_with_metadata()
    models = [
        ModelInfo(
            name=m["name"],
            size_bytes=m["size_bytes"],
            modified_at=datetime.fromtimestamp(m["modified_at"]).isoformat(),
        )
        for m in raw
    ]
    return ListResponse(models=models)
