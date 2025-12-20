import React from 'react'

const Admin = () => {
  const [status, setStatus] = React.useState(null)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/docs/status')
      const body = await res.json()
      setStatus(body)
    } catch (e) {
      setStatus({ error: e.message })
    }
  }

  const doSearch = async () => {
    if (!query) return
    setLoading(true)
    try {
      const res = await fetch(`/api/docs/search?q=${encodeURIComponent(query)}&k=10`)
      const body = await res.json()
      setResults(body)
    } catch (e) {
      setResults({ error: e.message })
    } finally {
      setLoading(false)
    }
  }

  const clearEmbeddings = async () => {
    if (!window.confirm('Clear embeddings.json? This cannot be undone in this demo.')) return
    try {
      const res = await fetch('/api/docs/clear', { method: 'POST' })
      const body = await res.json()
      alert('Cleared: ' + JSON.stringify(body))
      fetchStatus()
      setResults(null)
    } catch (e) {
      alert('Clear failed: ' + e.message)
    }
  }

  React.useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <h2 className='text-2xl font-semibold mb-4'>Admin — RAG / Embeddings</h2>

      <section className='mb-6'>
        <button onClick={fetchStatus} className='px-3 py-1 bg-gray-200 rounded mr-2'>Refresh Status</button>
        <button onClick={clearEmbeddings} className='px-3 py-1 bg-red-500 text-white rounded'>Clear Embeddings</button>
        <div className='mt-3 text-sm'>
          {status ? (
            status.error ? (
              <span className='text-red-600'>{status.error}</span>
            ) : (
              <div>Embeddings: <strong>{status.count}</strong> — Docs: {status.docs && status.docs.join(', ')}</div>
            )
          ) : (
            <span>Loading status...</span>
          )}
        </div>
      </section>

      <section className='mb-6'>
        <h3 className='font-medium mb-2'>Search the vector store</h3>
        <div className='flex gap-2 mb-2'>
          <input className='flex-1 px-2 py-1 border rounded' value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Enter query' />
          <button onClick={doSearch} className='px-3 py-1 bg-primary text-white rounded'>{loading ? 'Searching…' : 'Search'}</button>
        </div>
        {results && (
          <div className='mt-3'>
            <h4 className='font-medium'>Results for: {results.query}</h4>
            {results.results && results.results.length ? (
              <ol className='list-decimal pl-6'>
                {results.results.map((r, i) => (
                  <li key={i} className='mb-3'>
                    <div className='text-xs text-gray-600'>doc: {r.doc_id} — chunk: {r.chunk_id} — score: {r.score.toFixed(4)}</div>
                    <div className='mt-1 whitespace-pre-wrap'>{r.text.slice(0, 400)}{r.text.length > 400 ? '…' : ''}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className='text-sm text-gray-600'>No results</div>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className='font-medium mb-2'>Training/export</h3>
  <p className='text-sm mb-2'>Export a training dataset of <code>prompt</code> → <code>response</code> pairs from retrieved chunks to use for fine-tuning or local training.</p>
        <p className='text-sm mb-2'>This demo provides an export button that will request the server to create a JSONL file under <code>server/data/</code>.</p>
        <button onClick={async () => {
          try {
            const res = await fetch('/api/docs/export-training', { method: 'POST' })
            const body = await res.json()
            alert('Exported: ' + JSON.stringify(body))
          } catch (e) { alert('Export failed: ' + e.message) }
        }} className='px-3 py-1 bg-green-600 text-white rounded'>Export Training Dataset</button>
      </section>
    </div>
  )
}

export default Admin
