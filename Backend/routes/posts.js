import { Router } from 'express'
import { trackPostView, trackPostRead } from '../controllers/postReadController.js'
import Post from '../models/Post.js'
import PostView from '../models/PostView.js'

const router = Router()

/** GET /api/posts - List posts (basic listing for completeness) */
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).lean()
    const formatted = posts.map((p) => ({
      ...p,
      id: p._id.toString(),
      author: p.author?.toString?.() ?? p.author,
      createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    }))
    res.json(formatted)
  } catch (err) {
    console.error('Error fetching posts:', err)
    res.status(500).json({ error: 'Failed to fetch posts' })
  }
})

/** POST /api/posts - Create a new post */
router.post('/', async (req, res) => {
  try {
    const { title, content, author } = req.body
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' })
    }
    if (!author) {
      return res.status(400).json({ error: 'Author is required' })
    }

    const post = await Post.create({
      title: title.trim(),
      content,
      author,
    })

    res.status(201).json(post.toJSON())
  } catch (err) {
    console.error('Error creating post:', err)
    res.status(500).json({ error: 'Failed to create post' })
  }
})

/** GET /api/posts/:id/stats - Aggregated view/read stats for a post */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params
    const post = await Post.findById(id)
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [views24h, reads24h, uniqueUsers24h, uniqueIps24h] = await Promise.all([
      PostView.countDocuments({ postId: id, createdAt: { $gte: windowStart } }),
      PostView.countDocuments({ postId: id, countedAsRead: true, createdAt: { $gte: windowStart } }),
      PostView.distinct('userId', { postId: id, createdAt: { $gte: windowStart }, userId: { $ne: null } }),
      PostView.distinct('ipAddress', { postId: id, createdAt: { $gte: windowStart } }),
    ])

    const totalViews = post.viewCount || 0
    const totalReads = post.readCount || 0

    res.json({
      postId: post._id.toString(),
      totalViews,
      totalReads,
      readThroughRate: totalViews > 0 ? totalReads / totalViews : 0,
      estimatedReadTime: post.estimatedReadTime,
      last24h: {
        views: views24h,
        reads: reads24h,
        uniqueUsers: uniqueUsers24h.length,
        uniqueIps: uniqueIps24h.length,
      },
    })
  } catch (err) {
    console.error('Error fetching post stats:', err)
    res.status(500).json({ error: 'Failed to fetch post stats' })
  }
})

/** GET /api/posts/:id/views - Recent view/read events for a post */
router.get('/:id/views', async (req, res) => {
  try {
    const { id } = req.params
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200)

    const post = await Post.findById(id).select('_id')
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const views = await PostView.find({ postId: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const formatted = views.map((v) => ({
      id: v._id.toString(),
      userId: v.userId?.toString?.() ?? v.userId,
      ipAddress: v.ipAddress,
      progressPercentage: v.progressPercentage,
      timeSpent: v.timeSpent,
      countedAsRead: v.countedAsRead,
      createdAt: v.createdAt?.toISOString?.() ?? v.createdAt,
    }))

    res.json(formatted)
  } catch (err) {
    console.error('Error fetching post views:', err)
    res.status(500).json({ error: 'Failed to fetch post views' })
  }
})

/** POST /api/posts/:id/view - Track a post view */
router.post('/:id/view', trackPostView)

/** POST /api/posts/:id/read - Track a post read */
router.post('/:id/read', trackPostRead)

export default router
