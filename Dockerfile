FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir uv && \
    uv pip install --system --no-cache -r requirements.txt

ARG LLAMA_PIP_EXTRA_INDEX=""
ARG LLAMA_CMAKE_ARGS=""

RUN if [ -n "$LLAMA_CMAKE_ARGS" ]; then \
        pkgs="build-essential"; \
        if echo "$LLAMA_CMAKE_ARGS" | grep -qi vulkan; then pkgs="$pkgs libvulkan1 mesa-vulkan-drivers"; fi && \
        apt-get update && apt-get install -y --no-install-recommends $pkgs && rm -rf /var/lib/apt/lists/* && \
        CMAKE_ARGS="$LLAMA_CMAKE_ARGS" pip install --no-cache-dir "llama-cpp-python[server]"; \
    elif [ -n "$LLAMA_PIP_EXTRA_INDEX" ]; then \
        if echo "$LLAMA_PIP_EXTRA_INDEX" | grep -qi vulkan; then \
            apt-get update && apt-get install -y --no-install-recommends libvulkan1 mesa-vulkan-drivers && rm -rf /var/lib/apt/lists/*; \
        fi && \
        pip install --no-cache-dir "llama-cpp-python[server]" --extra-index-url "$LLAMA_PIP_EXTRA_INDEX"; \
    else \
        pip install --no-cache-dir "llama-cpp-python[server]"; \
    fi

COPY app.py .
COPY services/ services/

EXPOSE 8501

CMD ["streamlit", "run", "app.py", "--server.port", "8501", "--server.address", "0.0.0.0"]
