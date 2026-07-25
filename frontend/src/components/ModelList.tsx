import { useEffect, useState } from 'react'
import { type ModelInfo, fetchModels } from '../api/models'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export default function ModelList() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">
          Models ({models.length})
        </h2>
        <button
          onClick={load}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-gray-500 text-sm">Loading…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!loading && !error && models.length === 0 && (
        <p className="text-gray-500 text-sm">No models downloaded yet.</p>
      )}

      {models.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-3 font-medium text-gray-600">Name</th>
                <th className="py-2 px-3 font-medium text-gray-600">Size</th>
                <th className="py-2 px-3 font-medium text-gray-600">Modified</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.name} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-gray-800">{m.name}</td>
                  <td className="py-2 px-3 text-gray-600">{formatBytes(m.size_bytes)}</td>
                  <td className="py-2 px-3 text-gray-600">{formatDate(m.modified_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
