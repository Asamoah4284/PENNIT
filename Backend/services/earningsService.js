import mongoose from 'mongoose'
import WorkRead from '../models/WorkRead.js'
import Work from '../models/Work.js'
import WriterEarnings from '../models/WriterEarnings.js'
import SubscriptionPayment from '../models/SubscriptionPayment.js'
import { getPointsForCategory, getPlatformCost } from '../lib/monetizationConfig.js'

/**
 * Get start and end of calendar month.
 * @param {string} month - 'YYYY-MM'
 */
function getMonthBounds(month) {
  const [y, m] = month.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
  return { start, end }
}

/**
 * Revenue pool for a month: sum of succeeded subscription payments in that month.
 * @param {string} month - 'YYYY-MM'
 * @returns {Promise<number>} Total GHC
 */
export async function getRevenuePoolForMonth(month) {
  const { start, end } = getMonthBounds(month)
  const result = await SubscriptionPayment.aggregate([
    { $match: { status: 'succeeded', periodStart: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$amountGhc' } } },
  ])
  return result[0]?.total ?? 0
}

/**
 * Payout pool = revenue pool − platform cost (floor 0).
 */
export async function getPayoutPoolForMonth(month) {
  const revenue = await getRevenuePoolForMonth(month)
  const cost = getPlatformCost(revenue)
  return Math.max(0, revenue - cost)
}

/**
 * Writer points per author for the month: sum over WorkRead (countedAsRead, in month) × points(Work.category).
 * @param {string} month - 'YYYY-MM'
 * @returns {Promise<Map<string, number>>} authorId (string) -> points
 */
export async function getWriterPointsForMonth(month) {
  const { start, end } = getMonthBounds(month)
  const reads = await WorkRead.find({
    countedAsRead: true,
    createdAt: { $gte: start, $lte: end },
  })
    .select('workId')
    .lean()

  const workIds = [...new Set(reads.map((r) => r.workId.toString()))]
  const works = await Work.find({ _id: { $in: workIds } }).select('authorId category').lean()
  const workMap = Object.fromEntries(works.map((w) => [w._id.toString(), w]))

  const pointsByAuthor = new Map()
  for (const r of reads) {
    const w = workMap[r.workId.toString()]
    if (!w) continue
    const authorId = w.authorId?.toString?.() ?? w.authorId
    if (!authorId) continue
    const pts = getPointsForCategory(w.category)
    pointsByAuthor.set(authorId, (pointsByAuthor.get(authorId) || 0) + pts)
  }

  return pointsByAuthor
}

/**
 * Calculate and persist WriterEarnings for a month. Run only when MONETIZATION_ENABLED.
 * @param {string} month - 'YYYY-MM'
 */
export async function calculateAndPersistEarningsForMonth(month) {
  if (process.env.MONETIZATION_ENABLED !== 'true') {
    return
  }

  const payoutPool = await getPayoutPoolForMonth(month)
  const pointsByAuthor = await getWriterPointsForMonth(month)
  const totalPoints = [...pointsByAuthor.values()].reduce((s, p) => s + p, 0)
  const pointValue = totalPoints > 0 ? payoutPool / totalPoints : 0

  for (const [authorIdStr, points] of pointsByAuthor) {
    const amountGhc = points * pointValue
    await WriterEarnings.findOneAndUpdate(
      { authorId: new mongoose.Types.ObjectId(authorIdStr), month },
      {
        authorId: new mongoose.Types.ObjectId(authorIdStr),
        month,
        points,
        pointValue,
        amountGhc,
        status: 'calculated',
      },
      { upsert: true }
    )
  }
}
