import { Router } from 'express'

const router = Router()

/**
 * GET /api/config
 * Public config for frontend (e.g. feature flags).
 * monetizationEnabled: when true, subscription/paywall and writer earnings are active.
 */
router.get('/', (_req, res) => {
  const monetizationEnabled = process.env.MONETIZATION_ENABLED === 'true'
  const earlyAccessHours = parseInt(process.env.EARLY_ACCESS_HOURS || '48', 10)
  res.json({ monetizationEnabled, earlyAccessHours })
})

export default router
