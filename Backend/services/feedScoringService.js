import mongoose from 'mongoose'
import UserPostInteraction from '../models/UserPostInteraction.js'
import UserPreferences from '../models/UserPreferences.js'

// ─────────────────────────────────────────────────────────────────────────────
// Interaction-level engagement weights
// These define how much each user action contributes to the per-post score
// that feeds back into the recommendation engine.
// ─────────────────────────────────────────────────────────────────────────────
const INTERACTION_WEIGHTS = {
  readTime:  0.4,  // points per second (long reads signal genuine interest)
  liked:     3,    // clap = strong positive signal
  commented: 5,    // comment = very strong intent to engage
  shared:    6,    // share = highest endorsement; user is a brand ambassador
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed relevance boost constants
// Applied when scoring candidate works for a user's personalised feed.
// ─────────────────────────────────────────────────────────────────────────────
const FEED_BOOST = {
  topCategory:     15,   // user's single most-engaged category
  rankCategory:    8,    // other preferred categories (scaled by rank)
  topLanguage:     10,   // user's most-read language
  otherLanguage:   5,    // other preferred languages
  topAuthor:       20,   // user's most-engaged author
  otherAuthor:     10,   // other preferred authors
  rawCategoryWt:   0.30, // weight for raw category engagement score contribution
  rawLangWt:       0.20, // weight for raw language engagement score contribution
  rawAuthorWt:     0.25, // weight for raw author engagement score contribution
  popularRead:     0.01, // per read count
  popularClap:     0.02, // per clap count
  popularComment:  0.03, // per comment count
  timeOfDayGenre:  8,    // bonus for a genre that matches the current time of day
  recencyMax:      10,   // maximum recency contribution
}

// Half-life for recency decay: after 7 days a work gets ~50% of its recency score.
const RECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000

// ─────────────────────────────────────────────────────────────────────────────
// Time-of-day → genre affinity mapping
// Readers' moods shift throughout the day; we bias the feed toward genres that
// empirically match those moods.
// ─────────────────────────────────────────────────────────────────────────────
const TIME_GENRE_MAP = {
  morning:   ['adventure', 'motivational', 'historical', 'educational', 'inspirational'],
  afternoon: ['comedy', 'romance', 'literary fiction', 'thriller', 'fantasy'],
  evening:   ['drama', 'mystery', 'mental health', 'suspense', 'crime'],
  night:     ['poetry', 'romance', 'spiritual', 'emotional', 'reflective', 'general'],
}

/**
 * Map an hour-of-day (0–23) to a named time period.
 * @param {number} hour
 * @returns {'morning'|'afternoon'|'evening'|'night'}
 */
function getTimeOfDay(hour) {
  if (hour >= 5 && hour <= 11) return 'morning'
  if (hour >= 12 && hour <= 17) return 'afternoon'
  if (hour >= 18 && hour <= 21) return 'evening'
  return 'night'
}

/**
 * Safely extract a value from a mongoose Map or plain object.
 * @param {Map|object} mapOrObj
 * @param {string} key
 * @returns {number}
 */
function mapGet(mapOrObj, key) {
  if (!mapOrObj) return 0
  if (typeof mapOrObj.get === 'function') return mapOrObj.get(key) ?? 0
  return mapOrObj[key] ?? 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the engagement score for a single user-post interaction record.
 *
 * Formula:
 *   score = (readTime × 0.4) + (liked × 3) + (commented × 5) + (shared × 6)
 *
 * @param {{ readTime?: number, liked?: boolean, commented?: boolean, shared?: boolean }} signals
 * @returns {number}
 */
export function computeInteractionScore({
  readTime  = 0,
  liked     = false,
  commented = false,
  shared    = false,
}) {
  return (
    readTime  * INTERACTION_WEIGHTS.readTime  +
    (liked     ? INTERACTION_WEIGHTS.liked     : 0) +
    (commented ? INTERACTION_WEIGHTS.commented : 0) +
    (shared    ? INTERACTION_WEIGHTS.shared    : 0)
  )
}

/**
 * Score a single work against a user's preference profile for feed ranking.
 *
 * Combines:
 *  - Category affinity (rank + raw engagement weight)
 *  - Language affinity (rank + raw engagement weight)
 *  - Author affinity (rank + raw engagement weight)
 *  - Popularity (readCount, clapCount, commentCount)
 *  - Recency (exponential decay with 7-day half-life)
 *  - Time-of-day genre bonus
 *
 * @param {object} work       - Lean work document (authorId may be populated)
 * @param {object|null} prefs - UserPreferences document (lean or Mongoose), or null for anonymous
 * @param {number} [currentHour] - 0–23, defaults to current server hour
 * @returns {number} Feed relevance score (higher = show first)
 */
export function scoreWorkForFeed(work, prefs, currentHour = new Date().getHours()) {
  let score = 0

  if (prefs) {
    // ── Category preference ─────────────────────────────────────────────────
    const favCats = prefs.favoriteCategories || []
    const catRank = favCats.indexOf(work.category)
    if (catRank === 0)      score += FEED_BOOST.topCategory
    else if (catRank > 0)   score += FEED_BOOST.rankCategory / (catRank + 1)

    // Raw engagement weight contributes proportionally
    score += mapGet(prefs.engagementByCategory, work.category) * FEED_BOOST.rawCategoryWt

    // ── Language preference ─────────────────────────────────────────────────
    const favLangs = prefs.preferredLanguages || []
    if (favLangs[0] === work.language)          score += FEED_BOOST.topLanguage
    else if (favLangs.includes(work.language))  score += FEED_BOOST.otherLanguage

    score += mapGet(prefs.engagementByLanguage, work.language) * FEED_BOOST.rawLangWt

    // ── Author preference ───────────────────────────────────────────────────
    const authorStr = (
      work.authorId?._id?.toString?.() ??
      work.authorId?.toString?.() ??
      String(work.authorId ?? '')
    )
    const favAuthors = (prefs.favoriteAuthors || []).map((id) =>
      id?.toString?.() ?? String(id)
    )
    if (favAuthors[0] === authorStr)         score += FEED_BOOST.topAuthor
    else if (favAuthors.includes(authorStr)) score += FEED_BOOST.otherAuthor

    score += mapGet(prefs.engagementByAuthor, authorStr) * FEED_BOOST.rawAuthorWt
  }

  // ── Popularity signals ────────────────────────────────────────────────────
  score += (work.readCount    ?? 0) * FEED_BOOST.popularRead
  score += (work.clapCount    ?? 0) * FEED_BOOST.popularClap
  score += (work.commentCount ?? 0) * FEED_BOOST.popularComment

  // ── Recency (exponential decay) ───────────────────────────────────────────
  // A brand-new post gets the full recencyMax; a 7-day-old post gets ~5.
  const ageMs = Date.now() - new Date(work.createdAt).getTime()
  score += Math.exp(-ageMs / RECENCY_HALF_LIFE_MS) * FEED_BOOST.recencyMax

  // ── Time-of-day genre boost ───────────────────────────────────────────────
  const tod = getTimeOfDay(currentHour)
  const todGenres = TIME_GENRE_MAP[tod] || []
  const genreLower = (work.genre || '').toLowerCase()
  if (todGenres.some((g) => genreLower.includes(g))) {
    score += FEED_BOOST.timeOfDayGenre
  }

  return score
}

/**
 * Upsert a UserPostInteraction record with the latest engagement signals and
 * trigger an asynchronous preference rebuild.
 *
 * Called from:
 *  - workReadController   (after countedAsRead) → readTime, language
 *  - workSocialController (after clap)          → liked
 *  - workSocialController (after comment)       → commented
 *  - workSocialController (after share)         → shared
 *
 * @param {string|ObjectId} userId
 * @param {object} work - { _id, authorId, category, genre }
 * @param {{ readTime?: number, liked?: boolean, commented?: boolean, shared?: boolean, language?: string }} signals
 */
export async function recordInteraction(userId, work, signals = {}) {
  if (!userId || !work?._id) return

  const userOid = mongoose.Types.ObjectId.isValid(String(userId))
    ? new mongoose.Types.ObjectId(String(userId))
    : userId

  const { readTime = 0, liked, commented, shared, language } = signals
  const now = new Date()

  // Build $set: always update denormalised metadata + hourOfDay
  const setFields = {
    authorId: work.authorId?._id ?? work.authorId ?? null,
    category: work.category || '',
    genre:    work.genre    || '',
    hourOfDay: now.getHours(),
  }
  if (language  !== undefined) setFields.language  = language
  if (liked     !== undefined) setFields.liked     = liked
  if (commented !== undefined) setFields.commented = commented
  if (shared    !== undefined) setFields.shared    = shared

  // Upsert: create if missing; use $max so readTime only ever increases per user-post pair
  const updated = await UserPostInteraction.findOneAndUpdate(
    { userId: userOid, workId: work._id },
    {
      $setOnInsert: { userId: userOid, workId: work._id, createdAt: now },
      $set: setFields,
      ...(readTime > 0 ? { $max: { readTime } } : {}),
    },
    { upsert: true, new: true }
  )

  // Recompute and persist engagement score from accumulated signals
  const freshScore = computeInteractionScore({
    readTime:  updated.readTime,
    liked:     updated.liked,
    commented: updated.commented,
    shared:    updated.shared,
  })
  await UserPostInteraction.updateOne(
    { _id: updated._id },
    { $set: { engagementScore: freshScore } }
  )

  // Rebuild user preferences asynchronously — must not block the HTTP response
  rebuildUserPreferences(userOid).catch((err) =>
    console.error('[feed] Preference rebuild failed:', err.message)
  )
}

/**
 * Fully rebuild a user's preference profile from their complete interaction
 * history. Safe to call at any time; always produces a consistent result.
 *
 * Uses four parallel aggregation pipelines for performance:
 *  1. Engagement score per category
 *  2. Engagement score per language
 *  3. Engagement score per author (top 20)
 *  4. Interaction count per hour of day
 *
 * @param {ObjectId} userOid
 */
export async function rebuildUserPreferences(userOid) {
  const oid = mongoose.Types.ObjectId.isValid(String(userOid))
    ? new mongoose.Types.ObjectId(String(userOid))
    : userOid

  // Run all four aggregations in parallel for efficiency
  const [categoryAgg, languageAgg, authorAgg, hoursAgg] = await Promise.all([
    // Total engagement per category, sorted descending
    UserPostInteraction.aggregate([
      { $match: { userId: oid } },
      { $group: { _id: '$category', totalScore: { $sum: '$engagementScore' } } },
      { $sort:  { totalScore: -1 } },
      { $limit: 10 },
    ]),

    // Total engagement per language
    UserPostInteraction.aggregate([
      { $match: { userId: oid } },
      { $group: { _id: '$language', totalScore: { $sum: '$engagementScore' } } },
      { $sort:  { totalScore: -1 } },
    ]),

    // Top 20 authors by total engagement
    UserPostInteraction.aggregate([
      { $match: { userId: oid, authorId: { $ne: null } } },
      { $group: { _id: '$authorId', totalScore: { $sum: '$engagementScore' } } },
      { $sort:  { totalScore: -1 } },
      { $limit: 20 },
    ]),

    // Interaction frequency per hour of day (time-pattern detection)
    UserPostInteraction.aggregate([
      { $match: { userId: oid } },
      { $group: { _id: '$hourOfDay', count: { $sum: 1 } } },
    ]),
  ])

  // Flatten aggregation results into plain objects for MongoDB Map storage
  const engagementByCategory = {}
  const favoriteCategories   = []
  for (const row of categoryAgg) {
    if (row._id) {
      engagementByCategory[row._id] = row.totalScore
      favoriteCategories.push(row._id)
    }
  }

  const engagementByLanguage = {}
  const preferredLanguages   = []
  for (const row of languageAgg) {
    if (row._id) {
      engagementByLanguage[row._id] = row.totalScore
      preferredLanguages.push(row._id)
    }
  }

  const engagementByAuthor = {}
  const favoriteAuthors    = []
  for (const row of authorAgg) {
    if (row._id) {
      engagementByAuthor[row._id.toString()] = row.totalScore
      favoriteAuthors.push(row._id)
    }
  }

  const activeHours = {}
  for (const row of hoursAgg) {
    if (row._id !== null && row._id !== undefined) {
      activeHours[String(row._id)] = row.count
    }
  }

  await UserPreferences.findOneAndUpdate(
    { userId: oid },
    {
      $set: {
        favoriteCategories,
        preferredLanguages,
        favoriteAuthors,
        engagementByCategory,
        engagementByLanguage,
        engagementByAuthor,
        activeHours,
        lastRecalculated: new Date(),
      },
    },
    { upsert: true }
  )
}
