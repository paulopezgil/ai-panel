export interface ServerStatus {
  running: boolean
  active_model: string | null
  pid: number | null
  port: number
  started_at: string | null
}

export interface StartParams {
  filename: string
  n_gpu_layers: number
  n_ctx: number
}

export async function getServerStatus(): Promise<ServerStatus> {
  const res = await fetch('/api/server/status')
  if (!res.ok) throw new Error(`Failed to get status: ${res.statusText}`)
  return res.json()
}

export async function startServer(params: StartParams): Promise<{ message: string; url: string }> {
  const res = await fetch('/api/server/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Failed to start server')
  }
  return res.json()
}

export async function stopServer(): Promise<{ message: string }> {
  const res = await fetch('/api/server/stop', {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Failed to stop server')
  }
  return res.json()
}
