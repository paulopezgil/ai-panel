import { useCallback, useState } from 'react'
import DownloadForm from './components/DownloadForm'
import ModelList from './components/ModelList'

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">AI Panel</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <section className="bg-white rounded shadow-sm p-6">
          <DownloadForm onSuccess={refresh} />
        </section>

        <section className="bg-white rounded shadow-sm p-6">
          <ModelList key={refreshKey} />
        </section>
      </main>
    </div>
  )
}
