import { type FormEvent, useState } from 'react'
import { downloadModel } from '../api/models'

export default function DownloadForm({ onSuccess }: { onSuccess: () => void }) {
  const [repoId, setRepoId] = useState('')
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await downloadModel({ repo_id: repoId, filename })
      setRepoId('')
      setFilename('')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Download Model</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="repo_id (e.g. TheBloke/Llama-2-7B-GGUF)"
          value={repoId}
          onChange={(e) => setRepoId(e.target.value)}
          required
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="text"
          placeholder="filename (e.g. llama-2-7b.Q4_K_M.gguf)"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          required
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Downloading…' : 'Download'}
      </button>
    </form>
  )
}
