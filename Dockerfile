FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ARG LLAMA_PIP_EXTRA_INDEX=""
ARG LLAMA_CMAKE_ARGS=""

RUN if [ -n "$LLAMA_CMAKE_ARGS" ]; then \
        apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/* && \
        CMAKE_ARGS="$LLAMA_CMAKE_ARGS" pip install --no-cache-dir llama-cpp-python; \
    elif [ -n "$LLAMA_PIP_EXTRA_INDEX" ]; then \
        pip install --no-cache-dir llama-cpp-python --extra-index-url "$LLAMA_PIP_EXTRA_INDEX"; \
    else \
        pip install --no-cache-dir llama-cpp-python; \
    fi

COPY app.py services/ ./

EXPOSE 8501

CMD ["streamlit", "run", "app.py", "--server.port", "8501", "--server.address", "0.0.0.0"]
