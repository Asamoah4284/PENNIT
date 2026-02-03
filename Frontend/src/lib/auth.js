const STORAGE_KEY = 'pennit_user'

/**
 * Get the current mock user from localStorage.
 * @returns {{ id: string, email: string, role: 'reader' | 'writer', penName?: string, authorId?: string } | null}
 */
export function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Store a mock user in localStorage (no real backend).
 * Writers get authorId for demo so dashboard can show mock works.
 * @param {{ id: string, email: string, role: 'reader' | 'writer', penName?: string, authorId?: string }} user
 */
export function setUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

/**
 * Clear the mock user from localStorage.
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEY)
}
