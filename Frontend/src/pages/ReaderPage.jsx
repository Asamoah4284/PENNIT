import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWorks } from '../lib/api'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'poem', label: 'Poems' },
  { value: 'short_story', label: 'Short Stories' },
  { value: 'novel', label: 'Novels' },
]

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
]

function getAuthorName(work) {
  return work.author?.penName || 'Unknown'
}

function getCategoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label || value
}

export default function ReaderPage() {
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('popular')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getWorks().then((data) => {
      setWorks(data)
      setLoading(false)
    })
  }, [])

  const filtered = works
    .filter((w) => w.status !== 'draft')
    .filter((w) => category === 'all' || w.category === category)
    .filter((w) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const authorName = getAuthorName(w).toLowerCase()
      return (
        w.title.toLowerCase().includes(q) ||
        authorName.includes(q) ||
        (w.genre && w.genre.toLowerCase().includes(q))
      )
    })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'popular') return (b.readCount || 0) - (a.readCount || 0)
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  if (loading) {
    return (
      <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 text-stone-500">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading stories…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 overflow-x-hidden">
      {/* Header */}
      <header className="mb-8 sm:mb-10 min-w-0">
        <h1 className="text-2xl sm:text-4xl font-bold text-stone-900 font-serif tracking-tight">
          Discover
        </h1>
        <p className="mt-2 text-stone-600 text-base sm:text-lg break-words">
          Stories from African writers — poems, short stories, and novels.
        </p>
      </header>

      {/* Search + filters */}
      <div className="space-y-4 mb-8 min-w-0">
        <div className="relative w-full min-w-0">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="search"
            placeholder="Search by title, author, or genre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-w-0 pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-white/80 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition shadow-sm box-border"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition flex-shrink-0 ${
                category === c.value
                  ? 'bg-yellow-400 text-stone-900 shadow-sm'
                  : 'bg-white/80 text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              {c.label}
            </button>
          ))}
          <span className="text-stone-300 flex-shrink-0 hidden sm:inline">·</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded-full border border-stone-200 bg-white/80 text-stone-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 flex-shrink-0"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Story list — one line per story */}
      <ul className="space-y-1 min-w-0">
        {sorted.map((work) => (
          <li key={work.id} className="min-w-0">
            <Link
              to={`/reading/${work.id}`}
              className="flex items-center gap-2 py-2.5 text-stone-700 hover:text-yellow-700 transition-colors min-w-0 overflow-hidden"
            >
              <span className="font-semibold text-stone-900 truncate min-w-0 flex-1">{work.title}</span>
              <span className="text-stone-400 flex-shrink-0">·</span>
              <span className="text-stone-500 truncate min-w-0 shrink">{getAuthorName(work)}</span>
              <span className="text-stone-400 flex-shrink-0 hidden sm:inline">·</span>
              <span className="text-stone-500 text-sm truncate flex-shrink-0 hidden sm:inline">{getCategoryLabel(work.category)}</span>
              <span className="text-stone-400 flex-shrink-0 hidden sm:inline">·</span>
              <span className="text-stone-400 text-sm flex-shrink-0">{work.readCount ?? 0} reads</span>
            </Link>
          </li>
        ))}
      </ul>

      {sorted.length === 0 && (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-stone-200 bg-white/50">
          <p className="text-stone-600 font-medium">No stories match your filters.</p>
          <p className="text-stone-500 text-sm mt-1">Try a different category or search.</p>
        </div>
      )}
    </div>
  )
}
