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

export async function downloadModel(body: DownloadRequest): Promise<void> {
  const res = await fetch('/api/models/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Download failed')
  }
}
