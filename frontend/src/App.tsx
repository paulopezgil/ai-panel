import { useCallback, useState } from 'react'
import DownloadForm from './components/DownloadForm'
import ModelList from './components/ModelList'
import ServerStatusBanner from './components/ServerStatusBanner'
import type { ServerStatus } from './api/server'

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  function handleServerChange() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">AI Panel</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <section>
          <ServerStatusBanner
            onChange={handleServerChange}
            onStatusUpdate={setServerStatus}
          />
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <DownloadForm onSuccess={refresh} />
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <ModelList
            key={refreshKey}
            serverStatus={serverStatus}
            onServerChange={handleServerChange}
          />
        </section>
      </main>
    </div>
  )
}
