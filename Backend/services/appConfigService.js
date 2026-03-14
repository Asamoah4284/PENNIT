import AppConfig from '../models/AppConfig.js'

const ID = 'global'

/** In-memory cache so we don't hit DB on every request. Falls back to env until loaded. */
let cached = {
  monetizationEnabled: process.env.MONETIZATION_ENABLED === 'true',
}

/**
 * Load config from DB into cache. Call after DB connect (e.g. server start).
 * If no document exists, keeps env default and optionally seeds DB.
 */
export async function loadAppConfig() {
  try {
    const doc = await AppConfig.findById(ID).lean()
    if (doc && typeof doc.monetizationEnabled === 'boolean') {
      cached.monetizationEnabled = doc.monetizationEnabled
    }
    // Optionally seed from env if no document
    if (!doc) {
      await AppConfig.findByIdAndUpdate(
        ID,
        { $set: { monetizationEnabled: process.env.MONETIZATION_ENABLED === 'true' } },
        { upsert: true, new: true }
      ).lean()
      cached.monetizationEnabled = process.env.MONETIZATION_ENABLED === 'true'
    }
  } catch (err) {
    console.error('[appConfig] loadAppConfig failed:', err?.message)
  }
  return cached
}

/**
 * Sync getter for use in routes (no await). Uses in-memory cache.
 */
export function getMonetizationEnabled() {
  return !!cached.monetizationEnabled
}

/**
 * Set monetization on/off (admin only). Persists to DB and updates cache.
 */
export async function setMonetizationEnabled(enabled) {
  const value = !!enabled
  await AppConfig.findByIdAndUpdate(
    ID,
    { $set: { monetizationEnabled: value } },
    { upsert: true, new: true }
  )
  cached.monetizationEnabled = value
  return value
}
