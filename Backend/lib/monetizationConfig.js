/**
 * Configurable point weights per work category (per read).
 * Env: POINTS_POEM, POINTS_SHORT_STORY, POINTS_NOVEL. Defaults: 1, 3, 5.
 * @param {string} category - Work category: 'poem' | 'short_story' | 'novel'
 * @returns {number} Points per counted read for that category
 */
export function getPointsForCategory(category) {
  const map = {
    poem: Number(process.env.POINTS_POEM) || 1,
    short_story: Number(process.env.POINTS_SHORT_STORY) || 3,
    novel: Number(process.env.POINTS_NOVEL) || 5,
  }
  return map[category] ?? 1
}

/**
 * Platform cost to deduct from revenue pool (fixed GHC or percentage).
 * PLATFORM_COST_GHC takes precedence over PLATFORM_COST_PERCENT.
 * @param {number} revenuePoolGhc
 * @returns {number} Amount to deduct (GHC)
 */
export function getPlatformCost(revenuePoolGhc) {
  const fixed = Number(process.env.PLATFORM_COST_GHC)
  if (!Number.isNaN(fixed) && fixed >= 0) return fixed
  const percent = Number(process.env.PLATFORM_COST_PERCENT)
  if (!Number.isNaN(percent) && percent >= 0 && percent <= 100) {
    return (revenuePoolGhc * percent) / 100
  }
  return 0
}
