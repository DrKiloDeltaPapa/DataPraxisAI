import React from 'react'
import { useNavigate } from 'react-router-dom'
import { defaultBlogImage } from '../utils/imageHelpers'

const BlogCard = ({ blog }) => {
        const { title, description, category } = blog
    const blogId = blog._id || blog.id
  const navigate = useNavigate()
    const resolvedImage = blog.card_image || blog.image || defaultBlogImage

return (
    <div
        onClick={() => navigate(`/blog/${blogId}`)}
        className='w-full rounded-lg overflow-hidden shadow hover:scale-105 hover:shadow-primary/25 duration-300 cursor-pointer flex flex-col h-full'
    >
        <div className='relative w-full h-48 overflow-hidden bg-gray-100 rounded-t-lg'>
            {/* decorative blurred background so the card area feels full while showing the whole image */}
            <img
                src={resolvedImage}
                alt=""
                aria-hidden="true"
                className='absolute inset-0 w-full h-full object-cover filter blur-sm scale-105'
            />
            {/* subtle overlay for contrast */}
            <div className='absolute inset-0 bg-black/20' aria-hidden='true' />
            <div className='relative z-10 w-full h-full flex items-center justify-center'>
                <img
                    src={resolvedImage}
                    alt={title}
                    loading="lazy"
                    className='max-h-full max-w-full object-contain object-center'
                />
            </div>
        </div>
        <div className='p-5 flex-1 flex flex-col'>
                        <span className='self-start mb-3 px-3 py-1 inline-block bg-primary/20 rounded-full text-primary text-xs'>
                                {category}
                        </span>
                        <h5 className='mb-2 font-medium text-gray-900'>{title}</h5>
                        <p className='mb-3 text-xs text-gray-600 flex-1'>
                            {(() => {
                                // Render plain text (strip HTML) and truncate to a sensible length
                                try {
                                    const tmp = document.createElement('div')
                                    tmp.innerHTML = description || ''
                                    const text = tmp.textContent || tmp.innerText || ''
                                    return text.length > 120 ? text.slice(0, 117) + '...' : text
                                } catch {
                                    // fallback
                                    const txt = (description || '').replace(/<[^>]*>/g, '')
                                    return txt.length > 120 ? txt.slice(0, 117) + '...' : txt
                                }
                            })()}
                        </p>
            <div className='mt-auto text-sm text-primary font-medium'>Read more →</div>
        </div>
    </div>
)
}

export default BlogCard
