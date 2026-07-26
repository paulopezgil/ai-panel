import json
import logging
import os
from pathlib import Path
from typing import Any

import requests
from huggingface_hub import hf_hub_url


logger = logging.getLogger(__name__)


class ModelService:
    def __init__(self) -> None:
        self._ai_models_dir = os.getenv("AI_MODELS_DIR", "ai_models")

    @staticmethod
    def _ensure_gguf_extension(ai_model_name: str) -> str:
        if not ai_model_name.endswith(".gguf"):
            return f"{ai_model_name}.gguf"
        return ai_model_name

    def download_ai_model(
        self,
        repo_id: str,
        filename: str,
        progress_callback: Any = None,
    ) -> str:

        def _get_hf_token() -> str:
            token = os.getenv("HF_TOKEN", "")
            if not token:
                logger.warning("HF_TOKEN is not set, download speed may be slow and you may hit rate limits.")
            return token

        token = _get_hf_token()
        url = hf_hub_url(repo_id=repo_id, filename=filename)
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        logger.info(f"Downloading '{filename}' from '{repo_id}'...")
        response = requests.get(url, stream=True, headers=headers, timeout=30)
        response.raise_for_status()

        total = int(response.headers.get("content-length", 0))
        destination = self._get_ai_models_dir_path() / filename
        temp_path = destination.with_suffix(".part")

        current = 0
        CHUNK_SIZE = 1024 * 1024
        with open(temp_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                f.write(chunk)
                current += len(chunk)
                if progress_callback:
                    progress_callback(current, total)

        temp_path.rename(destination)
        local_path = str(destination)
        logger.info(f"AI model downloaded to '{local_path}'")
        return local_path

    def list_ai_models(self) -> list[str]:
        ai_models_path = self._get_ai_models_dir_path()
        return sorted(f.stem for f in ai_models_path.glob("*.gguf"))

    def list_models_with_metadata(self) -> list[dict[str, Any]]:
        ai_models_path = self._get_ai_models_dir_path()
        models = []
        for f in sorted(ai_models_path.glob("*.gguf")):
            stat = f.stat()
            models.append({
                "name": f.stem,
                "size_bytes": stat.st_size,
                "modified_at": stat.st_mtime,
            })
        return models

    def get_ai_model_path(self, ai_model_name: str) -> str | None:
        full_ai_model_name = self._ensure_gguf_extension(ai_model_name)
        ai_model_path = self._get_ai_models_dir_path() / full_ai_model_name
        if ai_model_path.is_file():
            return str(ai_model_path)
        return None

    def ai_model_exists(self, ai_model_name: str) -> bool:
        return self.get_ai_model_path(ai_model_name) is not None

    def get_loader_kwargs(self, ai_model_name: str) -> dict[str, Any]:
        config_path = os.getenv("MODEL_CONFIG_PATH")
        if config_path:
            try:
                with open(config_path) as f:
                    configs = json.load(f)
                config = configs.get(ai_model_name) or configs.get(f"{ai_model_name}.gguf")
                if config:
                    return {
                        "n_ctx": config.get("n_ctx", 2048),
                        "n_gpu_layers": config.get("n_gpu_layers", 0),
                        "n_threads": config.get("n_threads", 4),
                        "seed": config.get("seed", -1),
                    }
            except (FileNotFoundError, json.JSONDecodeError):
                logger.warning(f"Failed to load model config from {config_path}")
        return {}

    def _get_ai_models_dir_path(self) -> Path:
        ai_models_path = Path(self._ai_models_dir)
        ai_models_path.mkdir(parents=True, exist_ok=True)
        return ai_models_path