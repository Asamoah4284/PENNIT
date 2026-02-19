import mongoose from 'mongoose'
import Work from '../models/Work.js'
import WorkRead from '../models/WorkRead.js'

const READ_PROGRESS_THRESHOLD = 60
const READ_TIME_SECONDS_THRESHOLD = 30
const WINDOW_HOURS = 24

/**
 * Resolve viewer identity: prefer userId from header/body, then IP.
 * @param {import('express').Request} req
 */
function resolveViewerIdentity(req) {
  const raw = req.user?._id || req.user?.id || req.body?.userId || req.headers['x-user-id']
  const userId = raw && mongoose.Types.ObjectId.isValid(String(raw)) ? new mongoose.Types.ObjectId(String(raw)) : null
  const ipAddress = req.clientIp || req.ip || ''
  return { userId, ipAddress }
}

/**
 * POST /api/works/:id/view
 * Create a WorkRead record if no view in last 24h for this user/IP. Optionally increment viewCount on Work.
 */
export async function trackWorkView(req, res) {
  try {
    const workId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({ error: 'Invalid work ID' })
    }

    const work = await Work.findById(workId)
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }

    const { userId, ipAddress } = resolveViewerIdentity(req)
    if (!ipAddress) {
      return res.status(400).json({ error: 'Unable to determine client IP' })
    }

    const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000)

    const existingView = await WorkRead.findOne({
      workId: work._id,
      createdAt: { $gte: windowStart },
      $or: [
        ...(userId ? [{ userId }] : []),
        { ipAddress },
      ],
    }).sort({ createdAt: -1 })

    if (existingView) {
      return res.status(200).json({
        workId: work._id.toString(),
        viewId: existingView._id.toString(),
        readCount: work.readCount,
        countedAsRead: existingView.countedAsRead,
        duplicate: true,
      })
    }

    const newView = await WorkRead.create({
      workId: work._id,
      userId,
      ipAddress,
      progressPercentage: 0,
      timeSpent: 0,
      countedAsRead: false,
    })

    return res.status(201).json({
      workId: work._id.toString(),
      viewId: newView._id.toString(),
      readCount: work.readCount,
      countedAsRead: false,
      duplicate: false,
    })
  } catch (err) {
    console.error('Error tracking work view:', err)
    return res.status(500).json({ error: 'Failed to track work view' })
  }
}

/**
 * POST /api/works/:id/read
 * Body: { progressPercentage, timeSpent }
 * If progress >= 60%, time >= 30s, and no read in last 24h for this user/IP, count as read and increment Work.readCount.
 */
export async function trackWorkRead(req, res) {
  try {
    const workId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({ error: 'Invalid work ID' })
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

    const work = await Work.findById(workId)
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }

    const { userId, ipAddress } = resolveViewerIdentity(req)
    if (!ipAddress) {
      return res.status(400).json({ error: 'Unable to determine client IP' })
    }

    const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000)

    const existingRead = await WorkRead.findOne({
      workId: work._id,
      countedAsRead: true,
      createdAt: { $gte: windowStart },
      $or: [
        ...(userId ? [{ userId }] : []),
        { ipAddress },
      ],
    })

    if (existingRead) {
      return res.status(200).json({
        workId: work._id.toString(),
        readCount: work.readCount,
        countedAsRead: true,
        duplicate: true,
      })
    }

    if (progress < READ_PROGRESS_THRESHOLD || time < READ_TIME_SECONDS_THRESHOLD) {
      const latestView = await WorkRead.findOneAndUpdate(
        {
          workId: work._id,
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
        workId: work._id.toString(),
        readCount: work.readCount,
        countedAsRead: latestView?.countedAsRead ?? false,
        thresholdMet: false,
      })
    }

    const view = await WorkRead.findOneAndUpdate(
      {
        workId: work._id,
        createdAt: { $gte: windowStart },
        $or: [
          ...(userId ? [{ userId }] : []),
          { ipAddress },
        ],
      },
      {
        $set: { countedAsRead: true },
        $max: {
          progressPercentage: progress,
          timeSpent: time,
        },
      },
      { new: true, upsert: !userId }
    )

    work.readCount += 1
    await work.save()

    return res.status(201).json({
      workId: work._id.toString(),
      readCount: work.readCount,
      countedAsRead: true,
      viewId: view?._id?.toString(),
      duplicate: false,
    })
  } catch (err) {
    console.error('Error tracking work read:', err)
    return res.status(500).json({ error: 'Failed to track work read' })
  }
}
