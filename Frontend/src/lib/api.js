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

/** Fetch all authors from the API */
export async function getAuthors() {
  const res = await fetch(`${API_BASE}/api/authors`)
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

/** Upload an image file (e.g. thumbnail, profile). Returns { url }. */
export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}

/** GET /api/users/me - Current user profile (name, bio, avatarUrl; writers get author merged). */
export async function getMe(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/users/me`, { headers })
  return handleResponse(res)
}

/** PATCH /api/users/me - Update profile (name, bio, avatarUrl, penName, or email with password for verification). */
export async function updateProfile(userId, payload) {
  const res = await fetch(`${API_BASE}/api/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(payload),
  })
  return handleResponse(res)
}

/** POST /api/users/switch-role - Switch current user between reader and writer. Requires password for verification. */
export async function switchRole(userId, password) {
  const res = await fetch(`${API_BASE}/api/users/switch-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify({ password }),
  })
  return handleResponse(res)
}

/** POST /api/auth/change-password - Change password (currentPassword, newPassword). */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const res = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  return handleResponse(res)
}

/** GET /api/users/me/following - List authors the current user follows. */
export async function getMyFollowing(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/users/me/following`, { headers })
  return handleResponse(res)
}

/** Create a new work (story) - for writers. status: 'draft' | 'published' (default 'published'). language: en, tw, ga, ee */
export async function createWork({ title, authorId, category, genre, excerpt, body, thumbnailUrl, topics, status = 'published', language = 'en' }) {
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
      language: ['en', 'tw', 'ga', 'ee'].includes(language) ? language : 'en',
    }),
  })
  return handleResponse(res)
}

/** Update a work - for writers. status: 'draft' | 'published' to change visibility. language: en, tw, ga, ee */
export async function updateWork(id, { title, category, genre, excerpt, body, thumbnailUrl, status, language }) {
  const payload = { title, category, genre, excerpt, body, thumbnailUrl }
  if (status !== undefined) payload.status = status
  if (language !== undefined && ['en', 'tw', 'ga', 'ee'].includes(language)) payload.language = language
  const res = await fetch(`${API_BASE}/api/works/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(res)
}

/** Translate a work's title, excerpt, and body to target language (en, tw, ga, ee). Returns { title, excerpt, body, language }. */
export async function translateWork(workId, targetLanguage) {
  const res = await fetch(`${API_BASE}/api/works/${workId}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetLanguage }),
  })
  return handleResponse(res)
}

/** Translate writer in-progress draft content to target language (en, tw, ga, ee). */
export async function translateDraftContent({ title, excerpt, body, sourceLanguage, targetLanguage }) {
  const res = await fetch(`${API_BASE}/api/works/translate-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, excerpt, body, sourceLanguage, targetLanguage }),
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

export async function getWorkComments(workId, { limit = 50, offset = 0 } = {}, userId) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/${workId}/comments?${params.toString()}`, { headers })
  return handleResponse(res)
}

export async function toggleWorkCommentLike(workId, commentId, userId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/${workId}/comments/${commentId}/like`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId }),
  })
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

/**
 * Track work read (progress/time).
 * Counts as read when progress >= 60% and timeSpent >= 30s, with 24h dedup.
 * Pass `language` to record which language the user was reading in (used for feed personalisation).
 */
export async function trackWorkRead(workId, { progressPercentage, timeSpent, language }, userId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/${workId}/read`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ progressPercentage, timeSpent, ...(language ? { language } : {}) }),
  })
  return handleResponse(res)
}

/**
 * Record that a user shared a work externally.
 * Increments the work's shareCount and updates feed interaction signals.
 */
export async function trackWorkShare(workId, userId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/${workId}/share`, {
    method: 'POST',
    headers,
  })
  return handleResponse(res)
}

/**
 * GET /api/feed — personalised feed for the current user.
 * Falls back to popularity + recency ranking for anonymous users.
 *
 * @param {string|null} userId   - optional; enables personalisation
 * @param {{ limit?: number, page?: number }} opts
 * @returns {{ works: object[], pagination: object, meta: object }}
 */
export async function getFeed(userId, { limit = 20, page = 1 } = {}) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const params = new URLSearchParams({ limit: String(limit), page: String(page) })
  const res = await fetch(`${API_BASE}/api/feed?${params.toString()}`, { headers })
  return handleResponse(res)
}

/**
 * GET /api/feed/preferences — returns the current user's preference profile.
 * Requires userId.
 */
export async function getMyFeedPreferences(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/feed/preferences`, { headers })
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

/** POST /api/works/:id/tip — Tip the work's author (Reader plan only). amountGhc: 0.01–9.99 */
export async function tipWork(workId, userId, amountGhc) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/works/${workId}/tip`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amountGhc: Number(amountGhc) }),
  })
  return handleResponse(res)
}

/** GET /api/writers/me/stats - Writer stats: reads, claps, followers, daily/monthly trends, top works. */
export async function getWriterStats(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/writers/me/stats`, { headers })
  return handleResponse(res)
}

/** GET /api/readers/me/stats - Reader reading progress: works read, time spent, saved count, trends, recent reads. */
export async function getReaderStats(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/readers/me/stats`, { headers })
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

/** --- Playlist APIs (subscriber-only) --- */

/** GET /api/playlists/me — list the current user's playlists. */
export async function getMyPlaylists(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/playlists/me`, { headers })
  return handleResponse(res)
}

/** GET /api/playlists/:id/works — fetch a playlist with its populated work documents. */
export async function getPlaylistWorks(playlistId, userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/works`, { headers })
  return handleResponse(res)
}

/** POST /api/playlists — create a new playlist. Requires active subscription. */
export async function createPlaylist(userId, { name, description = '', isPrivate = true }) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/playlists`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, description, isPrivate }),
  })
  return handleResponse(res)
}

/** PUT /api/playlists/:id — update a playlist's name/description/isPrivate. */
export async function updatePlaylist(userId, playlistId, updates) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  })
  return handleResponse(res)
}

/** DELETE /api/playlists/:id — delete a playlist. */
export async function deletePlaylist(userId, playlistId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res)
}

/** POST /api/playlists/:id/works — add a work to a playlist. */
export async function addWorkToPlaylist(userId, playlistId, workId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/works`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ workId }),
  })
  return handleResponse(res)
}

/** DELETE /api/playlists/:id/works/:workId — remove a work from a playlist. */
export async function removeWorkFromPlaylist(userId, playlistId, workId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/works/${workId}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res)
}

/** --- Admin APIs --- */

/** GET /api/victor-access-control/activity - Admin activity log (live). */
export async function getAdminActivity(userId, params = {}) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const q = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}/api/victor-access-control/activity${q ? `?${q}` : ''}`, { headers })
  return handleResponse(res)
}

/** GET /api/victor-access-control/config - Admin get app config (e.g. monetizationEnabled). */
export async function getAdminConfig(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/victor-access-control/config`, { headers })
  return handleResponse(res)
}

/** PATCH /api/victor-access-control/config - Admin update app config. Body: { monetizationEnabled: boolean }. */
export async function updateAdminConfig(userId, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/victor-access-control/config`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

/** GET /api/victor-access-control/stats - Admin dashboard stats. */
export async function getAdminStats(userId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/victor-access-control/stats`, { headers })
  return handleResponse(res)
}

/** GET /api/victor-access-control/users - Admin list users (paginated). Returns { users, total, page, limit, totalPages }. */
export async function getAdminUsers(userId, { page = 1, limit = 10 } = {}) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  const q = params.toString()
  const res = await fetch(`${API_BASE}/api/victor-access-control/users${q ? `?${q}` : ''}`, { headers })
  return handleResponse(res)
}

/** POST /api/victor-access-control/users - Admin create a new user (reader, writer, or admin). */
export async function createAdminUser(adminUserId, { email, name, password, role }) {
  const headers = { 'Content-Type': 'application/json' }
  if (adminUserId) headers['x-user-id'] = adminUserId
  const res = await fetch(`${API_BASE}/api/victor-access-control/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, name, password, role: role || 'reader' }),
  })
  return handleResponse(res)
}

/** PATCH /api/victor-access-control/users/:id - Admin update user role. */
export async function updateAdminUserRole(userId, targetUserId, role) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/victor-access-control/users/${targetUserId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ role }),
  })
  return handleResponse(res)
}

/** DELETE /api/victor-access-control/users/:id - Admin delete a user. */
export async function deleteAdminUser(userId, targetUserId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/victor-access-control/users/${targetUserId}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res)
}

/** GET /api/victor-access-control/works - Admin list works (paginated). Returns { works, total, page, limit, totalPages }. */
export async function getAdminWorks(userId, { page = 1, limit = 10 } = {}) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  const q = params.toString()
  const res = await fetch(`${API_BASE}/api/victor-access-control/works${q ? `?${q}` : ''}`, { headers })
  return handleResponse(res)
}

/** DELETE /api/victor-access-control/works/:id - Admin delete work. */
export async function deleteAdminWork(userId, workId) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/victor-access-control/works/${workId}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res)
}

/** PATCH /api/victor-access-control/works/:id/approve - Approve a pending work. */
export async function approveAdminWork(userId, workId) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/victor-access-control/works/${workId}/approve`, {
    method: 'PATCH',
    headers,
  })
  return handleResponse(res)
}

/** PATCH /api/victor-access-control/works/:id - Admin edit a work. */
export async function editAdminWork(userId, workId, updates) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['x-user-id'] = userId
  const res = await fetch(`${API_BASE}/api/victor-access-control/works/${workId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  })
  return handleResponse(res)
}

/** GET /api/victor-access-control/subscription-payments - Admin list subscription payments (paginated). */
export async function getAdminSubscriptionPayments(userId, { page = 1, limit = 10 } = {}) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const q = new URLSearchParams({ page, limit }).toString()
  const res = await fetch(`${API_BASE}/api/victor-access-control/subscription-payments?${q}`, { headers })
  return handleResponse(res)
}

/** GET /api/victor-access-control/payouts - Admin list payouts (paginated). */
export async function getAdminPayouts(userId, { page = 1, limit = 10 } = {}) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const q = new URLSearchParams({ page, limit }).toString()
  const res = await fetch(`${API_BASE}/api/victor-access-control/payouts?${q}`, { headers })
  return handleResponse(res)
}

/** GET /api/victor-access-control/comments - Admin list comments (paginated). */
export async function getAdminComments(userId, { page = 1, limit = 10 } = {}) {
  const headers = {}
  if (userId) headers['x-user-id'] = userId
  const q = new URLSearchParams({ page, limit }).toString()
  const res = await fetch(`${API_BASE}/api/victor-access-control/comments?${q}`, { headers })
  return handleResponse(res)
}
