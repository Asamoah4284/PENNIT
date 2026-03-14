import { Router } from 'express'
import { getMonetizationEnabled } from '../services/appConfigService.js'

const router = Router()

/**
 * GET /api/config
 * Public config for frontend (e.g. feature flags).
 * monetizationEnabled: from DB (admin toggle) or env fallback.
 */
router.get('/', (_req, res) => {
  const monetizationEnabled = getMonetizationEnabled()
  const earlyAccessHours = parseInt(process.env.EARLY_ACCESS_HOURS || '48', 10)
  res.json({ monetizationEnabled, earlyAccessHours })
})

export default router
