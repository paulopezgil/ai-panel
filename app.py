import os
import queue
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import streamlit as st
from streamlit_autorefresh import st_autorefresh

from services.model_manager import ModelService
from services.process_manager import process_manager


AI_MODELS_DIR = os.getenv("AI_MODELS_DIR", "ai_models")
LLAMA_SERVER_PORT = int(os.getenv("LLAMA_SERVER_PORT", "8001"))
LLAMA_N_CTX = int(os.getenv("LLAMA_N_CTX", "2048"))
LLAMA_N_GPU_LAYERS = int(os.getenv("LLAMA_N_GPU_LAYERS", "-1"))

st.set_page_config(page_title="AI Panel", layout="wide")


def init_session():
    if "model_service" not in st.session_state:
        st.session_state.model_service = ModelService()
    if "server_output_queue" not in st.session_state:
        st.session_state.server_output_queue = queue.Queue()
    if "server_output_lines" not in st.session_state:
        st.session_state.server_output_lines = []
    if "download_queue" not in st.session_state:
        st.session_state.download_queue = None
    if "downloading" not in st.session_state:
        st.session_state.downloading = False
    if "confirm_stop" not in st.session_state:
        st.session_state.confirm_stop = False


def format_bytes(b: int) -> str:
    if b == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    val = float(b)
    while val >= 1024 and i < len(units) - 1:
        val /= 1024
        i += 1
    return f"{val:.1f} {units[i]}"


def _download_worker(repo_id: str, filename: str, q: queue.Queue) -> None:
    last_pct = [-1]
    model_service = ModelService()

    def progress_callback(current: int, total: int) -> None:
        pct = int(current / total * 100) if total else 0
        if pct != last_pct[0]:
            last_pct[0] = pct
            q.put(("progress", current, total))

    try:
        path = model_service.download_ai_model(
            repo_id=repo_id,
            filename=filename,
            progress_callback=progress_callback,
        )
        q.put(("done", path, 0))
    except Exception as e:
        q.put(("error", str(e), 0))


def start_server_subprocess(model_name: str, n_gpu_layers: int, n_ctx: int, port: int) -> None:
    model_service = st.session_state.model_service
    model_path = model_service.get_ai_model_path(model_name)
    if model_path is None:
        st.error(f"Model '{model_name}' not found")
        return

    q = st.session_state.server_output_queue
    st.session_state.server_output_lines = []

    def line_callback(line: str) -> None:
        q.put(line)

    process_manager.start_server(
        model_path=model_path,
        model_name=model_name,
        n_gpu_layers=n_gpu_layers,
        n_ctx=n_ctx,
        port=port,
        line_callback=line_callback,
    )


init_session()

st.title("AI Panel")

status = process_manager.get_status()
server_running = status["running"]
active_model = status.get("active_model")
server_port = status.get("port")
server_pid = status.get("pid")
started_at = status.get("started_at")

if server_running:
    st_autorefresh(interval=3000, key="server_status_refresh")

downloading = st.session_state.downloading
if downloading:
    st_autorefresh(interval=500, key="download_refresh")

# -------- SIDEBAR: Server Status --------
with st.sidebar:
    st.subheader("Server")

    if server_running:
        st.markdown(f"**Model:** {active_model}")
        st.markdown(f"**Port:** {server_port}")
        st.markdown(f"**PID:** {server_pid}")
        if started_at:
            st.markdown(f"**Started:** {started_at[:19].replace('T', ' ')}")
    else:
        st.markdown("*No model loaded*")

# -------- TAB: Download --------
tab_download, tab_models, tab_server = st.tabs(["Download", "Models", "Server"])

with tab_download:
    st.subheader("Download Model")

    repo_id = st.text_input(
        "Repository ID",
        placeholder="e.g. TheBloke/Llama-2-7B-GGUF",
        key="download_repo",
        disabled=downloading,
    )
    filename = st.text_input(
        "Filename",
        placeholder="e.g. llama-2-7b.Q4_K_M.gguf",
        key="download_filename",
        disabled=downloading,
    )

    start_disabled = downloading or not repo_id or not filename
    if st.button("Download", disabled=start_disabled, type="primary"):
        q = queue.Queue()
        t = threading.Thread(
            target=_download_worker,
            args=(repo_id, filename, q),
            daemon=True,
        )
        t.start()
        st.session_state.download_queue = q
        st.session_state.downloading = True
        st.rerun()

    if downloading:
        q = st.session_state.download_queue
        if q is not None:
            try:
                while True:
                    msg = q.get_nowait()
                    if msg[0] == "progress":
                        current, total = msg[1], msg[2]
                        st.session_state.dl_current = current
                        st.session_state.dl_total = total
                    elif msg[0] == "done":
                        st.session_state.downloading = False
                        st.session_state.dl_path = msg[1]
                        st.session_state.dl_done = True
                    elif msg[0] == "error":
                        st.session_state.downloading = False
                        st.session_state.dl_error = msg[1]
            except queue.Empty:
                pass

        current = st.session_state.get("dl_current", 0)
        total = st.session_state.get("dl_total", 0)
        if total > 0:
            st.progress(min(current / total, 1.0))
            st.caption(
                f"{current / 1024 / 1024:.0f} MB / {total / 1024 / 1024:.0f} MB"
            )
        else:
            st.progress(0)
            st.caption("Downloading… (size unknown)")

        if st.session_state.get("dl_done"):
            st.success("Download complete!")
            for k in ["dl_current", "dl_total", "dl_done", "dl_error", "dl_path"]:
                st.session_state.pop(k, None)
        elif st.session_state.get("dl_error"):
            st.error(st.session_state.dl_error)
            st.session_state.pop("dl_error", None)

    elif st.session_state.get("dl_done") is None and st.session_state.get("dl_error") is None:
        pass

# -------- TAB: Models --------
with tab_models:
    st.subheader("Downloaded Models")

    model_service = st.session_state.model_service
    models = model_service.list_models_with_metadata()

    if not models:
        st.caption("No models downloaded yet.")
    else:
        rows = [
            {
                "Name": m["name"],
                "Size": format_bytes(m["size_bytes"]),
                "Modified": datetime.fromtimestamp(m["modified_at"]).strftime(
                    "%Y-%m-%d %H:%M"
                ),
            }
            for m in models
        ]
        st.dataframe(rows, use_container_width=True, hide_index=True)

        st.divider()
        st.subheader("Start Model Server")

        model_names = [m["name"] for m in models]
        selected = st.selectbox("Select model", model_names, key="run_model_select")

        col1, col2 = st.columns(2)
        with col1:
            ngl = st.number_input(
                "n_gpu_layers",
                value=LLAMA_N_GPU_LAYERS,
                min_value=-1,
                key="ngl_input",
            )
        with col2:
            nctx = st.selectbox(
                "n_ctx (context length)",
                options=[2048, 4096, 8192],
                index=0 if LLAMA_N_CTX == 2048 else (
                    1 if LLAMA_N_CTX == 4096 else 2
                ),
                key="nctx_input",
            )

        run_disabled = server_running
        if st.button("Start Server", disabled=run_disabled, type="primary"):
            start_server_subprocess(selected, ngl, nctx, LLAMA_SERVER_PORT)
            st.rerun()

# -------- TAB: Server --------
with tab_server:
    st.subheader("Server Control")

    col1, col2, col3 = st.columns(3)
    with col1:
        if server_running:
            st.markdown("Status: **Running**")
        else:
            st.markdown("Status: **Stopped**")

    if server_running:
        with col2:
            st.markdown(f"Model: **{active_model}**")
        with col3:
            if st.session_state.confirm_stop:
                c1, c2 = st.columns(2)
                with c1:
                    if st.button("Yes, stop"):
                        process_manager.stop_server()
                        st.session_state.confirm_stop = False
                        st.session_state.server_output_lines = []
                        st.rerun()
                with c2:
                    if st.button("Cancel"):
                        st.session_state.confirm_stop = False
                        st.rerun()
            else:
                if st.button("Stop Server"):
                    st.session_state.confirm_stop = True
                    st.rerun()

    if server_running or st.session_state.get("server_was_running"):
        st.divider()
        st.subheader("Terminal Output")

        q = st.session_state.server_output_queue
        lines = st.session_state.server_output_lines
        try:
            while True:
                line = q.get_nowait()
                lines.append(line)
        except queue.Empty:
            pass

        if len(lines) > 1000:
            st.session_state.server_output_lines = lines[-1000:]

        output = "\n".join(lines[-200:])
        with st.container(height=300):
            st.code(output, language="bash")

        if not server_running and lines:
            st.caption("Server stopped. Terminal output preserved.")

    st.session_state.server_was_running = server_running
