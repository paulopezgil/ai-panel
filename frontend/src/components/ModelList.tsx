import { useEffect, useState } from 'react'
import { Play, RotateCw } from 'lucide-react'
import { type ModelInfo, fetchModels } from '../api/models'
import type { ServerStatus } from '../api/server'
import StartModal from './StartModal'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export default function ModelList({
  serverStatus,
  onServerChange,
}: {
  serverStatus: ServerStatus | null
  onServerChange: () => void
}) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startTarget, setStartTarget] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchModels()
      setModels(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const activeModel = serverStatus?.running ? serverStatus.active_model : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">
          Models ({models.length})
        </h2>
        <button
          onClick={load}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && models.length === 0 && (
        <p className="text-zinc-500 text-sm">No models downloaded yet.</p>
      )}

      {models.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="py-2.5 px-3 font-medium text-zinc-400">Name</th>
                <th className="py-2.5 px-3 font-medium text-zinc-400">Size</th>
                <th className="py-2.5 px-3 font-medium text-zinc-400">Modified</th>
                <th className="py-2.5 px-3 font-medium text-zinc-400 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => {
                const isActive = activeModel === m.name
                return (
                  <tr
                    key={m.name}
                    className={`border-b border-zinc-800 transition-colors ${isActive ? 'bg-emerald-950/40' : 'hover:bg-zinc-800/50'}`}
                  >
                    <td className="py-2.5 px-3 font-mono text-sm text-zinc-100">{m.name}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{formatBytes(m.size_bytes)}</td>
                    <td className="py-2.5 px-3 text-zinc-500">{formatDate(m.modified_at)}</td>
                    <td className="py-2.5 px-3">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                          </span>
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => setStartTarget(m.name)}
                          disabled={serverStatus?.running && !isActive}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Run
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {startTarget && (
        <StartModal
          filename={startTarget}
          onClose={() => setStartTarget(null)}
          onStarted={onServerChange}
        />
      )}
    </div>
  )
}
