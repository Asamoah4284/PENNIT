import { Router } from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Work from '../models/Work.js'
import AuthorFollow from '../models/AuthorFollow.js'
import WorkRead from '../models/WorkRead.js'

const router = Router()

/**
 * GET /api/writers/me/stats
 * Returns stats for the authenticated writer identified by x-user-id header.
 * Includes totals, daily/monthly read trends, content breakdown, and top works.
 */
router.get('/me/stats', async (req, res) => {
  try {
    const rawUserId = req.headers['x-user-id']
    if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const user = await User.findById(rawUserId).lean()
    if (!user || user.role !== 'writer' || !user.authorId) {
      return res.status(403).json({ error: 'Writer account not found' })
    }

    const authorId = user.authorId

    // ── All works for this author ──
    const works = await Work.find({ authorId }).lean()
    const workIds = works.map((w) => w._id)

    // ── Totals directly from Work documents ──
    const totalStories = works.filter((w) => w.status === 'published').length
    const totalDrafts = works.filter((w) => w.status === 'draft').length
    const totalReads = works.reduce((sum, w) => sum + (w.readCount || 0), 0)
    const totalClaps = works.reduce((sum, w) => sum + (w.clapCount || 0), 0)
    const totalComments = works.reduce((sum, w) => sum + (w.commentCount || 0), 0)
    const totalSaves = works.reduce((sum, w) => sum + (w.saveCount || 0), 0)

    // ── Followers count ──
    const totalFollowers = await AuthorFollow.countDocuments({ authorId })

    // ── Daily reads — last 7 days (from WorkRead) ──
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const dailyReadDocs = workIds.length
      ? await WorkRead.aggregate([
          {
            $match: {
              workId: { $in: workIds },
              countedAsRead: true,
              createdAt: { $gte: sevenDaysAgo },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
      : []

    // Fill in all 7 days, even if zero
    const dailyReads = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const match = dailyReadDocs.find((r) => r._id === dateStr)
      dailyReads.push({
        date: dateStr,
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        reads: match ? match.count : 0,
      })
    }

    // ── Monthly reads — last 30 days ──
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const monthlyReadDocs = workIds.length
      ? await WorkRead.aggregate([
          {
            $match: {
              workId: { $in: workIds },
              countedAsRead: true,
              createdAt: { $gte: thirtyDaysAgo },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
      : []

    const monthlyReads = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const match = monthlyReadDocs.find((r) => r._id === dateStr)
      monthlyReads.push({ date: dateStr, reads: match ? match.count : 0 })
    }

    // ── Content breakdown by category ──
    const categoryMap = {}
    for (const w of works) {
      if (w.status === 'published') {
        categoryMap[w.category] = (categoryMap[w.category] || 0) + 1
      }
    }
    const contentBreakdown = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      label:
        category === 'short_story'
          ? 'Short Stories'
          : category === 'poem'
          ? 'Poems'
          : 'Novels',
      count,
    }))

    // ── Top 5 works by reads ──
    const topWorks = works
      .filter((w) => w.status === 'published')
      .sort((a, b) => (b.readCount || 0) - (a.readCount || 0))
      .slice(0, 5)
      .map((w) => ({
        id: w._id.toString(),
        title: w.title,
        category: w.category,
        reads: w.readCount || 0,
        claps: w.clapCount || 0,
        comments: w.commentCount || 0,
        saves: w.saveCount || 0,
      }))

    res.json({
      totalReads,
      totalStories,
      totalDrafts,
      totalFollowers,
      totalClaps,
      totalComments,
      totalSaves,
      dailyReads,
      monthlyReads,
      contentBreakdown,
      topWorks,
    })
  } catch (err) {
    console.error('[writerStats] Error:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

export default router
