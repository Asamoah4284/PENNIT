import { Router } from 'express'
import { getPersonalizedFeed, getUserPreferences } from '../controllers/feedController.js'

const router = Router()

/**
 * GET /api/feed
 *
 * Personalised feed for the requesting user.
 * Pass x-user-id header (or ?userId=) for personalisation.
 * Anonymous users receive a popularity + recency ranked feed.
 *
 * Query params:
 *   limit  {number}  Items per page (default 20, max 50)
 *   page   {number}  1-based page number (default 1)
 */
router.get('/', getPersonalizedFeed)

/**
 * GET /api/feed/preferences
 *
 * Returns the preference profile for the authenticated user.
 * Requires x-user-id header.
 */
router.get('/preferences', getUserPreferences)

export default router
