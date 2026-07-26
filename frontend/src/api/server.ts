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

export async function startServer(
  params: StartParams,
  onLine?: (line: string) => void,
): Promise<void> {
  const res = await fetch('/api/server/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to start server' }))
    throw new Error(err.detail || 'Failed to start server')
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
