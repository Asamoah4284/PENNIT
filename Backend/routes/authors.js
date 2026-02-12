import { Router } from 'express'
import Author from '../models/Author.js'
import Work from '../models/Work.js'

const router = Router()

/** GET /api/authors/:id - Get author by ID with their works */
router.get('/:id', async (req, res) => {
  try {
    const author = await Author.findById(req.params.id).lean()
    if (!author) {
      return res.status(404).json({ error: 'Author not found' })
    }
    const works = await Work.find({ authorId: author._id })
      .sort({ createdAt: -1 })
      .lean()
    const formattedWorks = works.map((w) => ({
      ...w,
      id: w._id.toString(),
      authorId: w.authorId?.toString(),
      createdAt: w.createdAt?.toISOString(),
    }))
    res.json({
      ...author,
      id: author._id.toString(),
      works: formattedWorks,
    })
  } catch (err) {
    console.error('Error fetching author:', err)
    res.status(500).json({ error: 'Failed to fetch author' })
  }
})

export default router
