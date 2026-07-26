import { useCallback, useEffect, useRef, useState } from 'react'
import { Power, PowerOff, RefreshCw, Server } from 'lucide-react'
import { type ServerStatus, getServerStatus, stopServer } from '../api/server'

export default function ServerStatusBanner({
  onChange,
  onStatusUpdate,
}: {
  onChange?: () => void
  onStatusUpdate?: (status: ServerStatus) => void
}) {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [stopping, setStopping] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const s = await getServerStatus()
      setStatus(s)
      onStatusUpdate?.(s)
    } catch {
      // server unreachable — keep last known state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    pollRef.current = setInterval(fetchStatus, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchStatus])

  async function handleStop() {
    setStopping(true)
    try {
      await stopServer()
      setStatus((prev) => prev ? { ...prev, running: false, active_model: null, pid: null, started_at: null } : null)
      onChange?.()
    } catch {
      // ignore
    } finally {
      setStopping(false)
      setConfirmStop(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Checking server status…
      </div>
    )
  }

  if (!status?.running) {
    return (
      <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-500 text-sm">
        <PowerOff className="w-4 h-4" />
        No model currently loaded
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 rounded-lg bg-zinc-900 border border-emerald-700">
      <div className="flex items-center gap-4">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
        </span>
        <Server className="w-4 h-4 text-emerald-400" />
        <div className="text-sm">
          <span className="text-zinc-100 font-medium">{status.active_model}</span>
          <span className="text-zinc-500 mx-2">·</span>
          <span className="text-zinc-400">port {status.port}</span>
          <span className="text-zinc-500 mx-2">·</span>
          <span className="text-zinc-500">PID {status.pid}</span>
        </div>
      </div>

      <div className="relative">
        {!confirmStop ? (
          <button
            onClick={() => setConfirmStop(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
            Stop Server
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Stop server?</span>
            <button
              onClick={handleStop}
              disabled={stopping}
              className="px-2.5 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              {stopping ? 'Stopping…' : 'Yes'}
            </button>
            <button
              onClick={() => setConfirmStop(false)}
              className="px-2.5 py-1 text-xs font-medium rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
