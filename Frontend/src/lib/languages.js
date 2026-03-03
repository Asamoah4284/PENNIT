/**
 * Content languages supported for publishing and translation.
 * Writers can publish in any of these; readers can view original and translate to any.
 */
export const CONTENT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'tw', name: 'Twi' },
  { code: 'ga', name: 'Ga' },
  { code: 'ee', name: 'Ewe' },
]

export function getLanguageName(code) {
  return CONTENT_LANGUAGES.find((l) => l.code === code)?.name ?? code
}
