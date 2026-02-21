import { Router } from 'express'
import Work from '../models/Work.js'
import {
  createWorkComment,
  listWorkComments,
  toggleWorkClap,
  getWorkClapStatus,
  toggleSaveWork,
  listSavedWorks,
} from '../controllers/workSocialController.js'
import { trackWorkView, trackWorkRead } from '../controllers/workReadController.js'

const router = Router()

/** Format work for JSON: safe when authorId is populated object or raw ObjectId. */
function formatWork(w) {
  const authorId = w.authorId && typeof w.authorId === 'object' && w.authorId._id
    ? w.authorId._id.toString()
    : (w.authorId && typeof w.authorId.toString === 'function' ? w.authorId.toString() : (w.authorId ? String(w.authorId) : null))
  const author = w.authorId && typeof w.authorId === 'object' && w.authorId.penName != null
    ? { id: authorId, penName: w.authorId.penName, avatarUrl: w.authorId.avatarUrl ?? '' }
    : null
  return {
    ...w,
    id: w._id.toString(),
    authorId,
    author,
    createdAt: w.createdAt?.toISOString?.() ?? w.createdAt,
  }
}

/** GET /api/works - List all works (public: published only) */
router.get('/', async (req, res) => {
  try {
    const works = await Work.find({ status: 'published' })
      .populate('authorId', 'penName avatarUrl')
      .sort({ createdAt: -1 })
      .lean()
    const formatted = works.map(formatWork)
    res.json(formatted)
  } catch (err) {
    console.error('Error fetching works:', err)
    res.status(500).json({ error: 'Failed to fetch works' })
  }
})

/** Normalise topics array from body (strings only, trimmed, max 5). */
function normalizeTopics(raw) {
  if (!raw) return []
  let list = []
  if (Array.isArray(raw)) {
    list = raw
  } else if (typeof raw === 'string') {
    list = raw.split(',').map((t) => t.trim())
  } else {
    return []
  }
  const unique = Array.from(
    new Set(
      list
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.length > 40 ? t.slice(0, 40) : t))
    )
  )
  return unique.slice(0, 5)
}

/** POST /api/works - Create a new work */
router.post('/', async (req, res) => {
  try {
    const { title, authorId, category, genre, excerpt, body, thumbnailUrl, status } = req.body
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (!authorId) {
      return res.status(400).json({ error: 'Author is required' })
    }
    if (!category || !['short_story', 'poem', 'novel'].includes(category)) {
      return res.status(400).json({ error: 'Valid category is required (short_story, poem, novel)' })
    }
    const isDraft = status === 'draft'
    if (!isDraft && (!body || typeof body !== 'string')) {
      return res.status(400).json({ error: 'Story body is required to publish' })
    }
    const topics = normalizeTopics(req.body.topics)

    const work = await Work.create({
      title: title.trim(),
      authorId,
      category,
      genre: (genre || 'General').trim(),
      excerpt: (excerpt || '').trim(),
      body: typeof body === 'string' ? body.trim() : '',
      readCount: 0,
      thumbnailUrl: (thumbnailUrl || '').trim(),
      status: status === 'draft' ? 'draft' : 'pending',
      topics,
    })
    const populated = await Work.findById(work._id)
      .populate('authorId', 'penName avatarUrl')
      .lean()
    const w = populated || work.toObject?.() || work
    res.status(201).json({
      ...w,
      id: w._id.toString(),
      authorId: w.authorId?._id?.toString() ?? w.authorId?.toString(),
      author: w.authorId ? { id: w.authorId._id.toString(), penName: w.authorId.penName, avatarUrl: w.authorId.avatarUrl } : null,
      createdAt: w.createdAt?.toISOString?.(),
    })
  } catch (err) {
    console.error('Error creating work:', err)
    res.status(500).json({ error: 'Failed to create story' })
  }
})

/** GET /api/works/:id - Get single work by ID */
router.get('/:id', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id)
      .populate('authorId', 'penName avatarUrl')
      .lean()
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }
    res.json(formatWork(work))
  } catch (err) {
    console.error('Error fetching work:', err)
    res.status(500).json({ error: 'Failed to fetch work' })
  }
})

/** PUT /api/works/:id - Update a work */
router.put('/:id', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id)
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }
    const { title, category, genre, excerpt, body, thumbnailUrl, status } = req.body
    if (title !== undefined) work.title = title.trim()
    if (category !== undefined && ['short_story', 'poem', 'novel'].includes(category)) work.category = category
    if (genre !== undefined) work.genre = (genre || 'General').trim()
    if (excerpt !== undefined) work.excerpt = (excerpt || '').trim()
    if (body !== undefined) work.body = body.trim()
    if (thumbnailUrl !== undefined) work.thumbnailUrl = (thumbnailUrl || '').trim()
    if (req.body.topics !== undefined) {
      work.topics = normalizeTopics(req.body.topics)
    }
    if (status !== undefined && ['draft', 'pending', 'published'].includes(status)) work.status = status
    await work.save()
    const populated = await Work.findById(work._id)
      .populate('authorId', 'penName avatarUrl')
      .lean()
    const w = populated || work.toObject?.() || work
    res.json(formatWork(w))
  } catch (err) {
    console.error('Error updating work:', err)
    res.status(500).json({ error: 'Failed to update story' })
  }
})

/** DELETE /api/works/:id - Delete a work */
router.delete('/:id', async (req, res) => {
  try {
    const work = await Work.findByIdAndDelete(req.params.id)
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }
    res.status(204).send()
  } catch (err) {
    console.error('Error deleting work:', err)
    res.status(500).json({ error: 'Failed to delete story' })
  }
})

/** POST /api/works/:id/view - Track work view (for read dedup). */
router.post('/:id/view', trackWorkView)

/** POST /api/works/:id/read - Track work read (progress/time); increments readCount when threshold met, 24h dedup. */
router.post('/:id/read', trackWorkRead)

/** POST /api/works/:id/comments - Create a comment on a work */
router.post('/:id/comments', createWorkComment)

/** GET /api/works/:id/comments - List comments for a work */
router.get('/:id/comments', listWorkComments)

/** POST /api/works/:id/clap - Toggle clap for a work */
router.post('/:id/clap', toggleWorkClap)

/** GET /api/works/:id/clap - Get clap status for current user */
router.get('/:id/clap', getWorkClapStatus)

/** POST /api/works/:id/save - Toggle save/unsave work */
router.post('/:id/save', toggleSaveWork)

/** GET /api/users/me/saved-works - List saved works for current user */
router.get('/me/saved', listSavedWorks)

export default router
