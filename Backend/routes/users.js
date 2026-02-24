import { Router } from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Author from '../models/Author.js'
import AuthorFollow from '../models/AuthorFollow.js'

const router = Router()
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
          followerCount: author.followerCount ?? 0,
        }
        profile.penName = author.penName
        profile.bio = author.bio || user.bio || ''
        profile.avatarUrl = author.avatarUrl || user.avatarUrl || ''
        profile.followerCount = author.followerCount ?? 0
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
 * Update current user profile: name, bio, avatarUrl, email. Writers: also update Author (penName, bio, avatarUrl).
 * Changing email requires current password in body (password).
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

    const { name, bio, avatarUrl, penName, email, password } = req.body

    if (email !== undefined && typeof email === 'string') {
      const newEmail = email.trim().toLowerCase()
      if (!EMAIL_REGEX.test(newEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address' })
      }
      if (newEmail !== user.email) {
        const existing = await User.findOne({ email: newEmail })
        if (existing) {
          return res.status(409).json({ error: 'An account with this email already exists' })
        }
        if (!password || typeof password !== 'string') {
          return res.status(400).json({ error: 'Current password is required to change email' })
        }
        const match = await bcrypt.compare(password, user.password)
        if (!match) {
          return res.status(401).json({ error: 'Current password is incorrect' })
        }
        user.email = newEmail
      }
    }

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

/**
 * GET /api/users/me/following
 * List authors the current user follows (for sidebar).
 */
router.get('/me/following', async (req, res) => {
  try {
    const rawUserId = req.headers['x-user-id']
    if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const follows = await AuthorFollow.find({ followerId: rawUserId })
      .populate('authorId', 'penName avatarUrl')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    const following = follows
      .filter((f) => f.authorId)
      .map((f) => ({
        id: f.authorId._id.toString(),
        penName: f.authorId.penName,
        avatarUrl: f.authorId.avatarUrl || '',
      }))

    res.json({ following })
  } catch (err) {
    console.error('[users/me/following] Error:', err)
    res.status(500).json({ error: 'Failed to load following' })
  }
})

/**
 * POST /api/users/switch-role
 * Switch current user between 'reader' and 'writer'.
 * Reader -> Writer: Creates Author profile if missing.
 */
router.post('/switch-role', async (req, res) => {
  try {
    const rawUserId = req.headers['x-user-id']
    if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const user = await User.findById(rawUserId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Admins cannot switch roles' })
    }

    if (user.role === 'reader') {
      // Reader -> Writer
      user.role = 'writer'
      if (!user.authorId) {
        const author = await Author.create({
          penName: (user.penName || user.name || '').trim() || user.email.split('@')[0],
          bio: user.bio || '',
          avatarUrl: user.avatarUrl || '',
        })
        user.authorId = author._id
      }
    } else {
      // Writer -> Reader
      user.role = 'reader'
    }

    await user.save()

    // Return formatted profile
    const updated = await User.findById(user._id).lean()
    const profile = {
      id: updated._id.toString(),
      email: updated.email,
      name: updated.name,
      role: updated.role,
      authorId: updated.authorId?.toString() ?? null,
      avatarUrl: updated.avatarUrl || '',
      bio: updated.bio || '',
    }

    res.json(profile)
  } catch (err) {
    console.error('[users/switch-role] Error:', err)
    res.status(500).json({ error: 'Failed to switch role' })
  }
})

export default router
