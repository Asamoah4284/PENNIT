import mongoose from 'mongoose'
import Work from '../models/Work.js'
import Tip from '../models/Tip.js'
import { getSubscriptionStatus } from '../services/subscriptionStatusService.js'
import { getMonetizationEnabled } from '../services/appConfigService.js'

const TIP_MAX_GHC = 9.99
const TIP_MIN_GHC = 0.01

/** Platform fee percentage on tips (env TIP_FEE_PERCENT, default 0). */
function getTipFeePercent() {
  const p = Number(process.env.TIP_FEE_PERCENT)
  if (Number.isNaN(p) || p < 0 || p > 100) return 0
  return p
}

function resolveUserId(req) {
  const raw = req.body?.userId ?? req.headers['x-user-id']
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null
  return new mongoose.Types.ObjectId(String(raw))
}

/**
 * POST /api/works/:id/tip
 * Only readers with active Reader plan (canTip) can tip. Amount between TIP_MIN_GHC and TIP_MAX_GHC.
 */
export async function createWorkTip(req, res) {
  try {
    if (!getMonetizationEnabled()) {
      return res.status(400).json({ error: 'Tipping is not enabled' })
    }

    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const workId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({ error: 'Invalid work ID' })
    }

    const status = await getSubscriptionStatus(userId)
    if (!status.canTip) {
      return res.status(403).json({
        error: 'Only subscribers on the Reader plan (GHC 9.99/month) can tip writers.',
      })
    }

    const rawAmount = Number(req.body?.amountGhc)
    if (Number.isNaN(rawAmount) || rawAmount < TIP_MIN_GHC || rawAmount > TIP_MAX_GHC) {
      return res.status(400).json({
        error: `Tip amount must be between GH₵${TIP_MIN_GHC} and GH₵${TIP_MAX_GHC}`,
      })
    }

    const amountGhc = Math.round(rawAmount * 100) / 100
    const feePercent = getTipFeePercent()
    const platformFeeGhc = Math.round((amountGhc * feePercent) / 100 * 100) / 100
    const writerAmountGhc = Math.round((amountGhc - platformFeeGhc) * 100) / 100

    const work = await Work.findById(workId).select('authorId').lean()
    if (!work) {
      return res.status(404).json({ error: 'Work not found' })
    }

    const toAuthorId = work.authorId
    if (!toAuthorId) {
      return res.status(400).json({ error: 'Work has no author' })
    }

    const tip = await Tip.create({
      fromUserId: userId,
      toAuthorId,
      workId: work._id,
      amountGhc,
      platformFeeGhc,
      writerAmountGhc,
      status: 'completed',
    })

    res.status(201).json(tip.toJSON())
  } catch (err) {
    console.error('[createWorkTip]', err)
    res.status(500).json({ error: 'Failed to process tip' })
  }
}
