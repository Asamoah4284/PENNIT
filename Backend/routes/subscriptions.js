import { Router } from 'express'
import mongoose from 'mongoose'
import SubscriptionPlan from '../models/SubscriptionPlan.js'
import Subscription from '../models/Subscription.js'
import SubscriptionPayment from '../models/SubscriptionPayment.js'
import * as paymentProvider from '../services/paymentProvider.js'

const router = Router()

function resolveUserId(req) {
  const raw = req.body?.userId ?? req.headers['x-user-id']
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null
  return new mongoose.Types.ObjectId(String(raw))
}

/** GET /api/subscriptions/plans - List subscription plans (e.g. monthly GHC). */
router.get('/plans', async (_req, res) => {
  try {
    let plans = await SubscriptionPlan.find().lean()
    if (plans.length === 0) {
      await SubscriptionPlan.create({
        name: 'Monthly',
        amountGhc: 20,
        billingInterval: 'monthly',
        currency: 'GHC',
      })
      plans = await SubscriptionPlan.find().lean()
    }
    res.json(
      plans.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        amountGhc: p.amountGhc,
        billingInterval: p.billingInterval,
        currency: p.currency,
      }))
    )
  } catch (err) {
    console.error('Error fetching subscription plans:', err)
    res.status(500).json({ error: 'Failed to fetch plans' })
  }
})

/** GET /api/subscriptions/me - Current user's subscription (optional auth). */
router.get('/me', async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.json({ subscription: null })
    }
    const sub = await Subscription.findOne({
      userId,
      status: 'active',
      currentPeriodEnd: { $gt: new Date() },
    })
      .populate('planId', 'name amountGhc billingInterval currency')
      .lean()
    if (!sub) {
      return res.json({ subscription: null })
    }
    res.json({
      subscription: {
        id: sub._id.toString(),
        planId: sub.planId?._id?.toString(),
        plan: sub.planId,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
    })
  } catch (err) {
    console.error('Error fetching my subscription:', err)
    res.status(500).json({ error: 'Failed to fetch subscription' })
  }
})

/** POST /api/subscriptions - Create checkout session for a plan. Body: { planId, returnUrl?, cancelUrl? }. */
router.post('/', async (req, res) => {
  try {
    if (process.env.MONETIZATION_ENABLED !== 'true') {
      return res.status(400).json({ error: 'Monetization is not enabled' })
    }
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { planId, returnUrl, cancelUrl } = req.body ?? {}
    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ error: 'Valid planId is required' })
    }

    const plan = await SubscriptionPlan.findById(planId)
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const result = await paymentProvider.createSubscription({
      userId: userId.toString(),
      planId,
      amountGhc: plan.amountGhc,
      returnUrl: returnUrl || `${baseUrl}/reader?sub=success`,
      cancelUrl: cancelUrl || `${baseUrl}/pricing?cancel=1`,
    })

    res.json({
      checkoutUrl: result.checkoutUrl,
      externalSubscriptionId: result.externalSubscriptionId,
    })
  } catch (err) {
    console.error('Error creating subscription checkout:', err)
    res.status(500).json({ error: 'Failed to create checkout' })
  }
})

/** POST /api/subscriptions/webhook - Payment provider webhook (e.g. renewal, success). */
router.post('/webhook', async (req, res) => {
  try {
    const result = await paymentProvider.handleWebhook(req)
    if (!result.handled) {
      return res.status(200).send()
    }
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Subscription webhook error:', err)
    res.status(500).json({ error: 'Webhook failed' })
  }
})

/** POST /api/subscriptions/cancel - Cancel current subscription. */
router.post('/cancel', async (req, res) => {
  try {
    const userId = resolveUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const sub = await Subscription.findOne({ userId, status: 'active' })
    if (!sub) {
      return res.status(404).json({ error: 'No active subscription found' })
    }

    await paymentProvider.cancelSubscription(sub.externalSubscriptionId || '')
    sub.status = 'canceled'
    await sub.save()

    res.json({ canceled: true })
  } catch (err) {
    console.error('Error canceling subscription:', err)
    res.status(500).json({ error: 'Failed to cancel' })
  }
})

export default router
