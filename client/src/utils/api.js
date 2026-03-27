const rawBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export const API_BASE = rawBase

export function apiUrl(path = '') {
  if (!path) return API_BASE || ''
  if (/^https?:\/\//i.test(path)) return path
  if (!API_BASE) return path
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

export function apiFetch(path, options) {
  return fetch(apiUrl(path), options)
}
