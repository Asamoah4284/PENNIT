import Subscription from '../models/Subscription.js'
import { getMonetizationEnabled } from '../services/appConfigService.js'

/**
 * When monetization is on (admin toggle), requires the current user to have an active subscription.
 * When off, calls next() (no paywall).
 * User identity: req.body.userId or req.headers['x-user-id']. If missing when monetization on, 401.
 */
export async function requireActiveSubscription(req, res, next) {
  if (!getMonetizationEnabled()) {
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
