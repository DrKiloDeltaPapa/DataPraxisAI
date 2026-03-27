import React from 'react'
import { useNavigate } from 'react-router-dom'
import { blog_data, blogCategories, blogIllustrationList } from '../assets/assets'
import { motion } from 'motion/react'
import BlogCard from '../components/BlogCard'
import { resolveBlogImage, defaultBlogImage } from '../utils/imageHelpers'
import { apiFetch } from '../utils/api'

const AnimatedPill = motion.div

// Frontend will call backend /api endpoints (proxied in Vite config).
// This component fetches blogs from the backend, falls back to static
// `blog_data` if the request fails, and provides a small admin action
// to generate an AI post via POST /api/generate.

const BlogList = () => {

  const navigate = useNavigate()

  const [menu, setMenu] = React.useState("All")
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)
  const [blogs, setBlogs] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [ingestPath, setIngestPath] = React.useState('/mnt/seagate28/ai_library')
  const [ingesting, setIngesting] = React.useState(false)
  const [ingestStatus, setIngestStatus] = React.useState(null)
  const [showAdminMenu, setShowAdminMenu] = React.useState(false)

  const categoryPanels = React.useMemo(() => ({
    'Case Studies': {
      eyebrow: 'Enterprise wins',
      title: 'How teams shipped measurable impact',
      description:
        'Each case study distills a real deployment: the messy constraints, the telemetry we captured, and the governance signals that proved the rollout was safe. Use them as templates when you need to persuade stakeholders.',
      bullets: [
        'Before / after metrics for latency, accuracy, and support load',
        'Architecture diagrams that highlight retrieval flow and evaluators',
        'Ops checklist covering ingestion, monitoring, and playbooks'
      ]
    },
    'The Stack': {
      eyebrow: 'Reference architecture',
      title: 'Opinionated blueprints for your AI platform',
      description:
        'The Stack posts keep the conversation tactical—what runs on the edge, what stays in the core platform, and which guardrails catch regressions before they go live.',
      bullets: [
        'Side-by-side comparisons of orchestration patterns',
        'Cost envelopes for hosted vs. self-managed model mixes',
        'Evaluation harnesses that tie back to telemetry traces'
      ]
    }
  }), [])

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(!!mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Fetch blogs from backend on mount; fall back to static data on error
  const normalizeBlogs = (list) => {
    return (Array.isArray(list) ? list : []).map((b) => {
      const resolvedImage = resolveBlogImage(b.image)
      return {
        ...b,
        id: b.id || b._id || `blog-${Math.random().toString(36).slice(2, 8)}`,
        _id: b.id || b._id || `blog-${Math.random().toString(36).slice(2, 8)}`,
        category: b.category || 'AI Generated',
        description: b.description || b.content_markdown || b.text || '',
        image: resolvedImage || defaultBlogImage,
      }
    })
  }

  const assignCardImages = (list) =>
    (list || []).map((blog, idx) => ({
      ...blog,
      card_image: blogIllustrationList[idx % blogIllustrationList.length],
    }))

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    apiFetch('/api/blogs')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!mounted) return
        const remoteBlogs = normalizeBlogs(data)
        const remoteIds = new Set(remoteBlogs.map((b) => b._id))
        const fallbackBlogs = normalizeBlogs(blog_data).filter((local) => !remoteIds.has(local._id))
        const merged = assignCardImages([...remoteBlogs, ...fallbackBlogs])
        setBlogs(merged)
        setError(null)
      })
      .catch((err) => {
        // fallback to packaged static data
        console.warn('Failed to load /api/blogs, falling back to local data:', err)
        if (!mounted) return
        setBlogs(assignCardImages(normalizeBlogs(blog_data)))
        setError(err.message)
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  // Small helper: call the backend multi-agent endpoint and insert the result
  const handleGenerate = async () => {
    const prompt = window.prompt('Enter prompt for AI blog generation')
    if (!prompt) return
    try {
      setLoading(true)
      const res = await apiFetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: prompt, audience: 'general', length: 'medium' }),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.detail || 'Generation failed')
      }
      const content = body.content_markdown || body.content || ''
      // create a lightweight blog object and prepend it to the list
      const normalizedNewBlog = normalizeBlogs([
        {
          ...body,
          description: content,
          category: 'AI Generated',
          created_at: body.created_at || new Date().toISOString(),
        },
      ])[0]
      setBlogs((prev) => assignCardImages([normalizedNewBlog, ...(prev || [])]))
      alert('Generated blog added to the top of the list.')
    } catch (e) {
      console.error(e)
      alert('Failed to generate content: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='mx-auto px-4 max-w-6xl'>
      <div className='w-full mb-8 rounded-3xl border border-primary/20 bg-linear-to-r from-indigo-50 via-white to-rose-50 p-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center'>
        <div>
          <p className='text-sm uppercase tracking-[0.2em] text-primary mb-2'>Live multi-agent demo</p>
          <h3 className='text-2xl font-semibold text-slate-800 mb-1'>Telemetry-ready Admin Console</h3>
          <p className='text-slate-600 max-w-2xl'>Inspect retrieval chunks, reasoning traces, and validation findings in real time. The new console streams every orchestrated run directly from the backend telemetry store.</p>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className='px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold shadow-sm hover:shadow-lg transition'
        >
          Launch Admin
        </button>
      </div>
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
                  <AnimatedPill
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
        <div className='hidden sm:flex shrink-0 ml-4 mt-0 gap-2 items-center'>
          <input
            value={ingestPath}
            onChange={(e) => setIngestPath(e.target.value)}
            className='text-sm px-2 py-1 rounded border mr-2 w-64'
            title='Local path to ingest (server must have access)'
          />
          <button
            onClick={() => apiFetch('/api/docs/status').then((r) => r.json()).then(setIngestStatus).catch((e) => setIngestStatus({ error: e.message }))}
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
                const res = await apiFetch('/api/docs/ingest-path', {
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
                  onClick={() => apiFetch('/api/docs/status').then((r) => r.json()).then((s) => { setIngestStatus(s); setShowAdminMenu(false) }).catch((e) => setIngestStatus({ error: e.message }))}
                  className='flex-1 px-2 py-1 bg-gray-200 text-sm rounded'
                >
                  Status
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Ingest files at ${ingestPath} ?`)) return
                    try {
                      setIngesting(true)
                      const res = await apiFetch('/api/docs/ingest-path', {
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
        {categoryPanels[menu] && (
          <section className='mb-10 rounded-2xl border border-primary/10 bg-white/70 p-6 shadow-sm'>
            <p className='text-xs uppercase tracking-[0.3em] text-primary mb-2'>{categoryPanels[menu].eyebrow}</p>
            <h4 className='text-2xl font-semibold text-slate-900 mb-3'>{categoryPanels[menu].title}</h4>
            <p className='text-sm text-slate-600 mb-4'>{categoryPanels[menu].description}</p>
            <ul className='grid gap-2 text-sm text-slate-700 list-disc pl-5 sm:grid-cols-2'>
              {categoryPanels[menu].bullets.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        )}
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
            .filter((blog) => {
              const cat = blog.category || 'AI Generated'
              return menu === 'All' ? true : cat === menu
            })
            .map((blog) => (
              <BlogCard key={blog._id || blog.id} blog={blog} />
            ))}
        </div>
      </div>
    </div>
  )
}

export default BlogList
