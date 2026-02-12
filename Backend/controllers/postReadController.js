import mongoose from 'mongoose'
import Post from '../models/Post.js'
import PostView from '../models/PostView.js'

const READ_PROGRESS_THRESHOLD = 60
const READ_TIME_SECONDS_THRESHOLD = 30
const WINDOW_HOURS = 24

/**
 * Resolve the effective identity for a viewer: prefer userId, otherwise IP address.
 * @param {import('express').Request} req
 */
function resolveViewerIdentity(req) {
  const userId = req.user?._id || req.user?.id || null
  const ipAddress = req.clientIp || req.ip
  return {
    userId: userId ? new mongoose.Types.ObjectId(userId) : null,
    ipAddress,
  }
}

/**
 * POST /api/posts/:id/view
 * - Called when a post is opened
 * - Increment viewCount
 * - Create a PostView record
 * - Prevent duplicate views within 24 hours per user or IP
 */
export async function trackPostView(req, res) {
  try {
    const postId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' })
    }

    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const { userId, ipAddress } = resolveViewerIdentity(req)
    if (!ipAddress) {
      return res.status(400).json({ error: 'Unable to determine client IP' })
    }

    const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000)

    const existingView = await PostView.findOne({
      postId,
      createdAt: { $gte: windowStart },
      $or: [
        ...(userId ? [{ userId }] : []),
        { ipAddress },
      ],
    }).sort({ createdAt: -1 })

    if (existingView) {
      return res.status(200).json({
        postId: post._id.toString(),
        viewId: existingView._id.toString(),
        viewCount: post.viewCount,
        readCount: post.readCount,
        countedAsRead: existingView.countedAsRead,
        duplicate: true,
      })
    }

    post.viewCount += 1
    await post.save()

    const newView = await PostView.create({
      postId: post._id,
      userId,
      ipAddress,
      progressPercentage: 0,
      timeSpent: 0,
      countedAsRead: false,
    })

    return res.status(201).json({
      postId: post._id.toString(),
      viewId: newView._id.toString(),
      viewCount: post.viewCount,
      readCount: post.readCount,
      countedAsRead: false,
      duplicate: false,
    })
  } catch (err) {
    console.error('Error tracking post view:', err)
    return res.status(500).json({ error: 'Failed to track post view' })
  }
}

/**
 * POST /api/posts/:id/read
 * Body: { progressPercentage, timeSpent }
 * - Called when user leaves page or after scroll tracking
 * - If:
 *    progressPercentage >= 60 AND
 *    timeSpent >= 30 AND
 *    countedAsRead is false AND
 *    no read counted in last 24h for this user/IP/post
 *   Then:
 *    - Increment readCount
 *    - Update PostView countedAsRead = true
 */
export async function trackPostRead(req, res) {
  try {
    const postId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' })
    }

    const { progressPercentage, timeSpent } = req.body ?? {}
    const progress = Number(progressPercentage)
    const time = Number(timeSpent)

    if (Number.isNaN(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'progressPercentage must be between 0 and 100' })
    }
    if (Number.isNaN(time) || time < 0) {
      return res.status(400).json({ error: 'timeSpent must be a non-negative number of seconds' })
    }

    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const { userId, ipAddress } = resolveViewerIdentity(req)
    if (!ipAddress) {
      return res.status(400).json({ error: 'Unable to determine client IP' })
    }

    const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000)

    const existingRead = await PostView.findOne({
      postId,
      countedAsRead: true,
      createdAt: { $gte: windowStart },
      $or: [
        ...(userId ? [{ userId }] : []),
        { ipAddress },
      ],
    })

    if (existingRead) {
      return res.status(200).json({
        postId: post._id.toString(),
        readCount: post.readCount,
        countedAsRead: true,
        duplicate: true,
      })
    }

    if (progress < READ_PROGRESS_THRESHOLD || time < READ_TIME_SECONDS_THRESHOLD) {
      const latestView = await PostView.findOneAndUpdate(
        {
          postId,
          createdAt: { $gte: windowStart },
          $or: [
            ...(userId ? [{ userId }] : []),
            { ipAddress },
          ],
        },
        {
          $max: {
            progressPercentage: progress,
            timeSpent: time,
          },
        },
        { new: true }
      )

      return res.status(200).json({
        postId: post._id.toString(),
        readCount: post.readCount,
        countedAsRead: latestView?.countedAsRead ?? false,
        thresholdMet: false,
      })
    }

    const view = await PostView.findOneAndUpdate(
      {
        postId,
        createdAt: { $gte: windowStart },
        $or: [
          ...(userId ? [{ userId }] : []),
          { ipAddress },
        ],
      },
      {
        $set: {
          countedAsRead: true,
        },
        $max: {
          progressPercentage: progress,
          timeSpent: time,
        },
      },
      { new: true, upsert: !userId }
    )

    post.readCount += 1
    await post.save()

    return res.status(201).json({
      postId: post._id.toString(),
      readCount: post.readCount,
      countedAsRead: true,
      viewId: view?._id?.toString(),
      duplicate: false,
    })
  } catch (err) {
    console.error('Error tracking post read:', err)
    return res.status(500).json({ error: 'Failed to track post read' })
  }
}

