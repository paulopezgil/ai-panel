# Download Progress Bar — Implementation Plan

## Problem
`POST /api/models/download` is synchronous — the frontend button shows "Downloading…" with no progress indication. `hf_hub_download` supports a `callback(current, total)` parameter, but it only writes to backend stderr.

## Solution
Stream download progress from backend to frontend via Server-Sent Events (SSE).

---

### 1. `backend/app/services/model_manager.py`

**Change:** Add optional `progress_callback` parameter to `download_ai_model()` and forward it to `hf_hub_download(..., callback=progress_callback)`.

- Signature: `download_ai_model(self, repo_id, filename, progress_callback=None)`
- Only change: add `callback=progress_callback` to the `hf_hub_download` call.

### 2. `backend/app/routers/models.py`

**Change:** Convert `POST /api/models/download` from sync → async SSE streaming endpoint.

```python
@router.post("/download")
async def download_model(body: DownloadRequest) -> StreamingResponse:
```

- Returns `StreamingResponse(event_generator(), media_type="text/event-stream")`
- `event_generator()` is an async generator:
  - Creates an `asyncio.Queue` for progress messages
  - Captures the event loop reference
  - Defines a `progress_callback(current, total)` that calls `loop.call_soon_threadsafe(queue.put_nowait, ...)`
  - Launches `hf_hub_download` in `loop.run_in_executor` to avoid blocking the event loop
  - Loops reading from the queue, yielding SSE-formatted lines: `data: {"current": N, "total": M}\n\n`
  - On completion yields `data: {"done": true, "path": "..."}\n\n`
  - On error yields `data: {"error": "..."}\n\n`

### 3. `frontend/src/api/models.ts`

**Change:** `downloadModel()` accepts `onProgress?: (current: number, total: number) => void`.

- Uses `fetch` with `response.body?.getReader()` to read the SSE stream chunk by chunk
- Decodes text, splits on `\n`, parses `data: {...}` JSON lines
- Calls `onProgress(current, total)` on progress events
- Resolves on `done`, rejects on `error`

### 4. `frontend/src/components/DownloadForm.tsx`

**Change:** Add progress bar visible during download.

- New state: `progress` (`{ current: number, total: number } | null`)
- Pass `onProgress` to `downloadModel()` that sets `progress`
- After `downloadModel()` resolves, clear progress and call `onSuccess`
- UI:
  - Below the inputs, a progress bar: outer `<div>` with `bg-zinc-700`, inner `<div>` with `bg-emerald-500` and `style={{ width: (current/total*100) + '%' }}`
  - Percentage text: `"45 %"` or `"1.2 GB / 2.5 GB"`
  - Inputs disabled while downloading (already done via `loading` state)
  - Button text: `"Downloading… 45%"` instead of just `"Downloading…"`
