import { type FormEvent, useState } from 'react'
import { Play, X } from 'lucide-react'
import { startServer } from '../api/server'
import TerminalPanel from './TerminalPanel'

const CTX_OPTIONS = [2048, 4096, 8192]

export default function StartModal({
  filename,
  onClose,
  onStarted,
}: {
  filename: string
  onClose: () => void
  onStarted: () => void
}) {
  const [nGpuLayers, setNGpuLayers] = useState(-1)
  const [nCtx, setNCtx] = useState(2048)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showingTerminal, setShowingTerminal] = useState(false)
  const [lines, setLines] = useState<string[]>([])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setShowingTerminal(true)
    setLines([])
    try {
      await startServer(
        { filename, n_gpu_layers: nGpuLayers, n_ctx: nCtx },
        (line) => setLines((prev) => [...prev, line]),
      )
      onStarted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start server')
      setShowingTerminal(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Start Model Server</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {showingTerminal ? (
          <div className="px-6 py-5">
            <TerminalPanel lines={lines} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            <div>
              <p className="text-xs text-zinc-500 mb-1 font-mono">{filename}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                n_gpu_layers
              </label>
              <input
                type="number"
                min={-1}
                value={nGpuLayers}
                onChange={(e) => setNGpuLayers(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-zinc-600 mt-1">Set to -1 for full GPU offload, 0 for CPU only</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                n_ctx (context length)
              </label>
              <select
                value={nCtx}
                onChange={(e) => setNCtx(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CTX_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Starting…' : 'Start Server'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
