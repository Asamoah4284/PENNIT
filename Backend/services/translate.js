/**
 * Translation service using Google Cloud Translation API (v2 Basic).
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

/**
 * Call Google Cloud Translation API v2 to translate an array of strings
 * from sourceLang to targetLang (Google codes).
 *
 * @param {string[]} texts - Array of strings to translate (order preserved)
 * @param {string} sourceGoogle - Google language code (e.g. 'en')
 * @param {string} targetGoogle - Google language code (e.g. 'ak')
 * @returns {Promise<string[]>} - Translated strings in same order
 */
async function translateBatch(texts, sourceGoogle, targetGoogle) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY is not set. Enable Cloud Translation API and add the API key to .env')
  }

  if (sourceGoogle === targetGoogle) {
    return [...texts]
  }

  const filtered = texts.filter((t) => t != null && String(t).trim() !== '')
  if (filtered.length === 0) {
    return texts.map(() => '')
  }

  const body = {
    q: filtered,
    source: sourceGoogle,
    target: targetGoogle,
    format: 'text',
  }

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
    throw new Error(message)
  }

  const data = await res.json()
  const translations = data?.data?.translations ?? []
  if (translations.length !== filtered.length) {
    throw new Error('Google Translate returned a different number of translations than requested')
  }

  const translatedTexts = translations.map((t) => (t.translatedText ?? '').trim())

  // Map back to original order (fill in blanks for empty inputs)
  const result = []
  let j = 0
  for (const raw of texts) {
    if (raw != null && String(raw).trim() !== '') {
      result.push(translatedTexts[j++] ?? '')
    } else {
      result.push('')
    }
  }
  return result
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
