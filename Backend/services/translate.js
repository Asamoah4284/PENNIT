import OpenAI from 'openai'

/**
 * Map app-level language codes (stored in Work.language) to human-readable names
 * used in the OpenAI system prompt.
 */
const LANG_NAMES = {
  en: 'English',
  tw: 'Twi (Akan)',
  ga: 'Ga',
  ee: 'Ewe',
}

/**
 * Map app language codes (en, tw, ga, ee) to the keys used in the translations
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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
 * Translate work content (title, excerpt, body) into Twi, Ga, and Ewe in ONE
 * OpenAI API call. Returns structured translations ready to be stored in MongoDB.
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
  const sourceLanguageName = LANG_NAMES[sourceLang] ?? 'English'

  const plainBody = stripHtml(body ?? '').slice(0, 5000)
  const safeTitle = (title ?? '').trim()
  const safeExcerpt = (excerpt ?? '').slice(0, 1000)

  const systemPrompt = `You are a professional literary translator specialising in Ghanaian languages.
Translate the provided ${sourceLanguageName} text into Twi (Akan), Ga, and Ewe.
Preserve tone, literary style, metaphors, and cultural nuance.

Return ONLY a valid JSON object — no markdown, no explanations — with this exact shape:
{
  "title":   { "twi": "", "ga": "", "ewe": "" },
  "excerpt": { "twi": "", "ga": "", "ewe": "" },
  "body":    { "twi": "", "ga": "", "ewe": "" }
}`

  const userMessage = JSON.stringify({
    title: safeTitle,
    excerpt: safeExcerpt,
    body: plainBody,
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage },
    ],
  })

  const raw = response.choices[0]?.message?.content
  if (!raw) throw new Error('OpenAI returned an empty translation response.')

  const parsed = JSON.parse(raw)

  // Merge original-language text into the translations object so every field
  // is fully self-contained (no need to join with the root document).
  const originalField = APP_CODE_TO_FIELD[sourceLang] ?? 'en'
  return {
    title: {
      twi: parsed.title?.twi ?? '',
      ga:  parsed.title?.ga  ?? '',
      ewe: parsed.title?.ewe ?? '',
      [originalField]: safeTitle,
    },
    excerpt: {
      twi: parsed.excerpt?.twi ?? '',
      ga:  parsed.excerpt?.ga  ?? '',
      ewe: parsed.excerpt?.ewe ?? '',
      [originalField]: safeExcerpt,
    },
    body: {
      twi: parsed.body?.twi ?? '',
      ga:  parsed.body?.ga  ?? '',
      ewe: parsed.body?.ewe ?? '',
      [originalField]: plainBody,
    },
  }
}
