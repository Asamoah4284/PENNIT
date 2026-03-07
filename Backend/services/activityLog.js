import Activity from '../models/Activity.js'

/**
 * Log a user activity for the admin activity feed. Fire-and-forget; never throws.
 * @param {string|import('mongoose').Types.ObjectId} userId - User who performed the action
 * @param {string} action - Action type (e.g. 'signup', 'login', 'work_created', 'role_switch')
 * @param {Record<string, unknown>} [meta] - Optional extra data (workId, workTitle, targetUserId, etc.)
 */
export async function logActivity(userId, action, meta = {}) {
  if (!userId || !action) return
  try {
    await Activity.create({
      userId,
      action: String(action),
      meta: meta && typeof meta === 'object' ? meta : {},
    })
  } catch (err) {
    console.error('[activityLog]', err.message)
  }
}
