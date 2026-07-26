export interface ModelInfo {
  name: string
  size_bytes: number
  modified_at: string
}

export interface DownloadRequest {
  repo_id: string
  filename: string
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch('/api/models')
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`)
  const data = await res.json()
  return data.models
}

export async function downloadModel(
  body: DownloadRequest,
  onLine?: (line: string) => void,
): Promise<void> {
  const res = await fetch('/api/models/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Download failed' }))
    throw new Error(err.detail || 'Download failed')
  }
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n')
    buf = parts.pop() || ''
    for (const part of parts) {
      if (part.startsWith('data: ')) {
        const data = part.slice(6)
        if (data === '[DONE]') return
        onLine?.(data)
      }
    }
  }
}
