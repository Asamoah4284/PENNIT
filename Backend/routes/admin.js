import { Router } from 'express'
import User from '../models/User.js'
import Work from '../models/Work.js'
import Author from '../models/Author.js'
import Payout from '../models/Payout.js'
import SubscriptionPayment from '../models/SubscriptionPayment.js'

const router = Router()

/**
 * Middleware to check if the user is an admin
 * Expects x-user-id header
 */
const isAdmin = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id']
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        const user = await User.findById(userId)
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access only' })
        }
        next()
    } catch (err) {
        res.status(500).json({ error: 'Server error' })
    }
}

/** GET /api/admin/stats - Get dashboard statistics */
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments()
        const totalWorks = await Work.countDocuments()
        const totalAuthors = await Author.countDocuments()

        // Total revenue from subscriptions
        const payments = await SubscriptionPayment.find({ status: 'succeeded' })
        const totalRevenue = payments.reduce((sum, p) => sum + p.amountGhc, 0)

        // Total payouts
        const payouts = await Payout.find({ status: 'paid' })
        const totalPayouts = payouts.reduce((sum, p) => sum + p.amountGhc, 0)

        // ── Chart data ─────────────────────────────────────────────
        const now = new Date()
        const months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
            return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('default', { month: 'short' }) }
        })

        // Users joined per month (last 6 months)
        const allUsers = await User.find({}, 'createdAt').lean()
        const usersByMonth = months.map(m => ({
            month: m.label,
            users: allUsers.filter(u => {
                const d = new Date(u.createdAt)
                return d.getFullYear() === m.year && d.getMonth() === m.month
            }).length
        }))

        // Works published per month (last 6 months)
        const allWorks = await Work.find({}, 'createdAt category status').lean()
        const worksByMonth = months.map(m => ({
            month: m.label,
            works: allWorks.filter(w => {
                const d = new Date(w.createdAt)
                return d.getFullYear() === m.year && d.getMonth() === m.month && w.status === 'published'
            }).length
        }))

        // Works by category
        const categoryCount = allWorks.reduce((acc, w) => {
            const cat = w.category || 'other'
            acc[cat] = (acc[cat] || 0) + 1
            return acc
        }, {})
        const worksByCategory = Object.entries(categoryCount).map(([name, value]) => ({
            name: name.replace('_', ' '), value
        }))

        // Works by status
        const statusCount = allWorks.reduce((acc, w) => {
            acc[w.status] = (acc[w.status] || 0) + 1
            return acc
        }, {})
        const worksByStatus = Object.entries(statusCount).map(([name, value]) => ({ name, value }))

        // Revenue by month
        const revenueByMonth = months.map(m => ({
            month: m.label,
            revenue: payments.filter(p => {
                const d = new Date(p.createdAt)
                return d.getFullYear() === m.year && d.getMonth() === m.month
            }).reduce((sum, p) => sum + p.amountGhc, 0)
        }))

        res.json({
            totalUsers,
            totalWorks,
            totalAuthors,
            totalRevenue,
            totalPayouts,
            recentUsers: await User.find().sort({ createdAt: -1 }).limit(5),
            recentWorks: await Work.find().sort({ createdAt: -1 }).limit(5),
            // Chart series
            usersByMonth,
            worksByMonth,
            worksByCategory,
            worksByStatus,
            revenueByMonth,
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})


/** GET /api/admin/users - List all users */
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 })
        res.json(users)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** PATCH /api/admin/users/:id - Update user role */
router.patch('/users/:id', isAdmin, async (req, res) => {
    try {
        const { role } = req.body
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true })
        res.json(user)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** DELETE /api/victor-access-control/users/:id - Delete a user */
router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        const requestingUserId = req.headers['x-user-id']
        if (req.params.id === requestingUserId) {
            return res.status(400).json({ error: 'You cannot delete your own account.' })
        }
        const user = await User.findByIdAndDelete(req.params.id)
        if (!user) return res.status(404).json({ error: 'User not found' })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** GET /api/victor-access-control/works - List all works (all statuses) */
router.get('/works', isAdmin, async (req, res) => {
    try {
        const works = await Work.find().sort({ createdAt: -1 }).lean()
        res.json(works.map(w => ({ ...w, id: w._id.toString() })))
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** PATCH /api/victor-access-control/works/:id - Admin edit a work */
router.patch('/works/:id', isAdmin, async (req, res) => {
    try {
        const { title, excerpt, body, category, genre, status } = req.body
        const update = {}
        if (title !== undefined) update.title = title.trim()
        if (excerpt !== undefined) update.excerpt = excerpt.trim()
        if (body !== undefined) update.body = body.trim()
        if (genre !== undefined) update.genre = genre.trim()
        if (category !== undefined && ['short_story', 'poem', 'novel'].includes(category)) update.category = category
        if (status !== undefined && ['draft', 'pending', 'published'].includes(status)) update.status = status

        const work = await Work.findByIdAndUpdate(req.params.id, update, { new: true })
        if (!work) return res.status(404).json({ error: 'Work not found' })
        res.json({ ...work.toObject(), id: work._id.toString() })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** PATCH /api/victor-access-control/works/:id/approve - Approve a pending work */
router.patch('/works/:id/approve', isAdmin, async (req, res) => {
    try {
        const work = await Work.findByIdAndUpdate(
            req.params.id,
            { status: 'published' },
            { new: true }
        )
        if (!work) return res.status(404).json({ error: 'Work not found' })
        res.json({ ...work.toObject(), id: work._id.toString() })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** DELETE /api/admin/works/:id - Delete a work */
router.delete('/works/:id', isAdmin, async (req, res) => {
    try {
        await Work.findByIdAndDelete(req.params.id)
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

export default router
