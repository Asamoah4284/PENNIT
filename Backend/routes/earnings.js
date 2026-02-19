import { Router } from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import WriterEarnings from '../models/WriterEarnings.js'
import PayoutMethod from '../models/PayoutMethod.js'
import {
  getPayoutPoolForMonth,
  getWriterPointsForMonth,
} from '../services/earningsService.js'

const router = Router()

function resolveUserId(req) {
  const raw = req.body?.userId ?? req.headers['x-user-id']
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null
  return new mongoose.Types.ObjectId(String(raw))
}

/**
 * GET /api/earnings/estimated
 * For the current user (writer): estimated earnings this month + past months.
 * When monetization disabled, returns { monetizationEnabled: false, estimatedThisMonth: 0, history: [] }.
 */
router.get('/estimated', async (req, res) => {
  try {
    if (process.env.MONETIZATION_ENABLED !== 'true') {
      return res.json({
        monetizationEnabled: false,
        estimatedThisMonth: { points: 0, pointValue: 0, amountGhc: 0, payoutPoolGhc: 0 },
        history: [],
      })
    }

    const userId = resolveUserId(req)
    if (!userId) {
      return res.json({
        monetizationEnabled: true,
        estimatedThisMonth: { points: 0, pointValue: 0, amountGhc: 0, payoutPoolGhc: 0 },
        history: [],
      })
    }

    const user = await User.findById(userId).select('authorId role').lean()
    if (!user || user.role !== 'writer' || !user.authorId) {
      return res.json({
        monetizationEnabled: true,
        estimatedThisMonth: { points: 0, pointValue: 0, amountGhc: 0, payoutPoolGhc: 0 },
        history: [],
      })
    }

    const authorId = user.authorId
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const [payoutPoolGhc, pointsByAuthor] = await Promise.all([
      getPayoutPoolForMonth(currentMonth),
      getWriterPointsForMonth(currentMonth),
    ])
    const myPoints = pointsByAuthor.get(authorId.toString()) || 0
    const totalPoints = [...pointsByAuthor.values()].reduce((s, p) => s + p, 0)
    const pointValue = totalPoints > 0 ? payoutPoolGhc / totalPoints : 0
    const amountGhc = myPoints * pointValue

    const history = await WriterEarnings.find({ authorId })
      .sort({ month: -1 })
      .limit(24)
      .lean()

    res.json({
      monetizationEnabled: true,
      estimatedThisMonth: {
        points: myPoints,
        pointValue,
        amountGhc,
        payoutPoolGhc,
        totalPoints,
      },
      history: history.map((h) => ({
        id: h._id.toString(),
        month: h.month,
        points: h.points,
        pointValue: h.pointValue,
        amountGhc: h.amountGhc,
        status: h.status,
      })),
    })
  } catch (err) {
    console.error('Error fetching estimated earnings:', err)
    res.status(500).json({ error: 'Failed to fetch earnings' })
  }
})

/** GET /api/earnings/payout-method - Current writer's payout method (bank or mobile money). */
router.get('/payout-method', async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const user = await User.findById(userId).select('authorId role').lean()
    if (!user || user.role !== 'writer' || !user.authorId) {
      return res.status(403).json({ error: 'Writers only' })
    }
    const method = await PayoutMethod.findOne({ authorId: user.authorId }).lean()
    if (!method) return res.json({ payoutMethod: null })
    res.json({
      payoutMethod: {
        id: method._id.toString(),
        type: method.type,
        bankCode: method.bankCode,
        accountNumber: method.accountNumber ? '****' + method.accountNumber.slice(-4) : '',
        accountName: method.accountName,
        mobileMoneyNumber: method.mobileMoneyNumber ? '****' + method.mobileMoneyNumber.slice(-4) : '',
        mobileMoneyProvider: method.mobileMoneyProvider,
      },
    })
  } catch (err) {
    console.error('Error fetching payout method:', err)
    res.status(500).json({ error: 'Failed to fetch payout method' })
  }
})

/** PUT /api/earnings/payout-method - Set payout method. Body: { type: 'bank'|'mobile_money', bankCode?, accountNumber?, accountName?, mobileMoneyNumber?, mobileMoneyProvider? } */
router.put('/payout-method', async (req, res) => {
  try {
    if (process.env.MONETIZATION_ENABLED !== 'true') {
      return res.status(400).json({ error: 'Monetization is not enabled' })
    }
    const userId = resolveUserId(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const user = await User.findById(userId).select('authorId role').lean()
    if (!user || user.role !== 'writer' || !user.authorId) {
      return res.status(403).json({ error: 'Writers only' })
    }
    const { type, bankCode, accountNumber, accountName, mobileMoneyNumber, mobileMoneyProvider } = req.body ?? {}
    if (!type || !['bank', 'mobile_money'].includes(type)) {
      return res.status(400).json({ error: 'Valid type (bank or mobile_money) is required' })
    }
    const payload = {
      authorId: user.authorId,
      type,
      bankCode: type === 'bank' ? (bankCode || '') : '',
      accountNumber: type === 'bank' ? (accountNumber || '') : '',
      accountName: type === 'bank' ? (accountName || '') : '',
      mobileMoneyNumber: type === 'mobile_money' ? (mobileMoneyNumber || '') : '',
      mobileMoneyProvider: type === 'mobile_money' ? (mobileMoneyProvider || '') : '',
    }
    const method = await PayoutMethod.findOneAndUpdate(
      { authorId: user.authorId },
      payload,
      { upsert: true, new: true }
    )
    res.json({
      payoutMethod: {
        id: method._id.toString(),
        type: method.type,
        accountName: method.accountName,
        mobileMoneyProvider: method.mobileMoneyProvider,
      },
    })
  } catch (err) {
    console.error('Error saving payout method:', err)
    res.status(500).json({ error: 'Failed to save payout method' })
  }
})

export default router
