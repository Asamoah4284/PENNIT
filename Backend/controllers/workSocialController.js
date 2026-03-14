import mongoose from 'mongoose'
import Work from '../models/Work.js'
import Author from '../models/Author.js'
import WorkComment from '../models/WorkComment.js'
import WorkCommentLike from '../models/WorkCommentLike.js'
import WorkClap from '../models/WorkClap.js'
import SavedWork from '../models/SavedWork.js'
import AuthorFollow from '../models/AuthorFollow.js'
import { getSubscriberFlagsForUsers, getSubscriptionStatus } from '../services/subscriptionStatusService.js'
import { getMonetizationEnabled } from '../services/appConfigService.js'
import { recordInteraction } from '../services/feedScoringService.js'
import { logActivity } from '../services/activityLog.js'

function resolveUserId(req) {
  const raw = req.user?._id || req.user?.id || req.body?.userId || req.headers['x-user-id']
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null
  return new mongoose.Types.ObjectId(String(raw))
}

/** Create a comment on a work */
export async function createWorkComment(req, res) {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to comment' })
    }

    const workId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({ error: 'Invalid work ID' })
    }

    const { content, parentId: rawParentId } = req.body ?? {}
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'Comment content is required' })
    }

    const work = await Work.findById(workId).select('authorId title')
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }

    let parentId = null
    if (rawParentId && mongoose.Types.ObjectId.isValid(rawParentId)) {
      const parent = await WorkComment.findOne({ _id: rawParentId, workId: work._id }).select('_id').lean()
      if (!parent) {
        return res.status(400).json({ error: 'Parent comment not found' })
      }
      parentId = parent._id
    }

    const comment = await WorkComment.create({
      workId: work._id,
      userId,
      authorId: work.authorId,
      content: String(content).trim(),
      parentId,
    })

    await Work.updateOne({ _id: work._id }, { $inc: { commentCount: 1 } }).exec()

    logActivity(userId, 'work_comment', {
      workId: work._id.toString(),
      workTitle: work.title,
      commentId: comment._id.toString(),
    }).catch(() => {})

    // Record interaction signal for the feed algorithm (fire-and-forget)
    const fullWork = await Work.findById(work._id).select('authorId category genre language').lean()
    if (fullWork) {
      recordInteraction(userId, fullWork, { commented: true }).catch(() => {})
    }

    res.status(201).json(comment.toJSON())
  } catch (err) {
    console.error('Error creating work comment:', err)
    res.status(500).json({ error: 'Failed to create comment' })
  }
}

/** List comments for a work */
export async function listWorkComments(req, res) {
  try {
    const workId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({ error: 'Invalid work ID' })
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200)
    const skip = Math.max(parseInt(req.query.offset, 10) || 0, 0)

    const comments = await WorkComment.find({ workId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name penName')
      .lean()

    const userId = resolveUserId(req)

    const commentIds = comments.map((c) => c._id)

    // Aggregate like counts per comment
    const likeDocs = commentIds.length
      ? await WorkCommentLike.aggregate([
          { $match: { commentId: { $in: commentIds } } },
          { $group: { _id: '$commentId', count: { $sum: 1 } } },
        ])
      : []

    const likeCountMap = new Map(likeDocs.map((d) => [String(d._id), d.count]))

    // Which comments this user has liked
    let likedSet = new Set()
    if (userId && commentIds.length) {
      const likedDocs = await WorkCommentLike.find({ commentId: { $in: commentIds }, userId })
        .select('commentId')
        .lean()
      likedSet = new Set(likedDocs.map((d) => String(d.commentId)))
    }

    const commenterIds = comments.map((c) => c.userId?._id?.toString?.() ?? c.userId?.toString?.() ?? '').filter(Boolean)
    const subscriberFlags = getMonetizationEnabled()
      ? await getSubscriberFlagsForUsers(commenterIds)
      : new Map()

    const formatted = comments.map((c) => {
      const id = c._id.toString()
      const uid = c.userId?._id?.toString?.() ?? c.userId?.toString?.() ?? ''
      const likeCount = likeCountMap.get(id) || 0
      const liked = likedSet.has(id)
      return {
        id,
        workId: c.workId?.toString?.() ?? c.workId,
        userId: uid || (c.userId?._id?.toString?.() ?? c.userId),
        userName: c.userId?.penName || c.userId?.name || null,
        authorId: c.authorId?.toString?.() ?? c.authorId,
        content: c.content,
        parentId: c.parentId?.toString?.() ?? null,
        createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
        likeCount,
        liked,
        commenterIsSubscriber: subscriberFlags.get(uid) ?? false,
      }
    })

    res.json(formatted)
  } catch (err) {
    console.error('Error listing work comments:', err)
    res.status(500).json({ error: 'Failed to fetch comments' })
  }
}

/** Toggle like on a comment for current user */
export async function toggleWorkCommentLike(req, res) {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to like comments' })
    }

    const workId = req.params.id
    const commentId = req.params.commentId

    if (!mongoose.Types.ObjectId.isValid(workId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'Invalid work or comment ID' })
    }

    const comment = await WorkComment.findOne({ _id: commentId, workId }).select('_id')
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    const existing = await WorkCommentLike.findOne({ commentId: comment._id, userId })
    if (existing) {
      await existing.deleteOne()
    } else {
      await WorkCommentLike.create({ commentId: comment._id, userId })
    }

    const likeCount = await WorkCommentLike.countDocuments({ commentId: comment._id })
    res.json({
      commentId: comment._id.toString(),
      liked: !existing,
      likeCount,
    })
  } catch (err) {
    console.error('Error toggling comment like:', err)
    res.status(500).json({ error: 'Failed to like comment' })
  }
}

/** Toggle clap on a work for current user */
export async function toggleWorkClap(req, res) {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to clap' })
    }

    const workId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({ error: 'Invalid work ID' })
    }

    const work = await Work.findById(workId).select('clapCount title')
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }

    const existing = await WorkClap.findOne({ workId, userId })
    if (existing) {
      await existing.deleteOne()
      // Decrement but never go below 0
      await Work.updateOne(
        { _id: workId },
        [{ $set: { clapCount: { $max: [0, { $subtract: ['$clapCount', 1] }] } } }]
      ).exec()
      const updated = await Work.findById(workId).select('clapCount')
      const count = Math.max(0, updated?.clapCount ?? 0)
      return res.json({
        workId,
        clapped: false,
        clapCount: count,
      })
    }

    await WorkClap.create({ workId, userId })
    await Work.updateOne({ _id: workId }, { $inc: { clapCount: 1 } }).exec()
    const updated = await Work.findById(workId).select('clapCount authorId category genre language')

    logActivity(userId, 'work_clap', { workId: work._id.toString(), workTitle: work.title }).catch(() => {})

    // Record liked=true signal for the feed algorithm (fire-and-forget)
    if (updated) {
      recordInteraction(userId, updated.toObject(), { liked: true }).catch(() => {})
    }

    return res.status(201).json({
      workId,
      clapped: true,
      clapCount: updated?.clapCount ?? 1,
    })
  } catch (err) {
    if (err.code === 11000) {
      // Unique index race condition, fall back to current state
      const workId = req.params.id
      const userId = resolveUserId(req)
      const existing = await WorkClap.findOne({ workId, userId })
      const work = await Work.findById(workId).select('clapCount')
      return res.json({
        workId,
        clapped: !!existing,
        clapCount: Math.max(0, work?.clapCount ?? 0),
      })
    }
    console.error('Error toggling work clap:', err)
    res.status(500).json({ error: 'Failed to toggle clap' })
  }
}

/** Get clap status for current user on a work */
export async function getWorkClapStatus(req, res) {
  try {
    const workId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({ error: 'Invalid work ID' })
    }

    const userId = resolveUserId(req)
    const work = await Work.findById(workId).select('clapCount')
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }

    let clapped = false
    if (userId) {
      const existing = await WorkClap.findOne({ workId, userId })
      clapped = !!existing
    }

    res.json({
      workId,
      clapped,
      clapCount: Math.max(0, work.clapCount ?? 0),
    })
  } catch (err) {
    console.error('Error fetching work clap status:', err)
    res.status(500).json({ error: 'Failed to fetch clap status' })
  }
}

/** Toggle save/unsave work for current user. Requires subscriber access (trial or paid). */
export async function toggleSaveWork(req, res) {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to save works' })
    }

    if (getMonetizationEnabled()) {
      const status = await getSubscriptionStatus(userId)
      if (!status.isSubscriber) {
        return res.status(403).json({ error: 'Subscriber access (free trial or subscription) is required to save pieces.' })
      }
    }

    const workId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({ error: 'Invalid work ID' })
    }

    const work = await Work.findById(workId).select('saveCount')
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }

    const existing = await SavedWork.findOne({ workId, userId })
    if (existing) {
      await existing.deleteOne()
      await Work.updateOne({ _id: workId }, { $inc: { saveCount: -1 } }).exec()
      const updated = await Work.findById(workId).select('saveCount')
      return res.json({
        workId,
        saved: false,
        saveCount: updated?.saveCount ?? 0,
      })
    }

    await SavedWork.create({ workId, userId })
    await Work.updateOne({ _id: workId }, { $inc: { saveCount: 1 } }).exec()
    const updated = await Work.findById(workId).select('saveCount')

    return res.status(201).json({
      workId,
      saved: true,
      saveCount: updated?.saveCount ?? 1,
    })
  } catch (err) {
    if (err.code === 11000) {
      const workId = req.params.id
      const userId = resolveUserId(req)
      const existing = await SavedWork.findOne({ workId, userId })
      const work = await Work.findById(workId).select('saveCount')
      return res.json({
        workId,
        saved: !!existing,
        saveCount: work?.saveCount ?? 0,
      })
    }
    console.error('Error toggling saved work:', err)
    res.status(500).json({ error: 'Failed to toggle saved work' })
  }
}

/** List saved works for current user */
export async function listSavedWorks(req, res) {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to view saved works' })
    }

    const saved = await SavedWork.find({ userId }).sort({ createdAt: -1 }).lean()
    const workIds = saved.map((s) => s.workId)

    const works = await Work.find({ _id: { $in: workIds } })
      .populate('authorId', 'penName avatarUrl')
      .lean()

    const worksById = new Map(works.map((w) => [w._id.toString(), w]))

    const result = saved
      .map((s) => {
        const w = worksById.get(s.workId.toString())
        if (!w) return null
        return {
          ...w,
          id: w._id.toString(),
          authorId: w.authorId?._id?.toString?.() ?? w.authorId?.toString?.() ?? w.authorId,
          createdAt: w.createdAt?.toISOString?.() ?? w.createdAt,
          savedAt: s.createdAt?.toISOString?.() ?? s.createdAt,
        }
      })
      .filter(Boolean)

    res.json(result)
  } catch (err) {
    console.error('Error listing saved works:', err)
    res.status(500).json({ error: 'Failed to fetch saved works' })
  }
}

/**
 * POST /api/works/:id/share
 * Records that a user shared a work externally.
 * Increments work.shareCount and updates the feed interaction signal.
 */
export async function trackWorkShare(req, res) {
  try {
    const workId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({ error: 'Invalid work ID' })
    }

    const work = await Work.findById(workId).select('shareCount authorId category genre language title')
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }

    // Increment share counter on the work document
    await Work.updateOne({ _id: workId }, { $inc: { shareCount: 1 } }).exec()

    const userId = resolveUserId(req)
    if (userId) {
      logActivity(userId, 'work_share', { workId: work._id.toString(), workTitle: work.title }).catch(() => {})
      // Record shared=true for the personalised feed (fire-and-forget)
      recordInteraction(userId, work.toObject(), { shared: true }).catch(() => {})
    }

    const updated = await Work.findById(workId).select('shareCount').lean()
    res.json({ workId, shareCount: updated?.shareCount ?? 1 })
  } catch (err) {
    console.error('Error tracking work share:', err)
    res.status(500).json({ error: 'Failed to track share' })
  }
}

/** Toggle follow/unfollow author for current user */
export async function toggleFollowAuthor(req, res) {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to follow authors' })
    }

    const authorId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      return res.status(400).json({ error: 'Invalid author ID' })
    }

    const author = await Author.findById(authorId).select('followerCount')
    if (!author) {
      return res.status(404).json({ error: 'Author not found' })
    }

    const existing = await AuthorFollow.findOne({ authorId, followerId: userId })
    if (existing) {
      await existing.deleteOne()
      await Author.updateOne({ _id: authorId }, { $inc: { followerCount: -1 } }).exec()
      const updated = await Author.findById(authorId).select('followerCount')
      return res.json({
        authorId,
        following: false,
        followerCount: updated?.followerCount ?? 0,
      })
    }

    await AuthorFollow.create({ authorId, followerId: userId })
    await Author.updateOne({ _id: authorId }, { $inc: { followerCount: 1 } }).exec()
    logActivity(userId, 'author_follow', { authorId }).catch(() => {})
    const updated = await Author.findById(authorId).select('followerCount')

    return res.status(201).json({
      authorId,
      following: true,
      followerCount: updated?.followerCount ?? 1,
    })
  } catch (err) {
    if (err.code === 11000) {
      const authorId = req.params.id
      const userId = resolveUserId(req)
      const existing = await AuthorFollow.findOne({ authorId, followerId: userId })
      const author = await Author.findById(authorId).select('followerCount')
      return res.json({
        authorId,
        following: !!existing,
        followerCount: author?.followerCount ?? 0,
      })
    }
    console.error('Error toggling author follow:', err)
    res.status(500).json({ error: 'Failed to toggle author follow' })
  }
}

