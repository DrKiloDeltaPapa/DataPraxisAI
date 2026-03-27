
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { blog_data } from '../assets/assets'
import { apiFetch } from '../utils/api'
import { resolveBlogImage } from '../utils/imageHelpers'

// Utility to strip YAML frontmatter from markdown
function stripFrontmatter(md) {
  if (!md) return '';
  if (md.startsWith('---')) {
    const end = md.indexOf('---', 3);
    if (end !== -1) return md.slice(end + 3).replace(/^\s+/, '');
  }
  return md;
}

const Blog = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const subtitle = post?.subTitle || post?.subtitle

  React.useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    let mounted = true
    const fetchBlog = async () => {
      try {
        const res = await apiFetch(`/api/blogs/${id}`)
        if (res.ok) {
          const data = await res.json()
          if (!mounted) return
          setPost({
            ...data,
            _id: data._id || data.id,
            content_markdown: data.content_markdown || data.description || '',
            image: resolveBlogImage(data.image),
          })
          setError(null)
          return
        }
        // fallback to static data
        const local = (blog_data || []).find((b) => b._id === id || String(b._id) === String(id))
        if (local) {
          setPost({ ...local, image: resolveBlogImage(local.image) })
          setError(null)
        } else {
          setError('Post not found')
        }
      } catch (e) {
        // fallback to static data on network error
        const local = (blog_data || []).find((b) => b._id === id || String(b._id) === String(id))
        if (local) {
          setPost({ ...local, image: resolveBlogImage(local.image) })
          setError(null)
        } else {
          setError(e.message)
        }
      } finally {
        mounted && setLoading(false)
      }
    }

    fetchBlog()
    return () => {
      mounted = false
    }
  }, [id])

  if (!id) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-12'>
        <h1 className='text-2xl font-semibold mb-4'>Blog</h1>
        <p className='text-gray-600'>No blog selected. Go back to the home page to pick a post.</p>
      </div>
    )
  }

  if (loading) {
    return <div className='mx-auto max-w-4xl px-4 py-12'>Loading post…</div>
  }

  if (error || !post) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-12'>
        <h1 className='text-2xl font-semibold mb-4'>Post not found</h1>
        <p className='text-gray-600 mb-6'>{error || 'We could not find the requested post.'}</p>
        <button
          onClick={() => navigate('/')}
          className='px-4 py-2 bg-primary text-white rounded-md'
        >
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <article className='mx-auto max-w-4xl px-4 py-12'>
      <header className='mb-6'>
        <h1 className='text-3xl font-bold mb-2'>{post.title}</h1>
        {subtitle && <p className='text-gray-600 mb-2'>{subtitle}</p>}
        <div className='text-sm text-gray-500'>
          {new Date(post.created_at || post.createdAt || Date.now()).toLocaleString()}
        </div>
      </header>

      {post.image && (
        <div className='mb-6'>
          <img src={post.image} alt={post.title} className='w-full rounded-lg shadow-sm object-cover max-h-96' />
        </div>
      )}

      <section className='prose max-w-none prose-lg'>
        {post.content_markdown ? (
          <ReactMarkdown>{stripFrontmatter(post.content_markdown)}</ReactMarkdown>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: post.description || '' }} />
        )}
      </section>

      {post.sources && post.sources.length > 0 && (
        <div className='mt-8 p-4 bg-gray-50 rounded'>
          <h4 className='font-semibold mb-2'>Sources</h4>
          <ul className='space-y-1 text-sm'>
            {post.sources.map((s, i) => (
              <li key={i}>
                <strong>{s.title || 'Untitled'}</strong>
                {s.author && <span className='text-gray-600'> — {s.author}</span>}
                {s.url && (
                  <>
                    {' '}
                    <a className='text-blue-600' href={s.url} target='_blank' rel='noreferrer'>link</a>
                  </>
                )}
                {s.path && <span className='text-gray-500'> — {s.path}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {post.validation && (
        <div className={`mt-6 p-4 rounded border ${post.validation.passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className={`font-semibold ${post.validation.passed ? 'text-emerald-700' : 'text-amber-700'}`}>
            {post.validation.passed ? 'Validation passed' : 'Validation warnings'}
          </div>
          {post.validation.findings && post.validation.findings.length > 0 && (
            <ul className='list-disc pl-6 mt-2 space-y-1 text-sm text-gray-700'>
              {post.validation.findings.map((finding, idx) => (
                <li key={idx}>
                  <strong className='uppercase text-xs mr-2'>{finding.level}</strong>
                  {finding.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {Array.isArray(post.trace) && post.trace.length > 0 && (
        <div className='mt-6 p-4 rounded border border-gray-200'>
          <h4 className='font-semibold mb-2'>Agent Trace</h4>
          <ol className='space-y-1 text-sm text-gray-700'>
            {post.trace.map((step, idx) => (
              <li key={idx} className='flex flex-wrap gap-2 items-center'>
                <span className='font-mono text-xs text-gray-500'>[{step.agent}]</span>
                <span className='font-semibold'>{step.status}</span>
                {step.detail && <span className='text-gray-500'>— {step.detail}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  )
}

export default Blog
