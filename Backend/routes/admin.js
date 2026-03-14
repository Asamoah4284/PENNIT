import { Router } from 'express'
import User from '../models/User.js'
import Work from '../models/Work.js'
import Author from '../models/Author.js'
import Payout from '../models/Payout.js'
import SubscriptionPayment from '../models/SubscriptionPayment.js'
import Activity from '../models/Activity.js'
import WorkComment from '../models/WorkComment.js'
import Playlist from '../models/Playlist.js'
import SavedWork from '../models/SavedWork.js'
import UserPreferences from '../models/UserPreferences.js'
import { logActivity } from '../services/activityLog.js'
import { getMonetizationEnabled, setMonetizationEnabled } from '../services/appConfigService.js'

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

/** GET /api/victor-access-control/config - Get app config (admin only). */
router.get('/config', isAdmin, (_req, res) => {
    res.json({ monetizationEnabled: getMonetizationEnabled() })
})

/** PATCH /api/victor-access-control/config - Update app config (admin only). Body: { monetizationEnabled?: boolean } */
router.patch('/config', isAdmin, async (req, res) => {
    try {
        const { monetizationEnabled } = req.body || {}
        if (typeof monetizationEnabled !== 'boolean') {
            return res.status(400).json({ error: 'Body must include monetizationEnabled (boolean)' })
        }
        await setMonetizationEnabled(monetizationEnabled)
        const adminId = req.headers['x-user-id']
        if (adminId) logActivity(adminId, 'config_updated', { monetizationEnabled }).catch(() => {})
        res.json({ monetizationEnabled: getMonetizationEnabled() })
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Failed to update config' })
    }
})

/** GET /api/victor-access-control/activity - List recent activity (admin only). */
router.get('/activity', isAdmin, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 80, 200)
        const activities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'name email role')
            .lean()
        const list = activities.map((a) => ({
            id: a._id.toString(),
            userId: a.userId?._id?.toString(),
            userName: a.userId?.name,
            userEmail: a.userId?.email,
            userRole: a.userId?.role,
            action: a.action,
            meta: a.meta || {},
            createdAt: a.createdAt,
        }))
        res.json(list)
    } catch (err) {
        console.error('[admin/activity]', err)
        res.status(500).json({ error: err.message })
    }
})

/** GET /api/admin/stats - Get dashboard statistics */
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments()
        const totalWorks = await Work.countDocuments()
        const totalAuthors = await Author.countDocuments()

        const [payments, payouts, engagementAgg, totalPlaylists, totalSavedWorks, usersWithPreferences, followerAgg] = await Promise.all([
            SubscriptionPayment.find({ status: 'succeeded' }),
            Payout.find({ status: 'paid' }),
            Work.aggregate([
                {
                    $group: {
                        _id: null,
                        totalReads: { $sum: '$readCount' },
                        totalClaps: { $sum: '$clapCount' },
                        totalComments: { $sum: '$commentCount' },
                    },
                },
            ]),
            Playlist.countDocuments(),
            SavedWork.countDocuments(),
            UserPreferences.countDocuments(),
            Author.aggregate([
                { $group: { _id: null, totalFollowers: { $sum: '$followerCount' } } },
            ]),
        ])

        const totalRevenue = payments.reduce((sum, p) => sum + p.amountGhc, 0)
        const totalPayouts = payouts.reduce((sum, p) => sum + p.amountGhc, 0)
        const totalReads = engagementAgg[0]?.totalReads ?? 0
        const totalClaps = engagementAgg[0]?.totalClaps ?? 0
        const totalComments = engagementAgg[0]?.totalComments ?? 0
        const totalFollowers = followerAgg[0]?.totalFollowers ?? 0

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
            totalReads,
            totalClaps,
            totalComments,
            totalFollowers,
            totalPlaylists,
            totalSavedWorks,
            usersWithPreferences,
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


/** GET /api/admin/users - List users with pagination (default: page=1, limit=10). */
router.get('/users', isAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
        const skip = (page - 1) * limit
        const [rawUsers, total] = await Promise.all([
            User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            User.countDocuments(),
        ])
        const userIds = rawUsers.map((u) => u._id)
        const authorIds = rawUsers
            .filter((u) => u.role === 'writer' && u.authorId)
            .map((u) => u.authorId)

        const [playlistAgg, savedAgg, prefDocs, authorDocs] = await Promise.all([
            Playlist.aggregate([
                { $match: { userId: { $in: userIds } } },
                { $group: { _id: '$userId', count: { $sum: 1 } } },
            ]),
            SavedWork.aggregate([
                { $match: { userId: { $in: userIds } } },
                { $group: { _id: '$userId', count: { $sum: 1 } } },
            ]),
            UserPreferences.find({ userId: { $in: userIds } })
                .select('userId favoriteCategories preferredLanguages')
                .lean(),
            Author.find({ _id: { $in: authorIds } }).select('followerCount').lean(),
        ])

        const playlistMap = new Map(playlistAgg.map((r) => [String(r._id), r.count]))
        const savedMap = new Map(savedAgg.map((r) => [String(r._id), r.count]))
        const prefMap = new Map(prefDocs.map((p) => [String(p.userId), p]))
        const authorFollowerMap = new Map(authorDocs.map((a) => [String(a._id), a.followerCount ?? 0]))

        const users = rawUsers.map((u) => ({
            ...u,
            id: u._id.toString(),
            writerFollowerCount: u.authorId ? (authorFollowerMap.get(String(u.authorId)) ?? 0) : 0,
            playlistCount: playlistMap.get(String(u._id)) ?? 0,
            savedWorkCount: savedMap.get(String(u._id)) ?? 0,
            hasPreferences: prefMap.has(String(u._id)),
            preferenceSummary: prefMap.has(String(u._id))
                ? {
                    favoriteCategories: prefMap.get(String(u._id)).favoriteCategories ?? [],
                    preferredLanguages: prefMap.get(String(u._id)).preferredLanguages ?? [],
                }
                : { favoriteCategories: [], preferredLanguages: [] },
        }))
        const totalPages = Math.max(1, Math.ceil(total / limit))
        res.json({
            users,
            total,
            page,
            limit,
            totalPages,
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** POST /api/victor-access-control/users - Create a new user or admin (admin-only). Body: email, name, password, role (reader|writer|admin). */
router.post('/users', isAdmin, async (req, res) => {
    try {
        const { email, name, password, role: requestedRole } = req.body
        if (!email || typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ error: 'Email is required' })
        }
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' })
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' })
        }
        const allowedRoles = ['reader', 'writer', 'admin']
        const role = allowedRoles.includes(requestedRole) ? requestedRole : 'reader'
        const normalizedEmail = email.trim().toLowerCase()
        const existing = await User.findOne({ email: normalizedEmail })
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' })
        }
        let authorId = null
        if (role === 'writer') {
            const author = await Author.create({
                penName: (name || '').trim() || normalizedEmail.split('@')[0],
                bio: '',
                avatarUrl: '',
            })
            authorId = author._id
        }
        const user = await User.create({
            email: normalizedEmail,
            name: name.trim(),
            password,
            role,
            authorId,
            penName: role === 'writer' ? (name || '').trim() || normalizedEmail.split('@')[0] : '',
        })
        const adminId = req.headers['x-user-id']
        if (adminId) logActivity(adminId, 'admin_user_created', { createdEmail: normalizedEmail, createdRole: role, createdUserId: user._id.toString() }).catch(() => {})
        res.status(201).json(user)
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'An account with this email already exists' })
        }
        console.error('[admin create user]', err)
        res.status(500).json({ error: err.message || 'Failed to create user' })
    }
})

/** PATCH /api/admin/users/:id - Update user role */
router.patch('/users/:id', isAdmin, async (req, res) => {
    try {
        const { role } = req.body
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true })
        if (user) {
            const adminId = req.headers['x-user-id']
            if (adminId) logActivity(adminId, 'admin_role_updated', { targetUserId: req.params.id, targetEmail: user.email, newRole: role }).catch(() => {})
        }
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

/** GET /api/victor-access-control/works - List works with pagination (default: page=1, limit=10). */
router.get('/works', isAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
        const skip = (page - 1) * limit
        const [rawWorks, total] = await Promise.all([
            Work.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('authorId', 'penName').lean(),
            Work.countDocuments(),
        ])
        const works = rawWorks.map((w) => ({
            ...w,
            id: w._id.toString(),
            authorId: w.authorId?._id?.toString?.() ?? w.authorId?.toString?.() ?? null,
            authorPenName: w.authorId?.penName ?? '',
        }))
        const totalPages = Math.max(1, Math.ceil(total / limit))
        res.json({ works, total, page, limit, totalPages })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** PATCH /api/victor-access-control/works/:id - Admin edit a work */
router.patch('/works/:id', isAdmin, async (req, res) => {
    try {
        const { title, excerpt, body, category, genre, status, featured, editorsPick } = req.body
        const update = {}
        if (title !== undefined) update.title = title.trim()
        if (excerpt !== undefined) update.excerpt = excerpt.trim()
        if (body !== undefined) update.body = body.trim()
        if (genre !== undefined) update.genre = genre.trim()
        if (category !== undefined && ['short_story', 'poem', 'novel'].includes(category)) update.category = category
        if (status !== undefined && ['draft', 'pending', 'published'].includes(status)) update.status = status
        if (featured !== undefined) update.featured = Boolean(featured)
        if (editorsPick !== undefined) update.editorsPick = Boolean(editorsPick)

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
        const earlyAccessHours = parseInt(process.env.EARLY_ACCESS_HOURS || '48', 10)
        const work = await Work.findByIdAndUpdate(
            req.params.id,
            {
                status: 'published',
                earlyAccessUntil: new Date(Date.now() + earlyAccessHours * 60 * 60 * 1000),
            },
            { new: true }
        )
        if (!work) return res.status(404).json({ error: 'Work not found' })
        const adminId = req.headers['x-user-id']
        if (adminId) logActivity(adminId, 'work_approved', { workId: req.params.id, workTitle: work.title }).catch(() => {})
        res.json({ ...work.toObject(), id: work._id.toString() })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** DELETE /api/admin/works/:id - Delete a work */
router.delete('/works/:id', isAdmin, async (req, res) => {
    try {
        const work = await Work.findById(req.params.id).select('title').lean()
        await Work.findByIdAndDelete(req.params.id)
        const adminId = req.headers['x-user-id']
        if (adminId && work) logActivity(adminId, 'work_deleted', { workId: req.params.id, workTitle: work.title }).catch(() => {})
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** GET /api/victor-access-control/subscription-payments - List subscription payments (paginated). */
router.get('/subscription-payments', isAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
        const skip = (page - 1) * limit
        const [payments, total] = await Promise.all([
            SubscriptionPayment.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email').lean(),
            SubscriptionPayment.countDocuments(),
        ])
        const list = payments.map(p => ({
            ...p,
            id: p._id.toString(),
            userId: p.userId?._id?.toString(),
            userName: p.userId?.name,
            userEmail: p.userId?.email,
        }))
        const totalPages = Math.max(1, Math.ceil(total / limit))
        res.json({ payments: list, total, page, limit, totalPages })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** GET /api/victor-access-control/payouts - List payouts (paginated). */
router.get('/payouts', isAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
        const skip = (page - 1) * limit
        const [payouts, total] = await Promise.all([
            Payout.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('authorId', 'penName').lean(),
            Payout.countDocuments(),
        ])
        const list = payouts.map(p => ({
            ...p,
            id: p._id.toString(),
            authorId: p.authorId?._id?.toString(),
            authorPenName: p.authorId?.penName,
        }))
        const totalPages = Math.max(1, Math.ceil(total / limit))
        res.json({ payouts: list, total, page, limit, totalPages })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/** GET /api/victor-access-control/comments - List work comments (paginated). */
router.get('/comments', isAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
        const skip = (page - 1) * limit
        const [comments, total] = await Promise.all([
            WorkComment.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
                .populate('userId', 'name email')
                .populate('workId', 'title')
                .lean(),
            WorkComment.countDocuments(),
        ])
        const list = comments.map(c => ({
            ...c,
            id: c._id.toString(),
            userId: c.userId?._id?.toString(),
            userName: c.userId?.name,
            userEmail: c.userId?.email,
            workId: c.workId?._id?.toString(),
            workTitle: c.workId?.title,
        }))
        const totalPages = Math.max(1, Math.ceil(total / limit))
        res.json({ comments: list, total, page, limit, totalPages })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

export default router
