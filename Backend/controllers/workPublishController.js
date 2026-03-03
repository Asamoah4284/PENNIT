import Work from '../models/Work.js'
import { translateWorkContent } from '../services/translate.js'

/**
 * Normalise a topics array from raw request input.
 * Accepts an array or a comma-separated string.
 * Returns up to 5 unique, trimmed strings capped at 40 chars each.
 *
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeTopics(raw) {
  if (!raw) return []
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
    ? raw.split(',').map((t) => t.trim())
    : []

  return Array.from(
    new Set(
      list
        .map((t) => String(t).trim())
        .filter(Boolean)
        .map((t) => (t.length > 40 ? t.slice(0, 40) : t))
    )
  ).slice(0, 5)
}

/**
 * POST /api/works
 *
 * Create and optionally publish a new work.
 * When status is not 'draft', content is automatically translated into Twi, Ga,
 * and Ewe via a single OpenAI call and persisted in Work.translations.
 * Translation is intentionally fire-and-forget on failure so publishing never
 * blocks — the translations object will simply be empty and can be populated
 * later via the translate endpoint.
 *
 * @type {import('express').RequestHandler}
 */
export async function publishPost(req, res) {
  try {
    const {
      title,
      authorId,
      category,
      genre,
      excerpt,
      body,
      thumbnailUrl,
      status,
      language,
    } = req.body

    // ── Validation ──────────────────────────────────────────────────────────
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' })
    }
    if (!authorId) {
      return res.status(400).json({ error: 'Author is required.' })
    }
    if (!category || !['short_story', 'poem', 'novel'].includes(category)) {
      return res.status(400).json({
        error: 'Valid category is required (short_story, poem, novel).',
      })
    }

    const isDraft = status === 'draft'
    const earlyAccessHours = parseInt(process.env.EARLY_ACCESS_HOURS || '48', 10)

    if (!isDraft && (!body || typeof body !== 'string' || !body.trim())) {
      return res.status(400).json({ error: 'Story body is required to publish.' })
    }

    // ── Normalise inputs ─────────────────────────────────────────────────────
    const topics   = normalizeTopics(req.body.topics)
    const lang     = ['en', 'tw', 'ga', 'ee'].includes(language) ? language : 'en'
    const workStatus = isDraft ? 'draft' : 'pending'

    // ── Build base document ──────────────────────────────────────────────────
    const doc = {
      title:        title.trim(),
      authorId,
      category,
      genre:        (genre || 'General').trim(),
      excerpt:      (excerpt || '').trim(),
      body:         typeof body === 'string' ? body.trim() : '',
      readCount:    0,
      thumbnailUrl: (thumbnailUrl || '').trim(),
      status:           workStatus,
      topics,
      language:         lang,
      translations:     {},
      earlyAccessUntil: isDraft
        ? null
        : new Date(Date.now() + earlyAccessHours * 60 * 60 * 1000),
    }

    // ── Translate on publish (not on draft) ──────────────────────────────────
    if (!isDraft) {
      try {
        const translated = await translateWorkContent(
          { title: doc.title, excerpt: doc.excerpt, body: doc.body },
          lang
        )
        doc.translations = translated
      } catch (translationErr) {
        // Log but do not block publishing — translations can be generated later.
        console.error('[publishPost] Translation failed:', translationErr.message)
      }
    }

    // ── Persist ──────────────────────────────────────────────────────────────
    const work = await Work.create(doc)

    const populated = await Work.findById(work._id)
      .populate('authorId', 'penName avatarUrl')
      .lean()

    const w = populated ?? work.toObject?.() ?? work

    return res.status(201).json({
      ...w,
      id:       w._id.toString(),
      authorId: w.authorId?._id?.toString() ?? w.authorId?.toString(),
      author:   w.authorId
        ? {
            id:        w.authorId._id.toString(),
            penName:   w.authorId.penName,
            avatarUrl: w.authorId.avatarUrl,
          }
        : null,
      createdAt: w.createdAt?.toISOString?.(),
    })
  } catch (err) {
    console.error('[publishPost] Error:', err)
    return res.status(500).json({ error: 'Failed to create story.' })
  }
}
