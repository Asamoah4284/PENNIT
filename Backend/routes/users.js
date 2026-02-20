import { Router } from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Author from '../models/Author.js'

const router = Router()

/**
 * GET /api/users/me
 * Returns the current user profile (x-user-id). Writers get author profile merged for display.
 */
router.get('/me', async (req, res) => {
  try {
    const rawUserId = req.headers['x-user-id']
    if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const user = await User.findById(rawUserId).lean()
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const profile = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      role: user.role,
      penName: user.penName || '',
      authorId: user.authorId?.toString() ?? null,
      avatarUrl: user.avatarUrl || '',
      bio: user.bio || '',
    }

    if (user.role === 'writer' && user.authorId) {
      const author = await Author.findById(user.authorId).lean()
      if (author) {
        profile.author = {
          id: author._id.toString(),
          penName: author.penName,
          bio: author.bio || '',
          avatarUrl: author.avatarUrl || '',
        }
        profile.penName = author.penName
        profile.bio = author.bio || user.bio || ''
        profile.avatarUrl = author.avatarUrl || user.avatarUrl || ''
      }
    }

    res.json(profile)
  } catch (err) {
    console.error('[users/me] Error:', err)
    res.status(500).json({ error: 'Failed to load profile' })
  }
})

/**
 * PATCH /api/users/me
 * Update current user profile: name, bio, avatarUrl. Writers: also update Author (penName, bio, avatarUrl).
 */
router.patch('/me', async (req, res) => {
  try {
    const rawUserId = req.headers['x-user-id']
    if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const user = await User.findById(rawUserId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { name, bio, avatarUrl, penName } = req.body

    if (name !== undefined && typeof name === 'string') {
      user.name = name.trim()
    }
    if (bio !== undefined && typeof bio === 'string') {
      user.bio = bio.trim()
    }
    if (avatarUrl !== undefined && typeof avatarUrl === 'string') {
      user.avatarUrl = avatarUrl.trim()
    }
    if (penName !== undefined && typeof penName === 'string' && user.role === 'writer') {
      user.penName = penName.trim()
    }

    await user.save()

    if (user.role === 'writer' && user.authorId) {
      const author = await Author.findById(user.authorId)
      if (author) {
        if (name !== undefined && typeof name === 'string') author.penName = name.trim()
        else if (penName !== undefined && typeof penName === 'string') author.penName = penName.trim()
        if (bio !== undefined && typeof bio === 'string') author.bio = bio.trim()
        if (avatarUrl !== undefined && typeof avatarUrl === 'string') author.avatarUrl = avatarUrl.trim()
        await author.save()
      }
    }

    const updated = await User.findById(user._id).lean()
    const response = {
      id: updated._id.toString(),
      email: updated.email,
      name: updated.name,
      phone: updated.phone || '',
      role: updated.role,
      penName: updated.penName || '',
      authorId: updated.authorId?.toString() ?? null,
      avatarUrl: updated.avatarUrl || '',
      bio: updated.bio || '',
    }

    if (updated.role === 'writer' && updated.authorId) {
      const author = await Author.findById(updated.authorId).lean()
      if (author) {
        response.penName = author.penName
        response.bio = author.bio || ''
        response.avatarUrl = author.avatarUrl || updated.avatarUrl || ''
      }
    }

    res.json(response)
  } catch (err) {
    console.error('[users/me PATCH] Error:', err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router
