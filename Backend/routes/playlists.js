import { Router } from 'express'
import mongoose from 'mongoose'
import Playlist from '../models/Playlist.js'
import Work from '../models/Work.js'
import { getSubscriptionStatus } from '../services/subscriptionStatusService.js'

const router = Router()

/** Resolve and validate the x-user-id header, returning an ObjectId or null. */
function resolveUserId(req) {
  const raw = req.headers['x-user-id']
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null
  return new mongoose.Types.ObjectId(String(raw))
}

/** Check the user has subscriber access (trial or active subscription) to use playlists. */
async function requireSubscriberAccess(userId, res) {
  const monetizationEnabled = process.env.MONETIZATION_ENABLED === 'true'
  if (!monetizationEnabled) return true

  const status = await getSubscriptionStatus(userId)
  if (!status.isSubscriber) {
    res.status(403).json({ error: 'Subscriber access (free trial or subscription) is required to use playlists.' })
    return false
  }
  return true
}

/**
 * GET /api/playlists/me
 * List all playlists belonging to the authenticated user, including work count.
 */
router.get('/me', async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required.' })

    const playlists = await Playlist.find({ userId }).sort({ createdAt: -1 }).lean()
    res.json(
      playlists.map((p) => ({
        ...p,
        id: p._id.toString(),
        userId: p.userId.toString(),
        workCount: p.workIds?.length ?? 0,
      }))
    )
  } catch (err) {
    console.error('[playlists GET /me]', err)
    res.status(500).json({ error: 'Failed to fetch playlists.' })
  }
})

/**
 * GET /api/playlists/:id/works
 * Fetch a playlist with its populated work documents.
 */
router.get('/:id/works', async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required.' })

    const playlist = await Playlist.findById(req.params.id).lean()
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' })
    if (playlist.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    const works = await Work.find({ _id: { $in: playlist.workIds } })
      .populate('authorId', 'penName avatarUrl')
      .lean()

    // Preserve the playlist ordering
    const workMap = new Map(works.map((w) => [w._id.toString(), w]))
    const ordered = playlist.workIds
      .map((wid) => workMap.get(wid.toString()))
      .filter(Boolean)
      .map((w) => ({
        ...w,
        id: w._id.toString(),
        authorId: w.authorId?._id?.toString() ?? w.authorId?.toString(),
        author: w.authorId
          ? { id: w.authorId._id.toString(), penName: w.authorId.penName, avatarUrl: w.authorId.avatarUrl }
          : null,
      }))

    res.json({
      ...playlist,
      id: playlist._id.toString(),
      userId: playlist.userId.toString(),
      works: ordered,
    })
  } catch (err) {
    console.error('[playlists GET /:id/works]', err)
    res.status(500).json({ error: 'Failed to fetch playlist works.' })
  }
})

/**
 * POST /api/playlists
 * Create a new playlist. Requires an active subscription.
 */
router.post('/', async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required.' })

    const allowed = await requireSubscriberAccess(userId, res)
    if (!allowed) return

    const { name, description, isPrivate } = req.body
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Playlist name is required.' })
    }

    const playlist = await Playlist.create({
      userId,
      name: String(name).trim(),
      description: String(description || '').trim(),
      isPrivate: isPrivate !== false,
    })

    res.status(201).json(playlist.toJSON())
  } catch (err) {
    console.error('[playlists POST /]', err)
    res.status(500).json({ error: 'Failed to create playlist.' })
  }
})

/**
 * PUT /api/playlists/:id
 * Update a playlist's name, description, or isPrivate flag.
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required.' })

    const playlist = await Playlist.findById(req.params.id)
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' })
    if (playlist.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    const { name, description, isPrivate } = req.body
    if (name !== undefined) playlist.name = String(name).trim()
    if (description !== undefined) playlist.description = String(description).trim()
    if (isPrivate !== undefined) playlist.isPrivate = Boolean(isPrivate)

    await playlist.save()
    res.json(playlist.toJSON())
  } catch (err) {
    console.error('[playlists PUT /:id]', err)
    res.status(500).json({ error: 'Failed to update playlist.' })
  }
})

/**
 * DELETE /api/playlists/:id
 * Delete a playlist.
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required.' })

    const playlist = await Playlist.findById(req.params.id)
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' })
    if (playlist.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    await playlist.deleteOne()
    res.json({ success: true })
  } catch (err) {
    console.error('[playlists DELETE /:id]', err)
    res.status(500).json({ error: 'Failed to delete playlist.' })
  }
})

/**
 * POST /api/playlists/:id/works
 * Add a work to a playlist. Body: { workId }
 */
router.post('/:id/works', async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required.' })

    const playlist = await Playlist.findById(req.params.id)
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' })
    if (playlist.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    const { workId } = req.body
    if (!workId || !mongoose.Types.ObjectId.isValid(String(workId))) {
      return res.status(400).json({ error: 'Valid workId is required.' })
    }

    const workOid = new mongoose.Types.ObjectId(String(workId))

    // Avoid duplicates
    const alreadyIn = playlist.workIds.some((id) => id.toString() === workOid.toString())
    if (!alreadyIn) {
      playlist.workIds.push(workOid)
      await playlist.save()
    }

    res.json({ added: !alreadyIn, workCount: playlist.workIds.length })
  } catch (err) {
    console.error('[playlists POST /:id/works]', err)
    res.status(500).json({ error: 'Failed to add work to playlist.' })
  }
})

/**
 * DELETE /api/playlists/:id/works/:workId
 * Remove a work from a playlist.
 */
router.delete('/:id/works/:workId', async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required.' })

    const playlist = await Playlist.findById(req.params.id)
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' })
    if (playlist.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    const before = playlist.workIds.length
    playlist.workIds = playlist.workIds.filter(
      (id) => id.toString() !== req.params.workId
    )
    await playlist.save()

    res.json({ removed: playlist.workIds.length < before, workCount: playlist.workIds.length })
  } catch (err) {
    console.error('[playlists DELETE /:id/works/:workId]', err)
    res.status(500).json({ error: 'Failed to remove work from playlist.' })
  }
})

export default router
