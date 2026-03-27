import { blogIllustrations, blogIllustrationList } from '../assets/assets'

const FALLBACK_IMAGE = blogIllustrationList[0]

export function resolveBlogImage(value) {
  if (!value && value !== 0) return FALLBACK_IMAGE
  if (typeof value !== 'string') return value || FALLBACK_IMAGE
  if (value.startsWith('http') || value.startsWith('data:')) return value

  const normalized = value.replace(/^.*(blog_pic_\d+\.png)$/i, '/src/assets/$1')
  if (blogIllustrations[normalized]) return blogIllustrations[normalized]
  if (blogIllustrations[value]) return blogIllustrations[value]
  return FALLBACK_IMAGE
}

export const defaultBlogImage = FALLBACK_IMAGE
