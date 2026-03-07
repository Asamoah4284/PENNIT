import { GoogleAuth } from 'google-auth-library'

/**
 * Translation service using Google Cloud Translation APIs.
 *
 * App language codes: en (English), tw (Twi), ga (Ga), ee (Ewe).
 * These are mapped to Google's language codes for API requests.
 */

/** App code (Work.language) → Google Cloud Translation API language code */
const APP_CODE_TO_GOOGLE = {
  en: 'en',
  tw: 'ak',   // Akan (Twi is a dialect of Akan)
  ga: 'gaa',  // Ga (Ghana)
  ee: 'ee',   // Ewe
}

/**
 * Map app-level language codes to the keys used in the translations
 * subdocument stored on the Work model (en, twi, ga, ewe).
 */
export const APP_CODE_TO_FIELD = {
  en: 'en',
  tw: 'twi',
  ga: 'ga',
  ee: 'ewe',
}

/** Reverse map: translations field key → app language code */
export const FIELD_TO_APP_CODE = Object.fromEntries(
  Object.entries(APP_CODE_TO_FIELD).map(([k, v]) => [v, k])
)

/** All app target language codes (for iterating). */
const TARGET_APP_CODES = ['en', 'tw', 'ga', 'ee']

const GOOGLE_TRANSLATE_V2_URL = 'https://translation.googleapis.com/language/translate/v2'
const GOOGLE_TRANSLATE_V3_BASE = 'https://translation.googleapis.com/v3'

/**
 * Strip HTML tags and normalize whitespace so we don't send markup to the translator.
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html || typeof html !== 'string') return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function mapBackToOriginalOrder(texts, translatedTexts) {
  const result = []
  let j = 0
  for (const raw of texts) {
    if (raw != null && String(raw).trim() !== '') {
      result.push((translatedTexts[j++] ?? '').trim())
    } else {
      result.push('')
    }
  }
  return result
}

async function translateBatchWithApiKey(texts, sourceGoogle, targetGoogle, apiKey) {
  const filtered = texts.filter((t) => t != null && String(t).trim() !== '')
  if (filtered.length === 0) return texts.map(() => '')

  const body = { q: filtered, source: sourceGoogle, target: targetGoogle, format: 'text' }
  const url = `${GOOGLE_TRANSLATE_V2_URL}?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text()
    let message = `Google Translate API error: ${res.status}`
    try {
      const json = JSON.parse(errBody)
      if (json.error?.message) message = json.error.message
    } catch {
      if (errBody) message += ` — ${errBody.slice(0, 200)}`
    }
    const err = new Error(message)
    err.code = 'GOOGLE_TRANSLATE_API_ERROR'
    throw err
  }

  const data = await res.json()
  const translations = data?.data?.translations ?? []
  if (translations.length !== filtered.length) {
    throw new Error('Google Translate returned a different number of translations than requested')
  }
  return mapBackToOriginalOrder(texts, translations.map((t) => t.translatedText ?? ''))
}

async function translateBatchWithOAuth(texts, sourceGoogle, targetGoogle) {
  const projectId = process.env.GOOGLE_TRANSLATE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
  if (!projectId) {
    throw new Error('GOOGLE_TRANSLATE_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) is required for OAuth translation')
  }

  const filtered = texts.filter((t) => t != null && String(t).trim() !== '')
  if (filtered.length === 0) return texts.map(() => '')

  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-translation'],
  })
  const client = await auth.getClient()
  const tokenResponse = await client.getAccessToken()
  const accessToken = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token
  if (!accessToken) {
    throw new Error('Failed to obtain Google OAuth access token for translation')
  }

  const url = `${GOOGLE_TRANSLATE_V3_BASE}/projects/${encodeURIComponent(projectId)}/locations/global:translateText`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contents: filtered,
      sourceLanguageCode: sourceGoogle,
      targetLanguageCode: targetGoogle,
      mimeType: 'text/plain',
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    let message = `Google Translate OAuth API error: ${res.status}`
    try {
      const json = JSON.parse(errBody)
      if (json.error?.message) message = json.error.message
    } catch {
      if (errBody) message += ` — ${errBody.slice(0, 200)}`
    }
    throw new Error(message)
  }

  const data = await res.json()
  const translations = data?.translations ?? []
  if (translations.length !== filtered.length) {
    throw new Error('Google OAuth translation returned a different number of translations than requested')
  }
  return mapBackToOriginalOrder(texts, translations.map((t) => t.translatedText ?? ''))
}

/**
 * Translate texts from sourceGoogle to targetGoogle.
 * Tries API-key (v2 Basic) first when configured, and falls back to OAuth (v3 Advanced)
 * when keys are rejected or unavailable.
 */
async function translateBatch(texts, sourceGoogle, targetGoogle) {
  if (sourceGoogle === targetGoogle) return [...texts]

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
  const hasOAuthProject = Boolean(process.env.GOOGLE_TRANSLATE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT)

  if (apiKey) {
    try {
      return await translateBatchWithApiKey(texts, sourceGoogle, targetGoogle, apiKey)
    } catch (err) {
      const message = err?.message || ''
      if (message.includes('API keys are not supported by this API') && hasOAuthProject) {
        return translateBatchWithOAuth(texts, sourceGoogle, targetGoogle)
      }
      if (message.includes('API keys are not supported by this API')) {
        throw new Error(
          'Google rejected API-key authentication. Configure OAuth service-account credentials and set GOOGLE_TRANSLATE_PROJECT_ID.'
        )
      }
      throw err
    }
  }

  if (hasOAuthProject) {
    return translateBatchWithOAuth(texts, sourceGoogle, targetGoogle)
  }

  throw new Error(
    'Translation is not configured. Set GOOGLE_TRANSLATE_API_KEY (Basic v2) or OAuth credentials with GOOGLE_TRANSLATE_PROJECT_ID.'
  )
}

/**
 * Translate work content (title, excerpt, body) into all other supported
 * languages via Google Cloud Translation API. Returns the same structure
 * as before: title/excerpt/body objects keyed by en, twi, ga, ewe.
 *
 * @param {{ title: string, excerpt: string, body: string }} content
 * @param {string} sourceLang - App language code: 'en' | 'tw' | 'ga' | 'ee'
 * @returns {Promise<{
 *   title:   { en: string, twi: string, ga: string, ewe: string },
 *   excerpt: { en: string, twi: string, ga: string, ewe: string },
 *   body:    { en: string, twi: string, ga: string, ewe: string }
 * }>}
 */
export async function translateWorkContent({ title, excerpt, body }, sourceLang = 'en') {
  const safeTitle = (title ?? '').trim()
  const safeExcerpt = (excerpt ?? '').slice(0, 1000)
  const plainBody = stripHtml(body ?? '').slice(0, 5000)

  const sourceGoogle = APP_CODE_TO_GOOGLE[sourceLang] ?? 'en'
  const originalField = APP_CODE_TO_FIELD[sourceLang] ?? 'en'

  // Build full result with original language filled in
  const result = {
    title:   { en: '', twi: '', ga: '', ewe: '', [originalField]: safeTitle },
    excerpt: { en: '', twi: '', ga: '', ewe: '', [originalField]: safeExcerpt },
    body:    { en: '', twi: '', ga: '', ewe: '', [originalField]: plainBody },
  }

  const targets = TARGET_APP_CODES.filter((code) => code !== sourceLang)
  if (targets.length === 0) {
    return result
  }

  const texts = [safeTitle, safeExcerpt, plainBody]

  for (const targetApp of targets) {
    const targetGoogle = APP_CODE_TO_GOOGLE[targetApp]
    const fieldKey = APP_CODE_TO_FIELD[targetApp]

    try {
      const [transTitle, transExcerpt, transBody] = await translateBatch(
        texts,
        sourceGoogle,
        targetGoogle
      )
      result.title[fieldKey] = transTitle
      result.excerpt[fieldKey] = transExcerpt
      result.body[fieldKey] = transBody
    } catch (err) {
      console.error(`[translate] Failed to translate to ${targetApp} (${targetGoogle}):`, err.message)
      // Leave that language empty so we don't break the whole flow; can retry later via translate endpoint
    }
  }

  return result
}

/**
 * Translate work content from one app language to a single target language.
 * Used by the draft-translate flow so we never silently fall back to source text.
 *
 * @param {{ title: string, excerpt: string, body: string }} content
 * @param {string} sourceLang - App code: 'en' | 'tw' | 'ga' | 'ee'
 * @param {string} targetLang - App code: 'en' | 'tw' | 'ga' | 'ee'
 * @returns {Promise<{ title: string, excerpt: string, body: string }>}
 */
export async function translateContentToTarget({ title, excerpt, body }, sourceLang, targetLang) {
  const sourceGoogle = APP_CODE_TO_GOOGLE[sourceLang] ?? 'en'
  const targetGoogle = APP_CODE_TO_GOOGLE[targetLang]

  if (!targetGoogle) {
    throw new Error(`Unsupported target language: ${targetLang}. Use one of: en, tw, ga, ee`)
  }

  const safeTitle = (title ?? '').trim()
  const safeExcerpt = (excerpt ?? '').slice(0, 1000)
  const plainBody = stripHtml(body ?? '').slice(0, 5000)

  const [transTitle, transExcerpt, transBody] = await translateBatch(
    [safeTitle, safeExcerpt, plainBody],
    sourceGoogle,
    targetGoogle
  )

  return {
    title: transTitle ?? '',
    excerpt: transExcerpt ?? '',
    body: transBody ?? '',
  }
}
