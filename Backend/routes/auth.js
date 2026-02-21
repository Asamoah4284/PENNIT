import { Router } from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Author from '../models/Author.js'

const router = Router()

/** POST /api/auth/signup - Create a new account */
router.post('/signup', async (req, res) => {
  try {
    const { email, name, phone, password, role, penName } = req.body

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' })
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() })
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    const userRole = role === 'writer' ? 'writer' : 'reader'
    let authorId = null
    if (userRole === 'writer') {
      const author = await Author.create({
        penName: (penName || name || '').trim() || email.split('@')[0],
        bio: '',
        avatarUrl: '',
      })
      authorId = author._id
    }
    const user = await User.create({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      phone: (phone || '').trim(),
      password,
      role: userRole,
      penName: userRole === 'writer' ? (penName || '').trim() : '',
      authorId,
    })

    res.status(201).json(user)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }
    console.error('Signup error:', err)
    res.status(500).json({ error: 'Could not create account. Please try again.' })
  }
})

/** POST /api/auth/login - Sign in with email and password */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' })
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // If writer has no author profile yet (e.g. account created before we added authorId), create one
    if (user.role === 'writer' && !user.authorId) {
      const author = await Author.create({
        penName: (user.penName || user.name || '').trim() || user.email.split('@')[0],
        bio: '',
        avatarUrl: '',
      })
      user.authorId = author._id
      await user.save()
    }

    res.json(user)
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Could not sign in. Please try again.' })
  }
})

/** POST /api/auth/change-password - Change password (requires x-user-id and current password). */
router.post('/change-password', async (req, res) => {
  try {
    const rawUserId = req.headers['x-user-id']
    if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'Current password is required' })
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }

    const user = await User.findById(rawUserId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    user.password = newPassword
    await user.save()

    res.json({ success: true })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ error: 'Could not change password. Please try again.' })
  }
})

export default router
