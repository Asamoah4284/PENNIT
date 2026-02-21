import WorkHighlight from '../models/WorkHighlight.js'
import Work from '../models/Work.js'
import mongoose from 'mongoose'

/**
 * POST /api/works/:id/highlights
 * Body: { text, color, note, userId }
 */
export async function createWorkHighlight(req, res) {
    try {
        const workId = req.params.id
        const { text, color, note, userId: bodyUserId } = req.body

        const rawUserId = req.headers['x-user-id'] || bodyUserId
        if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
            return res.status(401).json({ error: 'Authentication required' })
        }
        const userId = new mongoose.Types.ObjectId(String(rawUserId))

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Highlight text is required' })
        }

        const work = await Work.findById(workId)
        if (!work) {
            return res.status(404).json({ error: 'Work not found' })
        }

        const highlight = await WorkHighlight.create({
            workId: work._id,
            userId,
            text: text.trim(),
            color: color || 'yellow',
            note: (note || '').trim(),
        })

        res.status(201).json(highlight)
    } catch (err) {
        console.error('Error creating highlight:', err)
        res.status(500).json({ error: 'Failed to create highlight' })
    }
}

/**
 * GET /api/works/:id/highlights
 * List highlights for a specific work for the current user.
 */
export async function listWorkHighlights(req, res) {
    try {
        const workId = req.params.id
        const rawUserId = req.headers['x-user-id']
        if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
            return res.status(401).json({ error: 'Authentication required' })
        }
        const userId = new mongoose.Types.ObjectId(String(rawUserId))

        const highlights = await WorkHighlight.find({ workId, userId }).sort({ createdAt: -1 })
        res.json(highlights)
    } catch (err) {
        console.error('Error listing highlights:', err)
        res.status(500).json({ error: 'Failed to list highlights' })
    }
}

/**
 * DELETE /api/highlights/:id
 */
export async function deleteHighlight(req, res) {
    try {
        const highlightId = req.params.id
        const rawUserId = req.headers['x-user-id']
        if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
            return res.status(401).json({ error: 'Authentication required' })
        }
        const userId = new mongoose.Types.ObjectId(String(rawUserId))

        const highlight = await WorkHighlight.findOneAndDelete({ _id: highlightId, userId })
        if (!highlight) {
            return res.status(404).json({ error: 'Highlight not found or unauthorized' })
        }

        res.status(204).send()
    } catch (err) {
        console.error('Error deleting highlight:', err)
        res.status(500).json({ error: 'Failed to delete highlight' })
    }
}

/**
 * GET /api/users/me/highlights
 * List all highlights for the current user across all works.
 */
export async function listMyHighlights(req, res) {
    try {
        const rawUserId = req.headers['x-user-id']
        if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
            return res.status(401).json({ error: 'Authentication required' })
        }
        const userId = new mongoose.Types.ObjectId(String(rawUserId))

        const highlights = await WorkHighlight.find({ userId })
            .populate('workId', 'title category authorId')
            .sort({ createdAt: -1 })

        res.json(highlights)
    } catch (err) {
        console.error('Error fetching my highlights:', err)
        res.status(500).json({ error: 'Failed to fetch highlights' })
    }
}
