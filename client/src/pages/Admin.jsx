import React from 'react'
import ReactMarkdown from 'react-markdown'

const Admin = () => {
  const [activeTab, setActiveTab] = React.useState('generate') // 'generate' or 'search'
  const [ragStatus, setRagStatus] = React.useState(null)
  const [llmStatus, setLlmStatus] = React.useState(null)
  const [topic, setTopic] = React.useState('')
  const [audience, setAudience] = React.useState('general')
  const [length, setLength] = React.useState('medium')
  const [generating, setGenerating] = React.useState(false)
  const [generatedBlog, setGeneratedBlog] = React.useState(null)
  const [generationError, setGenerationError] = React.useState(null)

  // Legacy search state
  const [status, setStatus] = React.useState(null)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  // Fetch RAG and LLM status on mount
  const fetchStatuses = async () => {
    try {
      const ragRes = await fetch('/api/rag/status')
      const ragBody = await ragRes.json()
      setRagStatus(ragBody)
      
      const llmRes = await fetch('/api/llm/status')
      const llmBody = await llmRes.json()
      setLlmStatus(llmBody)
    } catch (e) {
      setRagStatus({ error: e.message })
      setLlmStatus({ error: e.message })
    }
  }

  // Generate blog post using RAG + LLM
  const generateBlog = async () => {
    if (!topic.trim()) {
      setGenerationError('Please enter a topic')
      return
    }

    setGenerating(true)
    setGenerationError(null)
    setGeneratedBlog(null)

    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          audience,
          length,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Generation failed')
      }

      const blog = await res.json()
      setGeneratedBlog(blog)
    } catch (e) {
      setGenerationError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  // Legacy: Fetch embeddings status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/docs/status')
      const body = await res.json()
      setStatus(body)
    } catch (e) {
      setStatus({ error: e.message })
    }
  }

  // Legacy: Search embeddings
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

  // Legacy: Clear embeddings
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
    fetchStatuses()
    fetchStatus()
  }, [])

  return (
    <div className='mx-auto max-w-6xl px-4 py-8'>
      <h2 className='text-3xl font-bold mb-2'>Admin Dashboard</h2>
      <p className='text-gray-600 mb-6'>Generate blog content using RAG + LLM synthesis or manage embeddings.</p>

      {/* RAG & LLM Status Boxes */}
      <div className='grid grid-cols-2 gap-4 mb-6'>
        {ragStatus && (
          <div className={`p-4 rounded ${ragStatus.config_valid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className='flex items-center gap-2 mb-2'>
              <span className={`text-sm font-semibold ${ragStatus.config_valid ? 'text-green-700' : 'text-yellow-700'}`}>
                {ragStatus.config_valid ? '✓ RAG Ready' : '⚠ Limited RAG'}
              </span>
              <span className='text-xs bg-gray-200 px-2 py-1 rounded'>{ragStatus.mode}</span>
            </div>
            <p className='text-xs text-gray-600'>
              {ragStatus.config_valid ? 'Lakehouse available. Full retrieval enabled.' : `Issue: ${ragStatus.config_error}`}
            </p>
          </div>
        )}
        
        {llmStatus && (
          <div className={`p-4 rounded ${llmStatus.available ? 'bg-blue-50 border border-blue-200' : 'bg-orange-50 border border-orange-200'}`}>
            <div className='flex items-center gap-2 mb-2'>
              <span className={`text-sm font-semibold ${llmStatus.available ? 'text-blue-700' : 'text-orange-700'}`}>
                {llmStatus.available ? '✓ LLM Ready' : '⚠ LLM Offline'}
              </span>
              <span className='text-xs bg-gray-200 px-2 py-1 rounded'>{llmStatus.mode}</span>
            </div>
            <p className='text-xs text-gray-600'>{llmStatus.message}</p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className='mb-6 border-b flex gap-4'>
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 font-medium ${activeTab === 'generate' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          Generate Blog
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 font-medium ${activeTab === 'search' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          Vector Search
        </button>
      </div>

      {/* TAB 1: Generate Blog */}
      {activeTab === 'generate' && (
        <section className='mb-8'>
          <div className='max-w-2xl'>
            <h3 className='text-xl font-semibold mb-4'>Generate a Blog Post</h3>

            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>Topic / Title</label>
              <input
                type='text'
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder='e.g., "Introduction to Vector Databases"'
                className='w-full px-3 py-2 border rounded'
              />
            </div>

            <div className='grid grid-cols-2 gap-4 mb-4'>
              <div>
                <label className='block text-sm font-medium mb-2'>Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className='w-full px-3 py-2 border rounded'
                >
                  <option value='general'>General</option>
                  <option value='technical'>Technical</option>
                  <option value='business'>Business</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium mb-2'>Length</label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className='w-full px-3 py-2 border rounded'
                >
                  <option value='short'>Short</option>
                  <option value='medium'>Medium</option>
                  <option value='long'>Long</option>
                </select>
              </div>
            </div>

            <button
              onClick={generateBlog}
              disabled={generating || !topic.trim()}
              className='w-full px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:bg-gray-400'
            >
              {generating ? 'Generating… (LLM synthesis in progress)' : 'Generate Blog Post'}
            </button>

            {generationError && (
              <div className='mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm'>
                {generationError}
              </div>
            )}
          </div>

          {/* Generated Blog Output */}
          {generatedBlog && (
            <div className='mt-8 pt-8 border-t'>
              <div className='prose prose-sm max-w-none mb-8'>
                <h2>{generatedBlog.title}</h2>
                <ReactMarkdown>{generatedBlog.content_markdown}</ReactMarkdown>
              </div>

              <div className='mb-6'>
                <a
                  href={`/blog/${generatedBlog.id}`}
                  className='inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded border border-blue-200 text-sm'
                >
                  View saved blog →
                </a>
              </div>

              {/* Sources / Citations */}
              {generatedBlog.sources && generatedBlog.sources.length > 0 && (
                <div className='mt-8 p-4 bg-gray-50 rounded'>
                  <h4 className='font-semibold mb-3'>Sources</h4>
                  <ul className='space-y-2'>
                    {generatedBlog.sources.map((source, i) => (
                      <li key={i} className='text-sm'>
                        <div className='font-medium'>
                          {source.title || 'Untitled'}
                          <span className='text-xs text-gray-500 ml-2'>(relevance: {(source.score * 100).toFixed(1)}%)</span>
                        </div>
                        <div className='text-xs text-gray-600'>
                          {source.author && `By ${source.author} • `}
                          {source.path && `Path: ${source.path}`}
                        </div>
                        {source.url && (
                          <a href={source.url} target='_blank' rel='noopener noreferrer' className='text-blue-600 text-xs'>
                            → {source.url}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Vector Search (Legacy) */}
      {activeTab === 'search' && (
        <>
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
              <button onClick={doSearch} className='px-3 py-1 bg-blue-600 text-white rounded'>{loading ? 'Searching…' : 'Search'}</button>
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
            <p className='text-sm mb-2'>Export a training dataset of <code>prompt</code> → <code>response</code> pairs from retrieved chunks.</p>
            <button onClick={async () => {
              try {
                const res = await fetch('/api/docs/export-training', { method: 'POST' })
                const body = await res.json()
                alert('Exported: ' + JSON.stringify(body))
              } catch (e) { alert('Export failed: ' + e.message) }
            }} className='px-3 py-1 bg-green-600 text-white rounded'>Export Training Dataset</button>
          </section>
        </>
      )}
    </div>
  )
}
