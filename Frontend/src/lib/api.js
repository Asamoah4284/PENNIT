import { mockWorks, mockAuthors } from '../data/mock'

/**
 * Stub API layer. Replace with fetch() calls when Node backend is ready.
 */

export function getWorks() {
  return Promise.resolve([...mockWorks])
}

export function getWork(id) {
  const work = mockWorks.find((w) => w.id === id)
  return Promise.resolve(work || null)
}

export function getAuthor(id) {
  const author = mockAuthors.find((a) => a.id === id)
  if (!author) return Promise.resolve(null)
  const works = mockWorks.filter((w) => w.authorId === id)
  return Promise.resolve({ ...author, works })
}
