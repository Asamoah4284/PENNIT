import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAuthor, getAssetUrl, toggleFollowAuthor } from '../lib/api'
import { getUser } from '../lib/auth'

const CATEGORY_LABELS = { poem: 'Poem', short_story: 'Short Story', novel: 'Novel' }

const formatReads = (count) => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count ?? 0)
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AuthorPage() {
  const { id } = useParams()
  const [author, setAuthor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingFollow, setPendingFollow] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const user = getUser()

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    getAuthor(id)
      .then(setAuthor)
      .catch(() => setAuthor(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleToggleFollow = async () => {
    if (!user) return
    setPendingFollow(true)
    setMenuOpen(false)
    try {
      const result = await toggleFollowAuthor(author.id, user.id)
      setAuthor((prev) =>
        prev
          ? {
              ...prev,
              followerCount: result.followerCount,
              _following: result.following,
            }
          : prev
      )
    } finally {
      setPendingFollow(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-stone-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-stone-500 text-sm">Loading author…</span>
        </div>
      </div>
    )
  }

  if (!author) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-stone-500 mb-4">Author not found.</p>
        <Link to="/reader" className="text-stone-600 font-medium hover:underline">Back to discover</Link>
      </div>
    )
  }

  const works = (author.works || []).filter((w) => w.status !== 'draft')
  const totalReads = works.reduce((sum, w) => sum + (w.readCount || 0), 0)
  const followerCount = author.followerCount ?? 0

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full min-w-0">
      {/* Minimal header: name + options menu */}
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            {author.penName || 'Author'}
          </h1>
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-2 rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              aria-label="Options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-white rounded-lg shadow-lg border border-stone-200 z-10">
                <Link
                  to="/reader"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  Back to discover
                </Link>
                {user && (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={pendingFollow}
                    className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    {author._following ? 'Unfollow' : 'Follow'} {author.penName || 'author'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs: Home | About */}
        <nav className="flex gap-6 mt-6 border-b border-stone-200">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'home'
                ? 'text-stone-900 border-stone-900'
                : 'text-stone-500 border-transparent hover:text-stone-700'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'about'
                ? 'text-stone-900 border-stone-900'
                : 'text-stone-500 border-transparent hover:text-stone-700'
            }`}
          >
            About
          </button>
        </nav>
      </header>

      {/* Home tab: article list */}
      {activeTab === 'home' && (
        <section className="space-y-6">
          {works.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-12 text-center">
              <p className="text-stone-500">No published works yet.</p>
            </div>
          ) : (
            <ul className="space-y-8">
              {works.map((work, index) => (
                <li key={work.id}>
                  <article className="group flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <div className="flex-1 min-w-0 order-2 sm:order-1">
                      {/* Pinned badge on first */}
                      {index === 0 && (
                        <p className="flex items-center gap-1.5 text-stone-500 text-sm mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500">
                            <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828 4.5 4.5 0 018 2.828c0 2.852-2.045 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
                          </svg>
                          Pinned
                        </p>
                      )}
                      {/* Publication / category line */}
                      <p className="flex items-center gap-2 text-stone-500 text-sm mb-1">
                        <span className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-semibold text-stone-600">
                          {(CATEGORY_LABELS[work.category] || work.category).charAt(0)}
                        </span>
                        Published in {CATEGORY_LABELS[work.category] || work.category}
                      </p>
                      <Link to={`/reading/${work.id}`} className="block">
                        <h2 className="text-lg sm:text-xl font-bold text-stone-900 leading-snug group-hover:underline line-clamp-2">
                          {work.title}
                        </h2>
                      </Link>
                      {work.excerpt && (
                        <p className="text-stone-600 text-sm sm:text-base mt-1.5 line-clamp-2 leading-relaxed">
                          {work.excerpt}
                        </p>
                      )}
                      {/* Meta: date, reads, comments */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-500">
                        <span className="flex items-center gap-1">
                          <span className="text-amber-500">✦</span>
                          {formatDate(work.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          </svg>
                          {formatReads(work.readCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M10 3c-4.31 0-8 3.033-8 7 0 2.024.978 3.825 2.499 5.085a3.478 3.478 0 0 1-.522 1.756.75.75 0 0 0 .584 1.143 5.976 5.976 0 0 0 3.936-1.108c.487.082.99.124 1.503.124 4.31 0 8-3.033 8-7s-3.69-7-8-7Z" clipRule="evenodd" />
                          </svg>
                          {work.commentCount ?? 0}
                        </span>
                      </div>
                    </div>
                    {/* Right: actions + thumbnail */}
                    <div className="flex items-start gap-3 order-1 sm:order-2 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                          aria-label="Save"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                          aria-label="More"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      <Link to={`/reading/${work.id}`} className="flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-stone-100">
                        {work.thumbnailUrl ? (
                          <img
                            src={getAssetUrl(work.thumbnailUrl)}
                            alt=""
                            className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-stone-200">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-stone-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                            </svg>
                          </div>
                        )}
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* About tab: bio + stats */}
      {activeTab === 'about' && (
        <section className="space-y-8">
          {author.avatarUrl ? (
            <div className="flex justify-center sm:justify-start">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-stone-200 flex-shrink-0">
                <img
                  src={getAssetUrl(author.avatarUrl)}
                  alt={author.penName || 'Author'}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : null}
          {author.bio && (
            <div>
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">About</h2>
              <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{author.bio}</p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Total reads</p>
              <p className="text-xl font-bold text-stone-900 mt-1">{formatReads(totalReads)}</p>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Stories</p>
              <p className="text-xl font-bold text-stone-900 mt-1">{works.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Followers</p>
              <p className="text-xl font-bold text-stone-900 mt-1">{followerCount}</p>
            </div>
          </div>
          {!author.bio && works.length === 0 && (
            <p className="text-stone-500">No bio or stats to show yet.</p>
          )}
        </section>
      )}
    </div>
  )
}
