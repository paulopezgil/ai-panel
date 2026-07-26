import logging
import os
import signal
import subprocess
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable


logger = logging.getLogger(__name__)


@dataclass
class ServerInstance:
    process: subprocess.Popen[bytes]
    model_name: str
    port: int
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def pid(self) -> int:
        return self.process.pid

    @property
    def is_running(self) -> bool:
        return self.process.poll() is None


class ProcessManager:
    def __init__(self) -> None:
        self._instance: ServerInstance | None = None

    def start_server(
        self,
        model_path: str,
        model_name: str,
        n_gpu_layers: int = -1,
        n_ctx: int = 2048,
        port: int = 8001,
        line_callback: Callable[[str], None] | None = None,
    ) -> ServerInstance:
        if self._instance is not None and self._instance.is_running:
            logger.info("Server already running, stopping it first.")
            self.stop_server()

        cmd = [
            "python3",
            "-m", "llama_cpp.server",
            "--model", model_path,
            "--host", "0.0.0.0",
            "--port", str(port),
            "--n_gpu_layers", str(n_gpu_layers),
            "--n_ctx", str(n_ctx),
        ]

        logger.info(f"Starting server: {' '.join(cmd)}")
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            start_new_session=True,
        )

        self._instance = ServerInstance(
            process=proc,
            model_name=model_name,
            port=port,
        )

        if line_callback:
            def _reader() -> None:
                assert proc.stdout is not None
                for raw in iter(proc.stdout.readline, b""):
                    line = raw.decode("utf-8", errors="replace").rstrip()
                    if line:
                        line_callback(line)
                proc.stdout.close()

            threading.Thread(target=_reader, daemon=True).start()

        logger.info(f"Server started (PID={proc.pid}, port={port})")
        return self._instance

    def stop_server(self, timeout: float = 10.0) -> None:
        if self._instance is None:
            logger.info("No server is running.")
            return

        proc = self._instance.process
        logger.info(f"Stopping server (PID={proc.pid})...")

        try:
            os.kill(proc.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass

        try:
            proc.wait(timeout=timeout)
            logger.info("Server terminated gracefully.")
        except subprocess.TimeoutExpired:
            logger.warning(f"Server did not stop within {timeout}s, sending SIGKILL.")
            try:
                os.kill(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            proc.wait()
            logger.info("Server killed.")

        self._instance = None

    def get_status(self) -> dict:
        if self._instance is None:
            return {
                "running": False,
                "active_model": None,
                "pid": None,
                "port": 8001,
                "started_at": None,
            }

        running = self._instance.is_running
        if not running:
            self._instance = None
            return {
                "running": False,
                "active_model": None,
                "pid": None,
                "port": 8001,
                "started_at": None,
            }

        return {
            "running": True,
            "active_model": self._instance.model_name,
            "pid": self._instance.pid,
            "port": self._instance.port,
            "started_at": self._instance.started_at.isoformat(),
        }

    def cleanup(self) -> None:
        if self._instance is not None:
            logger.info("Cleaning up server subprocess on shutdown.")
            self.stop_server()


process_manager = ProcessManager()
