import React from 'react'
import { blog_data, blogCategories } from '../assets/assets'
import { motion } from 'motion/react'
import BlogCard from '../components/BlogCard'

// Frontend will call backend /api endpoints (proxied in Vite config).
// This component fetches blogs from the backend, falls back to static
// `blog_data` if the request fails, and provides a small admin action
// to generate an AI post via POST /api/generate.

const BlogList = () => {

  const [menu, setMenu] = React.useState("All")
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)
  const [blogs, setBlogs] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [ingestPath, setIngestPath] = React.useState('/mnt/seagate28/ai_library')
  const [ingesting, setIngesting] = React.useState(false)
  const [ingestStatus, setIngestStatus] = React.useState(null)
  const [showAdminMenu, setShowAdminMenu] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(!!mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Fetch blogs from backend on mount; fall back to static data on error
  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch('/api/blogs')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!mounted) return
        setBlogs(Array.isArray(data) ? data : [])
        setError(null)
      })
      .catch((err) => {
        // fallback to packaged static data
        console.warn('Failed to load /api/blogs, falling back to local data:', err)
        if (!mounted) return
        setBlogs(blog_data || [])
        setError(err.message)
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  // Small helper: call the backend generate endpoint and insert the result
  const handleGenerate = async () => {
    const prompt = window.prompt('Enter prompt for AI blog generation')
    if (!prompt) return
    try {
      setLoading(true)
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, n_results: 3 }),
      })
      const body = await res.json()
      const content = body.content || 'Generated content'
      // create a lightweight blog object and prepend it to the list
      const newBlog = {
        _id: `gen-${Date.now()}`,
        title: (content || '').split('\n')[0].slice(0, 80) || 'AI Generated Post',
        description: content,
        category: 'AI Generated',
        image: '',
        createdAt: new Date().toISOString(),
        isPublished: false,
      }
      setBlogs((s) => [newBlog, ...(s || [])])
      alert('Generated content added to the top of the list (draft).')
    } catch (e) {
      console.error(e)
      alert('Failed to generate content: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='mx-auto px-4 max-w-6xl'>
      {/* Use flex-wrap so category pills move to the next line instead of overlapping
          and keep admin controls in a non-absolute area so they flow responsively. */}
      <div className='flex flex-wrap justify-between items-center gap-4 sm:gap-8 my-10'>
        <div className='flex flex-wrap items-center gap-2 flex-1'>
          {blogCategories.map((item) => {
          const selected = item === menu
          return (
            <div key={item} className='relative'>
              <button
                onClick={() => setMenu(item)}
                aria-pressed={selected}
                className='relative cursor-pointer inline-flex items-center'
              >
                {/* background pill only for selected item (animated when allowed) */}
                {selected && (
                  <motion.div
                    layout
                    initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
                    animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className='absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-7 bg-primary rounded-full z-0'
                  />
                )}
                {/* text turns white only when selected */}
                <span className={`relative z-10 px-4 ${selected ? 'text-white' : 'text-gray-700'}`}>
                  {item}
                </span>
              </button>
            </div>
          )
        })}
        </div>
        {/* Desktop / wide screens: keep controls inline */}
        <div className='hidden sm:flex flex-shrink-0 ml-4 mt-0 flex gap-2 items-center'>
          <input
            value={ingestPath}
            onChange={(e) => setIngestPath(e.target.value)}
            className='text-sm px-2 py-1 rounded border mr-2 w-64'
            title='Local path to ingest (server must have access)'
          />
          <button
            onClick={() => fetch('/api/docs/status').then((r) => r.json()).then(setIngestStatus).catch((e) => setIngestStatus({ error: e.message }))}
            className='px-2 py-1 bg-gray-200 text-sm rounded'
            title='Fetch ingestion status'
          >
            Status
          </button>
          <button
            onClick={async () => {
              if (!window.confirm(`Ingest files at ${ingestPath} ?`)) return
              try {
                setIngesting(true)
                const res = await fetch('/api/docs/ingest-path', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ path: ingestPath, recursive: true }),
                })
                const body = await res.json()
                if (!res.ok) throw new Error(body.detail || JSON.stringify(body))
                setIngestStatus({ ingested: body.ingested })
                alert(`Ingested ${body.ingested} chunks from ${ingestPath}`)
              } catch (e) {
                console.error(e)
                alert('Ingest failed: ' + e.message)
              } finally {
                setIngesting(false)
              }
            }}
            className='px-3 py-1 bg-primary text-white rounded-md text-sm'
            title='Ingest files from server path (admin)'
            disabled={ingesting}
          >
            {ingesting ? 'Ingesting…' : 'Ingest Path'}
          </button>
          <button
            onClick={handleGenerate}
            className='px-3 py-1 bg-primary text-white rounded-md text-sm'
            title='Generate an AI blog (admin)'
          >
            Generate
          </button>
        </div>

        {/* Mobile: compact toggle that reveals a dropdown containing the same controls */}
        <div className='relative sm:hidden'>
          <button
            onClick={() => setShowAdminMenu((s) => !s)}
            aria-expanded={showAdminMenu}
            className='px-3 py-1 bg-gray-100 rounded-md'
            title='Admin menu'
          >
            Admin
          </button>

          {showAdminMenu && (
            <div className='absolute right-0 mt-2 w-72 bg-white border rounded shadow-lg p-3 z-40'>
              <input
                value={ingestPath}
                onChange={(e) => setIngestPath(e.target.value)}
                className='text-sm px-2 py-1 rounded border mb-2 w-full'
                title='Local path to ingest (server must have access)'
              />
              <div className='flex gap-2 mb-2'>
                <button
                  onClick={() => fetch('/api/docs/status').then((r) => r.json()).then((s) => { setIngestStatus(s); setShowAdminMenu(false) }).catch((e) => setIngestStatus({ error: e.message }))}
                  className='flex-1 px-2 py-1 bg-gray-200 text-sm rounded'
                >
                  Status
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Ingest files at ${ingestPath} ?`)) return
                    try {
                      setIngesting(true)
                      const res = await fetch('/api/docs/ingest-path', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: ingestPath, recursive: true }),
                      })
                      const body = await res.json()
                      if (!res.ok) throw new Error(body.detail || JSON.stringify(body))
                      setIngestStatus({ ingested: body.ingested })
                      setShowAdminMenu(false)
                      alert(`Ingested ${body.ingested} chunks from ${ingestPath}`)
                    } catch (e) {
                      console.error(e)
                      alert('Ingest failed: ' + e.message)
                    } finally {
                      setIngesting(false)
                    }
                  }}
                  className='flex-1 px-2 py-1 bg-primary text-white rounded-md text-sm'
                  disabled={ingesting}
                >
                  {ingesting ? 'Ingesting…' : 'Ingest'}
                </button>
              </div>
              <button
                onClick={() => { handleGenerate(); setShowAdminMenu(false) }}
                className='w-full px-3 py-1 bg-primary text-white rounded-md text-sm'
              >
                Generate
              </button>
            </div>
          )}
        </div>
      </div>
      <div>
        {loading && <div className='text-center py-8'>Loading blogs...</div>}
        {!loading && error && (
          <div className='text-center py-4 text-sm text-red-600'>
            Showing cached content — failed to load remote blogs: {error}
          </div>
        )}

        {ingestStatus && (
          <div className='text-sm py-2 mb-4'>
            <strong>Ingest status:</strong>{' '}
            {ingestStatus.error ? (
              <span className='text-red-600'>{ingestStatus.error}</span>
            ) : ingestStatus.count !== undefined ? (
              <span>{ingestStatus.count} embeddings, docs: {ingestStatus.docs && ingestStatus.docs.join(', ')}</span>
            ) : ingestStatus.ingested !== undefined ? (
              <span>{ingestStatus.ingested} chunks ingested</span>
            ) : (
              <pre className='whitespace-pre-wrap'>{JSON.stringify(ingestStatus)}</pre>
            )}
          </div>
        )}

        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 mb-24'>
          {(blogs || [])
            .filter((blog) => (menu === 'All' ? true : blog.category === menu))
            .map((blog) => (
              <BlogCard key={blog._id} blog={blog} />
            ))}
        </div>
      </div>
    </div>
  )
}

export default BlogList
