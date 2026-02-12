/** Backend base URL. Production: always backend; dev: empty = proxy to localhost. */
const raw = (import.meta.env.VITE_API_URL || '').trim()
const url = import.meta.env.PROD && !raw ? 'https://pennit.onrender.com' : raw
export const API_BASE = url.replace(/\/$/, '')

/** Resolve asset URL (e.g. thumbnail, avatar). Relative paths like /uploads/... get API_BASE prepended. */
export function getAssetUrl(url) {
  if (!url || typeof url !== 'string') return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = API_BASE || ''
  return base ? `${base}${url.startsWith('/') ? url : `/${url}`}` : url
}

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

/** Fetch all works from the API */
export async function getWorks() {
  const res = await fetch(`${API_BASE}/api/works`)
  return handleResponse(res)
}

/** Fetch a single work by ID */
export async function getWork(id) {
  const res = await fetch(`${API_BASE}/api/works/${id}`)
  return handleResponse(res)
}

/** Fetch an author by ID with their works */
export async function getAuthor(id) {
  const res = await fetch(`${API_BASE}/api/authors/${id}`)
  return handleResponse(res)
}

/** Create a new account (signup) */
export async function signup({ email, name, phone, password, role, penName }) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, phone, password, role, penName }),
  })
  return handleResponse(res)
}

/** Sign in with email and password */
export async function login({ email, password }) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(res)
}

/** Upload an image file (e.g. thumbnail). Returns { url }. */
export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}

/** Create a new work (story) - for writers. status: 'draft' | 'published' (default 'published') */
export async function createWork({ title, authorId, category, genre, excerpt, body, thumbnailUrl, status = 'published' }) {
  const res = await fetch(`${API_BASE}/api/works`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      authorId,
      category: category || 'short_story',
      genre: genre || 'General',
      excerpt: excerpt || '',
      body: body || '',
      thumbnailUrl: thumbnailUrl || '',
      status: status === 'draft' ? 'draft' : 'published',
    }),
  })
  return handleResponse(res)
}

/** Update a work - for writers. status: 'draft' | 'published' to change visibility */
export async function updateWork(id, { title, category, genre, excerpt, body, thumbnailUrl, status }) {
  const payload = { title, category, genre, excerpt, body, thumbnailUrl }
  if (status !== undefined) payload.status = status
  const res = await fetch(`${API_BASE}/api/works/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(res)
}

/** Delete a work - for writers */
export async function deleteWork(id) {
  const res = await fetch(`${API_BASE}/api/works/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  if (res.status !== 204) return res.json().catch(() => ({}))
}
