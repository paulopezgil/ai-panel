# AI Panel – Agent Guide

## Commands

```bash
# Run the web UI
streamlit run app.py

# Chat with the running model
python ask.py "your prompt"

# Rebuild and restart Docker
docker compose build app && docker compose up -d
```

## Architecture

- `app.py` – Streamlit entry point. Three tabs: Download, Models, Server.
- `utils/model_manager.py` – `ModelService` class: lists `.gguf` files, downloads from Hugging Face, resolves model paths.
- `utils/process_manager.py` – `ProcessManager` singleton: starts/stops `llama_cpp.server` as a subprocess, captures stdout for the terminal view.
- `ask.py` – Standalone CLI that hits `localhost:8001/v1` (the OpenAI-compatible endpoint).

## Key Conventions

- GGUF models are stored in `AI_MODELS_DIR` (default `ai_models/`), mapped as a Docker volume.
- The server subprocess is managed via `ProcessManager` (one instance at a time).
- Server output is streamed through a `queue.Queue` into Streamlit session state for the terminal widget.
- Model downloads use `huggingface_hub` with stderr captured into a second queue.

## Patterns

- Never access `process_manager` directly from UI code – use `start_server_subprocess()` in `app.py`.
- Add new env vars to `docker-compose.yml` and `README.md` configuration table.
- When adding a new tab, update the `st.tabs(...)` call and add a `with tab_xxx:` block.
