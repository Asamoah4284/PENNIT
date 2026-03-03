import User from '../models/User.js'
import Subscription from '../models/Subscription.js'
import SubscriptionPlan from '../models/SubscriptionPlan.js'

const TRIAL_DAYS = 14

/**
 * Get trial end date for a user (createdAt + TRIAL_DAYS).
 * @param {Date|string} createdAt
 * @returns {Date}
 */
export function getTrialEndDate(createdAt) {
  if (!createdAt) return null
  const d = new Date(createdAt)
  d.setDate(d.getDate() + TRIAL_DAYS)
  return d
}

/**
 * Resolve subscription status for a user: trial, active subscription, and derived flags.
 * - isSubscriber: has full subscriber access (either in trial OR has any active subscription)
 * - canTip: only true for active READER plan (GHC 9.99) — not trial, not writer plan
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<{
 *   trialEndsAt: string|null,
 *   isInTrialPeriod: boolean,
 *   subscription: object|null,
 *   planType: 'reader'|'writer'|null,
 *   isSubscriber: boolean,
 *   canTip: boolean,
 * }>}
 */
export async function getSubscriptionStatus(userId) {
  if (!userId) {
    return {
      trialEndsAt: null,
      isInTrialPeriod: false,
      subscription: null,
      planType: null,
      isSubscriber: false,
      canTip: false,
    }
  }

  const user = await User.findById(userId).select('createdAt').lean()
  const trialEndsAt = user?.createdAt ? getTrialEndDate(user.createdAt) : null
  const now = new Date()
  const isInTrialPeriod = trialEndsAt ? trialEndsAt > now : false

  const sub = await Subscription.findOne({
    userId,
    status: 'active',
    currentPeriodEnd: { $gt: now },
  })
    .populate('planId')
    .lean()

  const planType = sub?.planId?.planType ?? null
  const hasActivePaidSubscription = !!sub

  // Subscriber access: trial OR any active subscription
  const isSubscriber = isInTrialPeriod || hasActivePaidSubscription

  // Only paid Reader plan (9.99) can tip — not trial, not writer plan
  const canTip = hasActivePaidSubscription && planType === 'reader'

  return {
    trialEndsAt: trialEndsAt?.toISOString?.() ?? null,
    isInTrialPeriod,
    subscription: sub
      ? {
          id: sub._id.toString(),
          planId: sub.planId?._id?.toString(),
          plan: sub.planId ? { id: sub.planId._id.toString(), name: sub.planId.name, amountGhc: sub.planId.amountGhc, planType: sub.planId.planType } : null,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
        }
      : null,
    planType,
    isSubscriber,
    canTip,
  }
}

/**
 * Batch: get isSubscriber for multiple user IDs (for comments list).
 * @param {string[]} userIds
 * @returns {Promise<Map<string, boolean>>} userId -> isSubscriber
 */
export async function getSubscriberFlagsForUsers(userIds) {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return new Map()

  const users = await User.find({ _id: { $in: unique } }).select('createdAt').lean()
  const trialEndByUser = new Map()
  const now = new Date()
  for (const u of users) {
    const end = u.createdAt ? getTrialEndDate(u.createdAt) : null
    trialEndByUser.set(u._id.toString(), end && end > now)
  }

  const subs = await Subscription.find({
    userId: { $in: unique },
    status: 'active',
    currentPeriodEnd: { $gt: now },
  })
    .select('userId')
    .lean()

  const hasSubByUser = new Map(subs.map((s) => [s.userId.toString(), true]))

  const result = new Map()
  for (const id of unique) {
    const trial = trialEndByUser.get(id) ?? false
    const paid = hasSubByUser.get(id) ?? false
    result.set(id, trial || paid)
  }
  return result
}
