import { Router } from 'express'
import Work from '../models/Work.js'
import {
  createWorkComment,
  listWorkComments,
  toggleWorkClap,
  getWorkClapStatus,
  toggleSaveWork,
  listSavedWorks,
  toggleWorkCommentLike,
  trackWorkShare,
} from '../controllers/workSocialController.js'
import { trackWorkView, trackWorkRead } from '../controllers/workReadController.js'
import { publishPost } from '../controllers/workPublishController.js'
import { createWorkTip } from '../controllers/tipController.js'
import { translateWorkContent, stripHtml, APP_CODE_TO_FIELD } from '../services/translate.js'

const router = Router()

const TRANSLATABLE_LANGUAGES = ['en', 'tw', 'ga', 'ee']

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

/**
 * POST /api/works
 * Delegates to publishPost controller which handles validation, translation,
 * and persistence in one clean flow.
 */
router.post('/', publishPost)

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

/**
 * POST /api/works/:id/translate
 *
 * Returns translated title, excerpt, and body for a work.
 * Strategy (fastest first):
 *   1. Return from pre-computed Work.translations (stored at publish time) — zero AI cost.
 *   2. Fall back to a live Google Translate call if translations are missing (e.g. older works).
 */
router.post('/:id/translate', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id).lean()
    if (!work) return res.status(404).json({ error: 'Work not found' })

    const targetCode = (req.body.targetLanguage || req.body.target || '').toLowerCase()
    if (!TRANSLATABLE_LANGUAGES.includes(targetCode)) {
      return res.status(400).json({ error: 'Invalid target language. Use one of: en, tw, ga, ee' })
    }

    const sourceCode = (work.language || 'en').toLowerCase()

    // Same language – return original text immediately.
    if (sourceCode === targetCode) {
      return res.json({
        title:    work.title,
        excerpt:  work.excerpt || '',
        body:     stripHtml(work.body || ''),
        language: targetCode,
        cached:   true,
      })
    }

    // ── Try cached translations first ────────────────────────────────────────
    const targetField = APP_CODE_TO_FIELD[targetCode]
    const cached = work.translations

    const cachedTitle   = cached?.title?.[targetField]
    const cachedExcerpt = cached?.excerpt?.[targetField]
    const cachedBody    = cached?.body?.[targetField]

    if (cachedTitle || cachedBody) {
      return res.json({
        title:    cachedTitle   || work.title,
        excerpt:  cachedExcerpt || work.excerpt || '',
        body:     cachedBody    || stripHtml(work.body || ''),
        language: targetCode,
        cached:   true,
      })
    }

    // ── No cache — call Google Translate and back-fill the document ─────────
    const translated = await translateWorkContent(
      { title: work.title, excerpt: work.excerpt, body: work.body },
      sourceCode
    )

    // Persist the fresh translations so subsequent requests are free.
    await Work.findByIdAndUpdate(work._id, { $set: { translations: translated } })

    return res.json({
      title:    translated.title?.[targetField]   || work.title,
      excerpt:  translated.excerpt?.[targetField] || work.excerpt || '',
      body:     translated.body?.[targetField]    || stripHtml(work.body || ''),
      language: targetCode,
      cached:   false,
    })
  } catch (err) {
    console.error('[translate]', err.message)
    res.status(500).json({ error: err?.message || 'Translation failed.' })
  }
})

/** PUT /api/works/:id - Update a work */
router.put('/:id', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id)
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }
    const { title, category, genre, excerpt, body, thumbnailUrl, status, language } = req.body
    if (title !== undefined) work.title = title.trim()
    if (language !== undefined && ['en', 'tw', 'ga', 'ee'].includes(language)) work.language = language
    if (category !== undefined && ['short_story', 'poem', 'novel'].includes(category)) work.category = category
    if (genre !== undefined) work.genre = (genre || 'General').trim()
    if (excerpt !== undefined) work.excerpt = (excerpt || '').trim()
    if (body !== undefined) work.body = body.trim()
    if (thumbnailUrl !== undefined) work.thumbnailUrl = (thumbnailUrl || '').trim()
    if (req.body.topics !== undefined) {
      work.topics = normalizeTopics(req.body.topics)
    }
    if (status !== undefined && ['draft', 'pending', 'published'].includes(status)) work.status = status

    // If content changed, clear stale translations so they'll be regenerated on next read.
    const contentChanged = title !== undefined || body !== undefined || excerpt !== undefined || language !== undefined
    if (contentChanged) {
      work.translations = {}
    }

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

/** POST /api/works/:id/comments/:commentId/like - Toggle like on a comment */
router.post('/:id/comments/:commentId/like', toggleWorkCommentLike)

/** POST /api/works/:id/clap - Toggle clap for a work */
router.post('/:id/clap', toggleWorkClap)

/** GET /api/works/:id/clap - Get clap status for current user */
router.get('/:id/clap', getWorkClapStatus)

/** POST /api/works/:id/tip - Tip the work's author (Reader plan subscribers only, amount 0.01–9.99 GHC) */
router.post('/:id/tip', createWorkTip)

/** POST /api/works/:id/share - Record an external share (increments shareCount + feed signal) */
router.post('/:id/share', trackWorkShare)

/** POST /api/works/:id/save - Toggle save/unsave work */
router.post('/:id/save', toggleSaveWork)

/** GET /api/users/me/saved-works - List saved works for current user */
router.get('/me/saved', listSavedWorks)

export default router
