import Subscription from '../models/Subscription.js'

/**
 * When MONETIZATION_ENABLED is true, requires the current user to have an active subscription.
 * When false, calls next() (no paywall).
 * User identity: req.body.userId or req.headers['x-user-id']. If missing when monetization on, 401.
 */
export async function requireActiveSubscription(req, res, next) {
  if (process.env.MONETIZATION_ENABLED !== 'true') {
    return next()
  }

  const raw = req.body?.userId ?? req.headers['x-user-id']
  if (!raw) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const active = await Subscription.findOne({
    userId: raw,
    status: 'active',
    currentPeriodEnd: { $gt: new Date() },
  })
  if (!active) {
    return res.status(402).json({ error: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' })
  }

  req.subscription = active
  next()
}
