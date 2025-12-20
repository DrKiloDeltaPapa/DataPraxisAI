import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { blog_data } from '../assets/assets'

const Blog = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // allow visiting both /blog and /blog/:id - if no id, show placeholder
  if (!id) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-12'>
        <h1 className='text-2xl font-semibold mb-4'>Blog</h1>
        <p className='text-gray-600'>No blog selected. Go back to the home page to pick a post.</p>
      </div>
    )
  }

  const post = (blog_data || []).find((b) => b._id === id || String(b._id) === String(id))

  if (!post) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-12'>
        <h1 className='text-2xl font-semibold mb-4'>Post not found</h1>
        <p className='text-gray-600 mb-6'>We couldn't find the requested post locally.</p>
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
        {post.subTitle && <p className='text-gray-600 mb-2'>{post.subTitle}</p>}
        <div className='text-sm text-gray-500'>
          {new Date(post.createdAt || Date.now()).toLocaleString()}
        </div>
      </header>

      {post.image && (
        // image may be an imported asset or empty string
        <div className='mb-6'>
          <img src={post.image} alt={post.title} className='w-full rounded-lg shadow-sm object-cover max-h-96' />
        </div>
      )}

      <section className='prose max-w-none prose-lg'>
        {/* The descriptions in the static blog_data are trusted local HTML; render as HTML here. */}
        <div dangerouslySetInnerHTML={{ __html: post.description || '' }} />
      </section>
    </article>
  )
}

export default Blog
