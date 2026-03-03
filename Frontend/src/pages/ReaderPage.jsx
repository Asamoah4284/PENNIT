import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getWorks, getFeed } from '../lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all',         label: 'All'           },
  { value: 'poem',        label: 'Poems'         },
  { value: 'short_story', label: 'Short Stories' },
  { value: 'novel',       label: 'Novels'        },
]

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest',  label: 'Newest'  },
]

const FEED_PAGE_SIZE = 20

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAuthorName(work) {
  return work.author?.penName || 'Unknown'
}

function getCategoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label || value
}

/**
 * Resolve the logged-in user from localStorage.
 * Returns the user object or null.
 */
function getStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Single work row used in both the Discover and For You lists. */
function WorkRow({ work, isExploration = false }) {
  return (
    <li className="min-w-0">
      <Link
        to={`/reading/${work.id}`}
        className="flex items-center gap-2 py-2.5 text-stone-700 hover:text-yellow-700 transition-colors min-w-0 overflow-hidden group"
      >
        <span className="font-semibold text-stone-900 group-hover:text-yellow-700 truncate min-w-0 flex-1">
          {work.title}
        </span>
        <span className="text-stone-400 flex-shrink-0">·</span>
        <span className="text-stone-500 truncate min-w-0 shrink">{getAuthorName(work)}</span>
        <span className="text-stone-400 flex-shrink-0 hidden sm:inline">·</span>
        <span className="text-stone-500 text-sm truncate flex-shrink-0 hidden sm:inline">
          {getCategoryLabel(work.category)}
        </span>
        <span className="text-stone-400 flex-shrink-0 hidden sm:inline">·</span>
        <span className="text-stone-400 text-sm flex-shrink-0">{work.readCount ?? 0} reads</span>
        {isExploration && (
          <span
            title="Discovery pick — something new for you"
            className="ml-1 flex-shrink-0 text-xs font-medium text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5 hidden sm:inline"
          >
            Discover
          </span>
        )}
      </Link>
    </li>
  )
}

/** Loading skeleton rows. */
function SkeletonRows({ count = 8 }) {
  return (
    <ul className="space-y-1 min-w-0">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-2 py-2.5 min-w-0 animate-pulse">
          <div className="h-4 bg-stone-200 rounded flex-1 min-w-0" />
          <div className="h-4 bg-stone-200 rounded w-24 flex-shrink-0 hidden sm:block" />
          <div className="h-4 bg-stone-200 rounded w-16 flex-shrink-0 hidden sm:block" />
        </li>
      ))}
    </ul>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// For You feed panel (personalized)
// ─────────────────────────────────────────────────────────────────────────────

function ForYouFeed({ userId }) {
  const [works, setWorks]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage]           = useState(1)
  const [hasMore, setHasMore]     = useState(true)
  const [meta, setMeta]           = useState(null)
  const [error, setError]         = useState(null)

  const loadPage = useCallback(async (pageNum) => {
    try {
      if (pageNum === 1) setLoading(true)
      else setLoadingMore(true)

      const data = await getFeed(userId, { limit: FEED_PAGE_SIZE, page: pageNum })

      setWorks((prev) => pageNum === 1 ? data.works : [...prev, ...data.works])
      setHasMore(data.pagination?.hasMore ?? false)
      setMeta(data.meta ?? null)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load feed')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId])

  useEffect(() => {
    setPage(1)
    loadPage(1)
  }, [loadPage])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    loadPage(next)
  }

  if (loading) return <SkeletonRows count={10} />

  if (error) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-red-200 bg-red-50">
        <p className="text-red-600 font-medium">Could not load feed</p>
        <p className="text-red-400 text-sm mt-1">{error}</p>
        <button
          onClick={() => loadPage(1)}
          className="mt-4 px-4 py-2 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
        >
          Try again
        </button>
      </div>
    )
  }

  if (works.length === 0) {
    return (
      <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-stone-200 bg-white/50">
        <p className="text-stone-600 font-medium">Your feed is warming up</p>
        <p className="text-stone-500 text-sm mt-1">
          Read, clap, and comment on a few stories — your personalised feed will appear here.
        </p>
        <Link
          to="/reader"
          className="mt-4 inline-block px-4 py-2 text-sm font-medium bg-yellow-400 text-stone-900 rounded-lg hover:bg-yellow-500 transition"
        >
          Browse Discover
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 min-w-0">
      {/* Preference hint badge */}
      {meta?.personalized && meta.preferredCategories?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="text-xs text-stone-400 font-medium self-center">Tuned to:</span>
          {meta.preferredCategories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="text-xs font-medium text-stone-600 bg-stone-100 border border-stone-200 rounded-full px-2.5 py-1"
            >
              {getCategoryLabel(cat)}
            </span>
          ))}
          {meta.preferredLanguages?.slice(0, 2).map((lang) => (
            <span
              key={lang}
              className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-1"
            >
              {lang.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      <ul className="space-y-1 min-w-0">
        {works.map((work) => (
          <WorkRow key={work.id} work={work} isExploration={work._isExploration} />
        ))}
      </ul>

      {hasMore && (
        <div className="pt-2 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 text-sm font-medium bg-white border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {!hasMore && works.length > 0 && (
        <p className="text-center text-stone-400 text-sm pt-4">
          You've reached the end of your feed for now. Keep reading to refine it!
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Discover panel (original browsable list)
// ─────────────────────────────────────────────────────────────────────────────

function DiscoverFeed() {
  const [works, setWorks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [sort, setSort]         = useState('popular')
  const [search, setSearch]     = useState('')

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
      return (
        w.title.toLowerCase().includes(q) ||
        getAuthorName(w).toLowerCase().includes(q) ||
        (w.genre && w.genre.toLowerCase().includes(q))
      )
    })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'popular') return (b.readCount || 0) - (a.readCount || 0)
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  if (loading) return <SkeletonRows count={10} />

  return (
    <div className="space-y-6 min-w-0">
      {/* Search + filters */}
      <div className="space-y-4 min-w-0">
        <div className="relative w-full min-w-0">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
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

      {/* Story list */}
      <ul className="space-y-1 min-w-0">
        {sorted.map((work) => (
          <WorkRow key={work.id} work={work} />
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

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ReaderPage() {
  const user = getStoredUser()

  // Show "For You" tab only for logged-in users
  const TABS = user
    ? [
        { id: 'foryou',   label: 'For You'  },
        { id: 'discover', label: 'Discover' },
      ]
    : [
        { id: 'discover', label: 'Discover' },
      ]

  const [activeTab, setActiveTab] = useState(TABS[0].id)

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 overflow-x-hidden">
      {/* Header */}
      <header className="mb-8 sm:mb-10 min-w-0">
        <h1 className="text-2xl sm:text-4xl font-bold text-stone-900 font-serif tracking-tight">
          {activeTab === 'foryou' ? 'For You' : 'Discover'}
        </h1>
        <p className="mt-2 text-stone-600 text-base sm:text-lg break-words">
          {activeTab === 'foryou'
            ? 'Stories picked just for you, based on your reading habits.'
            : 'Stories from African writers — poems, short stories, and novels.'}
        </p>
      </header>

      {/* Tab bar */}
      {TABS.length > 1 && (
        <div className="flex gap-1 mb-8 border-b border-stone-200 min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors relative flex-shrink-0 ${
                activeTab === tab.id
                  ? 'text-stone-900'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-t" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {activeTab === 'foryou' && user ? (
        <ForYouFeed userId={user.id} />
      ) : (
        <DiscoverFeed />
      )}
    </div>
  )
}
