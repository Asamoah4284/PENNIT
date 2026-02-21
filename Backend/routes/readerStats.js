import { Router } from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Work from '../models/Work.js'
import WorkRead from '../models/WorkRead.js'
import SavedWork from '../models/SavedWork.js'
import Author from '../models/Author.js'

const router = Router()

/**
 * GET /api/readers/me/stats
 * Returns reading progress for the authenticated user (x-user-id): works read, saved count, trends, recent reads.
 */
router.get('/me/stats', async (req, res) => {
  try {
    const rawUserId = req.headers['x-user-id']
    if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const userId = new mongoose.Types.ObjectId(rawUserId)

    // Total distinct works read (countedAsRead = true)
    const worksReadCount = await WorkRead.distinct('workId', {
      userId,
      countedAsRead: true,
    }).then((ids) => ids.length)

    // Total time spent (seconds) from all WorkRead records for this user
    const timeSpentResult = await WorkRead.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalSeconds: { $sum: '$timeSpent' } } },
    ])
    const totalTimeSpentSeconds = timeSpentResult[0]?.totalSeconds ?? 0

    // Saved works count
    const savedCount = await SavedWork.countDocuments({ userId })

    // Daily reads — last 7 days (count of WorkRead with countedAsRead true, grouped by date)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const dailyReadDocs = await WorkRead.aggregate([
      {
        $match: {
          userId,
          countedAsRead: true,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

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

    // Last 30 days trend (same idea)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const monthlyReadDocs = await WorkRead.aggregate([
      {
        $match: {
          userId,
          countedAsRead: true,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    const monthlyReads = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const match = monthlyReadDocs.find((r) => r._id === dateStr)
      monthlyReads.push({ date: dateStr, reads: match ? match.count : 0 })
    }

    // Recent reads: last 20 "read" events with work + author info
    const recentReadEvents = await WorkRead.find({
      userId,
      countedAsRead: true,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: 'workId',
        select: 'title excerpt thumbnailUrl authorId category',
        populate: { path: 'authorId', select: 'penName' },
      })
      .lean()

    const seen = new Set()
    const recentReads = []
    for (const ev of recentReadEvents) {
      const work = ev.workId
      if (!work || !work._id) continue
      const id = work._id.toString()
      if (seen.has(id)) continue
      seen.add(id)
      recentReads.push({
        id,
        title: work.title,
        excerpt: work.excerpt || '',
        thumbnailUrl: work.thumbnailUrl || '',
        category: work.category,
        authorName: work.authorId?.penName || 'Unknown',
        readAt: ev.createdAt,
      })
      if (recentReads.length >= 15) break
    }

    res.json({
      totalWorksRead: worksReadCount,
      totalTimeSpentSeconds,
      savedCount,
      dailyReads,
      monthlyReads,
      recentReads,
    })
  } catch (err) {
    console.error('[readerStats] Error:', err)
    res.status(500).json({ error: 'Failed to load reading stats' })
  }
})

export default router
