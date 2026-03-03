import mongoose from 'mongoose'
import Work from '../models/Work.js'
import UserPreferences from '../models/UserPreferences.js'
import UserPostInteraction from '../models/UserPostInteraction.js'
import { scoreWorkForFeed } from '../services/feedScoringService.js'

// ─────────────────────────────────────────────────────────────────────────────
// Feed configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Default number of works to return per page. */
const DEFAULT_LIMIT = 20

/** Maximum candidate pool fetched from MongoDB before in-memory scoring. */
const CANDIDATE_POOL = 120

/**
 * Fraction of the final feed reserved for exploration / discovery.
 * These slots are filled with random published works outside the user's known
 * preferences, deliberately injecting novelty to broaden taste profiles.
 */
const EXPLORATION_RATIO = 0.20

/** Number of random exploration works to query. */
const EXPLORATION_COUNT = Math.ceil(DEFAULT_LIMIT * EXPLORATION_RATIO)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function resolveUserId(req) {
  const raw = req.headers['x-user-id'] ?? req.query.userId
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null
  return new mongoose.Types.ObjectId(String(raw))
}

/**
 * Fisher-Yates shuffle on a copy of the array. Used for exploration slots.
 * @param {any[]} arr
 * @returns {any[]}
 */
function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Format a lean Work document to a consistent API shape.
 */
function formatWork(w) {
  const authorId =
    w.authorId && typeof w.authorId === 'object' && w.authorId._id
      ? w.authorId._id.toString()
      : w.authorId?.toString?.() ?? null

  const author =
    w.authorId && typeof w.authorId === 'object' && w.authorId.penName != null
      ? { id: authorId, penName: w.authorId.penName, avatarUrl: w.authorId.avatarUrl ?? '' }
      : null

  return {
    ...w,
    id: w._id.toString(),
    authorId,
    author,
    createdAt: w.createdAt?.toISOString?.() ?? w.createdAt,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/feed
 *
 * Returns a personalised paginated feed of published works for the requesting user.
 *
 * Algorithm (TikTok-style):
 *  1. Resolve user identity and load their preference profile.
 *  2. Identify work IDs the user has already engaged with (to de-prioritise).
 *  3. Build a candidate pool:
 *       a. Primary (80%): works matching preferred categories, scored by
 *          category/language/author affinity + popularity + recency + time-of-day.
 *       b. Exploration (20%): random published works for novelty.
 *  4. Score and sort the primary pool; de-duplicate with the exploration set.
 *  5. Interleave: every 5th slot is an exploration work.
 *  6. Apply pagination and return.
 *
 * Query params:
 *   limit  {number}  Items per page (default 20, max 50)
 *   page   {number}  1-based page number (default 1)
 *
 * @type {import('express').RequestHandler}
 */
export async function getPersonalizedFeed(req, res) {
  try {
    const userId = resolveUserId(req)

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), 50)
    const page  = Math.max(parseInt(req.query.page,  10) || 1, 1)
    const skip  = (page - 1) * limit
    const currentHour = new Date().getHours()

    // ── 1. Load user preferences ──────────────────────────────────────────
    let prefs = null
    let interactedWorkIds = new Set()

    if (userId) {
      prefs = await UserPreferences.findOne({ userId }).lean()

      // Works the user has already strongly engaged with (liked OR commented)
      // We still show them but at a penalised score — we don't hard-exclude them
      // so the user can always revisit content. Collect IDs for scoring context.
      const interactions = await UserPostInteraction.find(
        { userId, $or: [{ liked: true }, { commented: true }, { shared: true }] }
      ).select('workId').lean()

      interactedWorkIds = new Set(interactions.map((i) => i.workId.toString()))
    }

    // ── 2. Primary candidate pool ─────────────────────────────────────────
    // Bias toward preferred categories if the user has preferences; otherwise
    // use all published works so new users get a sensible generic feed.
    const favCats = prefs?.favoriteCategories?.slice(0, 3) ?? []

    const primaryQuery = { status: 'published' }
    if (favCats.length > 0) {
      // Preferred categories first, then fill up to CANDIDATE_POOL with anything
      primaryQuery.category = { $in: favCats }
    }

    const primaryCandidates = await Work.find(primaryQuery)
      .populate('authorId', 'penName avatarUrl')
      .sort({ createdAt: -1 })
      .limit(CANDIDATE_POOL)
      .lean()

    // If fewer than the pool, backfill with recent works from other categories
    let backfill = []
    if (primaryCandidates.length < CANDIDATE_POOL && favCats.length > 0) {
      const primaryIds = primaryCandidates.map((w) => w._id)
      backfill = await Work.find({
        status: 'published',
        _id: { $nin: primaryIds },
      })
        .populate('authorId', 'penName avatarUrl')
        .sort({ createdAt: -1 })
        .limit(CANDIDATE_POOL - primaryCandidates.length)
        .lean()
    }

    const allPrimary = [...primaryCandidates, ...backfill]

    // ── 3. Score and sort primary candidates ─────────────────────────────
    const scored = allPrimary.map((work) => {
      let score = scoreWorkForFeed(work, prefs, currentHour)

      // Lightly penalise already-engaged works so fresh content surfaces first,
      // but don't hide them entirely (user may want to re-read).
      if (interactedWorkIds.has(work._id.toString())) {
        score *= 0.4
      }

      return { work, score }
    })

    scored.sort((a, b) => b.score - a.score)

    // ── 4. Exploration pool (20%) ─────────────────────────────────────────
    // Pull a random sample of published works not already in the primary pool.
    const primaryIdSet = new Set(allPrimary.map((w) => w._id.toString()))

    const explorationCandidates = await Work.find({
      status: 'published',
      _id: { $nin: Array.from(primaryIdSet) },
    })
      .populate('authorId', 'penName avatarUrl')
      .sort({ _id: -1 })         // deterministic but varied; use $sample in large deployments
      .limit(EXPLORATION_COUNT * 5) // over-fetch then shuffle for randomness
      .lean()

    // Select random EXPLORATION_COUNT works from the over-fetched pool
    const explorationWorks = shuffleArray(explorationCandidates).slice(0, EXPLORATION_COUNT)

    // ── 5. Interleave exploration into ranked results ──────────────────────
    // Insert one exploration item after every (1/EXPLORATION_RATIO - 1) ranked items.
    // With 20% ratio → every 4 ranked works, insert 1 exploration work.
    const insertInterval = Math.round(1 / EXPLORATION_RATIO) - 1 // = 4
    const merged = []
    let explorationIdx = 0

    for (let i = 0; i < scored.length; i++) {
      merged.push({ ...scored[i].work, _feedScore: scored[i].score, _isExploration: false })

      // Every insertInterval ranked items, slot in one exploration item
      if ((i + 1) % insertInterval === 0 && explorationIdx < explorationWorks.length) {
        merged.push({ ...explorationWorks[explorationIdx], _feedScore: 0, _isExploration: true })
        explorationIdx++
      }
    }

    // Append any remaining exploration works at the end
    while (explorationIdx < explorationWorks.length) {
      merged.push({ ...explorationWorks[explorationIdx], _feedScore: 0, _isExploration: true })
      explorationIdx++
    }

    // ── 6. Paginate ───────────────────────────────────────────────────────
    const total = merged.length
    const page_works = merged.slice(skip, skip + limit)

    res.json({
      works: page_works.map(formatWork),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total,
      },
      meta: {
        personalized: !!userId && !!prefs,
        preferredCategories: prefs?.favoriteCategories ?? [],
        preferredLanguages:  prefs?.preferredLanguages ?? [],
        explorationRatio:    EXPLORATION_RATIO,
      },
    })
  } catch (err) {
    console.error('[feedController] Error:', err)
    res.status(500).json({ error: 'Failed to build feed' })
  }
}

/**
 * GET /api/feed/preferences
 *
 * Returns the current user's preference profile (for debugging / profile display).
 * Requires x-user-id header.
 *
 * @type {import('express').RequestHandler}
 */
export async function getUserPreferences(req, res) {
  try {
    const userId = resolveUserId(req)
    if (!userId) return res.status(401).json({ error: 'Authentication required' })

    const prefs = await UserPreferences.findOne({ userId }).lean()
    if (!prefs) {
      return res.json({
        userId: userId.toString(),
        favoriteCategories: [],
        preferredLanguages: [],
        favoriteAuthors: [],
        engagementByCategory: {},
        engagementByLanguage: {},
        engagementByAuthor: {},
        activeHours: {},
        lastRecalculated: null,
      })
    }

    res.json({
      userId: userId.toString(),
      favoriteCategories: prefs.favoriteCategories,
      preferredLanguages: prefs.preferredLanguages,
      favoriteAuthors:    (prefs.favoriteAuthors || []).map((id) => id?.toString?.() ?? String(id)),
      engagementByCategory: Object.fromEntries(prefs.engagementByCategory ?? {}),
      engagementByLanguage: Object.fromEntries(prefs.engagementByLanguage ?? {}),
      engagementByAuthor:   Object.fromEntries(prefs.engagementByAuthor   ?? {}),
      activeHours:          Object.fromEntries(prefs.activeHours           ?? {}),
      lastRecalculated: prefs.lastRecalculated,
    })
  } catch (err) {
    console.error('[feedController/preferences] Error:', err)
    res.status(500).json({ error: 'Failed to fetch preferences' })
  }
}
