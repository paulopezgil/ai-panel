# AI Panel

A web UI for downloading and running GGUF large language models locally using llama.cpp.

## Features

- **Download** – Fetch GGUF models from Hugging Face
- **Manage** – Browse downloaded models with sizes and dates
- **Serve** – Start/stop a local OpenAI-compatible API server on any downloaded model
- **Chat** – Query the running model via a simple CLI client (`ask.py`)

## Quick Start

```bash
docker compose up -d
```

Open [http://localhost:8501](http://localhost:8501).

### Configuration

| Variable | Default | Description |
|---|---|---|
| `AI_MODELS_DIR` | `./models` | Directory for downloaded GGUF files |
| `LLAMA_SERVER_PORT` | `8001` | Port for the OpenAI-compatible API |
| `LLAMA_N_CTX` | `2048` | Default context length |
| `LLAMA_N_GPU_LAYERS` | `-1` | GPU layers (CPU: `-1`, all GPU: `999`) |
| `HF_TOKEN` | — | Hugging Face token (for gated models) |
| `HOST_PORT` | `8501` | Host port for the Streamlit UI |

### Without Docker

```bash
pip install -r requirements.txt
streamlit run app.py
```

## Project Structure

```
├── app.py                 # Streamlit frontend
├── ask.py                 # CLI chat client
├── utils/
│   ├── model_manager.py   # Model discovery, download, path resolution
│   └── process_manager.py # llama.cpp server subprocess lifecycle
├── ai_models/             # Downloaded GGUF files (gitignored)
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```
