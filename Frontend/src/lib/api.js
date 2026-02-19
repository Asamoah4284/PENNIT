/** Backend base URL. Production: always backend; dev: empty = proxy to localhost. */
const raw = (import.meta.env.VITE_API_URL || '').trim()
const url = import.meta.env.PROD && !raw ? 'https://api.pennit.io' : raw
export const API_BASE = url.replace(/\/$/, '')

/** Fetch public config (e.g. monetizationEnabled). Used to gate subscription/earnings UI. */
export async function getConfig() {
  const res = await fetch(`${API_BASE}/api/config`)
  return handleResponse(res)
}

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

/** Fetch an author by ID with their works. Optional userId sends x-user-id for _following in response. */
export async function getAuthor(id, userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/authors/${id}`, { headers })
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
export async function createWork({ title, authorId, category, genre, excerpt, body, thumbnailUrl, topics, status = 'published' }) {
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
      topics: topics && Array.isArray(topics) ? topics : topics,
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

/** --- Social APIs: comments, claps, saves, follows, read tracking --- */

export async function createWorkComment(workId, { content, userId, parentId }) {
  const res = await fetch(`${API_BASE}/api/works/${workId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, userId, parentId }),
  })
  return handleResponse(res)
}

export async function getWorkComments(workId, { limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const res = await fetch(`${API_BASE}/api/works/${workId}/comments?${params.toString()}`)
  return handleResponse(res)
}

export async function toggleWorkClap(workId, userId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/${workId}/clap`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId }),
  })
  return handleResponse(res)
}

export async function getWorkClapStatus(workId, userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/${workId}/clap`, { headers })
  return handleResponse(res)
}

export async function toggleSaveWork(workId, userId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/${workId}/save`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId }),
  })
  return handleResponse(res)
}

export async function getSavedWorks(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/me/saved`, { headers })
  return handleResponse(res)
}

export async function toggleFollowAuthor(authorId, userId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/authors/${authorId}/follow`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId }),
  })
  return handleResponse(res)
}

export async function trackPostView(postId) {
  const res = await fetch(`${API_BASE}/api/posts/${postId}/view`, {
    method: 'POST',
  })
  return handleResponse(res)
}

export async function trackPostRead(postId, { progressPercentage, timeSpent }) {
  const res = await fetch(`${API_BASE}/api/posts/${postId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressPercentage, timeSpent }),
  })
  return handleResponse(res)
}

/** Track work view (call when opening a work). */
export async function trackWorkView(workId, userId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/${workId}/view`, {
    method: 'POST',
    headers,
  })
  return handleResponse(res)
}

/** Track work read (progress/time). Call on leave or interval; counts as read when progress >= 60% and time >= 30s, 24h dedup. */
export async function trackWorkRead(workId, { progressPercentage, timeSpent }, userId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/${workId}/read`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ progressPercentage, timeSpent }),
  })
  return handleResponse(res)
}

/** --- Subscriptions (monetization) --- */

export async function getSubscriptionPlans() {
  const res = await fetch(`${API_BASE}/api/subscriptions/plans`)
  return handleResponse(res)
}

export async function getMySubscription(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/subscriptions/me`, { headers })
  return handleResponse(res)
}

export async function createSubscriptionCheckout(userId, { planId, returnUrl, cancelUrl }) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/subscriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ planId, returnUrl, cancelUrl }),
  })
  return handleResponse(res)
}

export async function cancelSubscription(userId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/subscriptions/cancel`, {
    method: 'POST',
    headers,
  })
  return handleResponse(res)
}

/** GET /api/earnings/estimated - Writer estimated earnings (this month + history). */
export async function getEstimatedEarnings(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/earnings/estimated`, { headers })
  return handleResponse(res)
}

/** GET /api/earnings/payout-method - Writer payout method (bank or mobile money). */
export async function getPayoutMethod(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/earnings/payout-method`, { headers })
  return handleResponse(res)
}

/** PUT /api/earnings/payout-method - Set payout method. */
export async function setPayoutMethod(userId, { type, bankCode, accountNumber, accountName, mobileMoneyNumber, mobileMoneyProvider }) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/earnings/payout-method`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ type, bankCode, accountNumber, accountName, mobileMoneyNumber, mobileMoneyProvider }),
  })
  return handleResponse(res)
}
