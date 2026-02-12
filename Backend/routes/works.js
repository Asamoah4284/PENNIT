import { Router } from 'express'
import Work from '../models/Work.js'

const router = Router()

/** GET /api/works - List all works */
router.get('/', async (req, res) => {
  try {
    const works = await Work.find()
      .populate('authorId', 'penName avatarUrl')
      .sort({ createdAt: -1 })
      .lean()
    const formatted = works.map((w) => ({
      ...w,
      id: w._id.toString(),
      authorId: w.authorId?._id?.toString() ?? w.authorId?.toString(),
      author: w.authorId ? { id: w.authorId._id.toString(), penName: w.authorId.penName, avatarUrl: w.authorId.avatarUrl } : null,
      createdAt: w.createdAt?.toISOString(),
    }))
    res.json(formatted)
  } catch (err) {
    console.error('Error fetching works:', err)
    res.status(500).json({ error: 'Failed to fetch works' })
  }
})

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
    const work = await Work.create({
      title: title.trim(),
      authorId,
      category,
      genre: (genre || 'General').trim(),
      excerpt: (excerpt || '').trim(),
      body: typeof body === 'string' ? body.trim() : '',
      readCount: 0,
      thumbnailUrl: (thumbnailUrl || '').trim(),
      status: status === 'draft' ? 'draft' : 'published',
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
    res.json({
      ...work,
      id: work._id.toString(),
      authorId: work.authorId?._id?.toString() ?? work.authorId?.toString(),
      author: work.authorId ? { id: work.authorId._id.toString(), penName: work.authorId.penName, avatarUrl: work.authorId.avatarUrl } : null,
      createdAt: work.createdAt?.toISOString(),
    })
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
    if (status !== undefined && ['draft', 'published'].includes(status)) work.status = status
    await work.save()
    const populated = await Work.findById(work._id)
      .populate('authorId', 'penName avatarUrl')
      .lean()
    const w = populated || work.toObject?.() || work
    res.json({
      ...w,
      id: w._id.toString(),
      authorId: w.authorId?._id?.toString() ?? w.authorId?.toString(),
      author: w.authorId ? { id: w.authorId._id.toString(), penName: w.authorId.penName, avatarUrl: w.authorId.avatarUrl } : null,
      createdAt: w.createdAt?.toISOString?.(),
    })
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

export default router
