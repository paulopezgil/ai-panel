from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.model_manager import ModelService


router = APIRouter(prefix="/api/models", tags=["models"])
service = ModelService()


class DownloadRequest(BaseModel):
    repo_id: str
    filename: str


class DownloadResponse(BaseModel):
    message: str
    path: str


class ModelInfo(BaseModel):
    name: str
    size_bytes: int
    modified_at: str


class ListResponse(BaseModel):
    models: list[ModelInfo]


@router.post("/download")
def download_model(body: DownloadRequest) -> DownloadResponse:
    try:
        path = service.download_ai_model(repo_id=body.repo_id, filename=body.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return DownloadResponse(message="Model downloaded successfully", path=path)


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
