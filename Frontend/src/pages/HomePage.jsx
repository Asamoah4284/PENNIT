import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getWorks, getAssetUrl, toggleSaveWork, createWorkComment } from '../lib/api'
import { getUser } from '../lib/auth'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('forYou')
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState(null)

  const user = getUser()

  useEffect(() => {
    getWorks()
      .then(setWorks)
      .catch(() => setWorks([]))
      .finally(() => setLoading(false))
  }, [])

  // Format date to readable string
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1d ago'
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Format read count
  const formatReads = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const handleToggleClap = async (workId) => {
    if (!user) return
    // Optimistic update: flip clap state immediately for instant feedback
    setWorks((prev) =>
      prev.map((w) => {
        if (w.id !== workId) return w
        const wasClapped = !!w._clapped
        const previousCount = w.clapCount ?? 0
        const nextClapped = !wasClapped
        const nextCount = Math.max(0, previousCount + (nextClapped ? 1 : -1))
        return {
          ...w,
          _clapped: nextClapped,
          clapCount: nextCount,
        }
      })
    )

    try {
      const result = await toggleWorkClap(workId, user.id)
      // Sync with server response silently
        setWorks((prev) =>
        prev.map((w) =>
          w.id === workId
            ? {
                ...w,
                clapCount: Math.max(0, result.clapCount ?? 0),
                _clapped: result.clapped,
              }
            : w
        )
      )
    } catch {
      // On error, revert optimistic toggle
      setWorks((prev) =>
        prev.map((w) => {
          if (w.id !== workId) return w
          const wasClapped = !!w._clapped
          const previousCount = w.clapCount ?? 0
          const revertedClapped = !wasClapped
          const revertedCount = Math.max(0, previousCount + (revertedClapped ? 1 : -1))
          return {
            ...w,
            _clapped: revertedClapped,
            clapCount: revertedCount,
          }
        })
      )
    }
  }

  const handleToggleSave = async (workId) => {
    if (!user) return
    // Optimistic update: flip saved state immediately for instant feedback
    setWorks((prev) =>
      prev.map((w) => {
        if (w.id !== workId) return w
        const wasSaved = !!w._saved
        const previousCount = w.saveCount ?? 0
        const nextSaved = !wasSaved
        const nextCount = Math.max(0, previousCount + (nextSaved ? 1 : -1))
        return {
          ...w,
          _saved: nextSaved,
          saveCount: nextCount,
        }
      })
    )

    try {
      const result = await toggleSaveWork(workId, user.id)
      // Sync with server response silently in the background
      setWorks((prev) =>
        prev.map((w) =>
          w.id === workId
            ? {
                ...w,
                saveCount: result.saveCount,
                _saved: result.saved,
              }
            : w
        )
      )
    } catch {
      // On error, revert optimistic toggle for this work only
      setWorks((prev) =>
        prev.map((w) => {
          if (w.id !== workId) return w
          const wasSaved = !!w._saved
          const previousCount = w.saveCount ?? 0
          const revertedSaved = !wasSaved
          const revertedCount = Math.max(0, previousCount + (revertedSaved ? 1 : -1))
          return {
            ...w,
            _saved: revertedSaved,
            saveCount: revertedCount,
          }
        })
      )
    }
  }

  const handleSubmitComment = async (workId, content) => {
    if (!user) {
      return Promise.reject(new Error('You must be signed in to comment'))
    }
    if (!content || !content.trim()) {
      return Promise.resolve()
    }
    setPendingAction(`comment-${workId}`)
    try {
      const created = await createWorkComment(workId, { content, userId: user.id })
      setWorks((prev) =>
        prev.map((w) =>
          w.id === workId
            ? {
                ...w,
                commentCount: (w.commentCount ?? 0) + 1,
              }
            : w
        )
      )
      return created
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Promo Banner */}
      <div className="bg-yellow-50 border-b border-yellow-100 -mx-4 sm:-mx-6 -mt-6 sm:-mt-8 px-4 sm:px-6 py-3 mb-6 sm:mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-stone-700">
          <span className="text-yellow-500">✦</span>
          <span><strong>Pre-launch:</strong> Launching February–March 2026. Join now to be part of the community from day one.</span>
        </div>
        <button className="text-stone-400 hover:text-stone-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-stone-200 mb-8">
        <button
          onClick={() => setActiveTab('forYou')}
          className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'forYou' ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
        >
          For you
          {activeTab === 'forYou' && <span className="absolute bottom-0 left-0 right-0 h-px bg-stone-900"></span>}
        </button>
        <button
          onClick={() => setActiveTab('featured')}
          className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'featured' ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Featured
          {activeTab === 'featured' && <span className="absolute bottom-0 left-0 right-0 h-px bg-stone-900"></span>}
        </button>
      </div>

      {/* Stories Feed */}
      <div className="space-y-8">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => <HomeSkeletonCard key={index} />)
          : works.map((work) => {
              const author = work.author
              return (
                <StoryCard
                  key={work.id}
                  id={work.id}
                  author={author}
                  title={work.title}
                  excerpt={work.excerpt}
                  date={formatDate(work.createdAt)}
                  reads={formatReads(work.readCount)}
                  comments={work.commentCount ?? 0}
                  category={work.category}
                  publication={work.genre}
                  thumbnailUrl={work.thumbnailUrl}
                  clapCount={work.clapCount}
                  saved={work._saved}
                  onToggleSave={() => handleToggleSave(work.id)}
                  disabled={!!pendingAction}
                />
              )
            })}
      </div>
    </div>
  )
}

function StoryCard({
  id,
  author,
  title,
  excerpt,
  date,
  reads,
  comments,
  category,
  publication,
  thumbnailUrl,
  clapCount,
  saved,
  onToggleSave,
  disabled,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpen])

  return (
    <article className="group">
      {/* Author Info */}
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <div className="w-6 h-6 rounded-full bg-stone-300 flex-shrink-0 overflow-hidden">
          {author?.avatarUrl ? (
            <img src={author.avatarUrl} alt={author.penName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-400 to-stone-500 flex items-center justify-center text-white text-xs font-medium">
              {author?.penName?.[0] || 'A'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm min-w-0 truncate">
          {publication && publication !== 'General' && (
            <>
              <span className="text-stone-500">Genre:</span>
              <Link to={`/genre/${publication.toLowerCase().replace(/\s+/g, '-')}`} className="font-medium text-stone-700 hover:underline">
                {publication}
              </Link>
              <span className="text-stone-400">·</span>
            </>
          )}
          <Link to={`/author/${author?.id}`} className="font-medium text-stone-900 hover:underline">
            {author?.penName || 'Anonymous'}
          </Link>
        </div>
      </div>

      {/* Content: image on top on mobile, beside text on desktop */}
      <div className="flex flex-col md:flex-row md:gap-6 gap-4">
        {/* Text Content – order 2 on mobile so it appears below image */}
        <div className="flex-1 min-w-0 order-2 md:order-1">
          <Link to={`/reading/${id}`} state={{ from: 'home' }}>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 mb-2 leading-snug group-hover:underline line-clamp-2">
              {title}
            </h2>
          </Link>
          <p className="text-stone-600 text-sm sm:text-base leading-relaxed line-clamp-2 mb-4">
            {excerpt}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-stone-500">
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">✦</span>
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <span>{reads}</span>
            </div>
            <div className="flex items-center gap-1 text-stone-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M10 3c-4.31 0-8 3.033-8 7 0 2.024.978 3.825 2.499 5.085a3.478 3.478 0 0 1-.522 1.756.75.75 0 0 0 .584 1.143 5.976 5.976 0 0 0 3.936-1.108c.487.082.99.124 1.503.124 4.31 0 8-3.033 8-7s-3.69-7-8-7Z" clipRule="evenodd" />
              </svg>
              <span>{comments}</span>
            </div>

            {/* Action Buttons – clap is display-only; save and menu are clickable */}
            <div className="flex-1 min-w-0" />
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center gap-1 px-3 h-8 rounded-full text-xs font-medium border border-stone-300 bg-white text-stone-600"
                aria-label={`${Math.max(0, clapCount ?? 0)} claps`}
              >
                <span className="text-base leading-none">👏</span>
                <span>{Math.max(0, clapCount ?? 0)}</span>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={onToggleSave}
                className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${
                  saved
                    ? 'border-blue-500 text-white bg-blue-500'
                    : 'border-stone-300 text-stone-400 bg-white hover:border-stone-400 hover:text-stone-600'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3h-6" />
                </svg>
              </button>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen((prev) => !prev)
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-300 text-stone-400 bg-white hover:border-stone-400 hover:text-stone-600 transition-colors"
                  aria-label="More options"
                  aria-expanded={menuOpen}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                    <path fillRule="evenodd" d="M6 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" clipRule="evenodd" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 pt-1.5 z-50">
                    {/* Upward-pointing triangle anchor */}
                    <div className="absolute right-4 top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white drop-shadow-[0_-1px_1px_rgba(0,0,0,0.06)]" />
                    <div className="min-w-[240px] rounded-lg bg-white border border-stone-200 shadow-lg py-1">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-t-lg"
                        onClick={() => setMenuOpen(false)}
                      >
                        Follow author
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-none"
                        onClick={() => setMenuOpen(false)}
                      >
                        Follow publication
                      </button>
                      <div className="my-1 border-t border-stone-200" />
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-none"
                        onClick={() => setMenuOpen(false)}
                      >
                        Mute author
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-none"
                        onClick={() => setMenuOpen(false)}
                      >
                        Mute publication
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-stone-50 rounded-b-lg"
                        onClick={() => setMenuOpen(false)}
                      >
                        Report story…
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Thumbnail – full width on mobile (top), fixed size beside text on desktop */}
        <Link to={`/reading/${id}`} state={{ from: 'home' }} className="order-1 md:order-2 flex-shrink-0 w-full md:w-44 md:h-28">
          <div className="w-full aspect-video md:aspect-auto md:w-44 md:h-28 rounded-lg overflow-hidden bg-stone-200">
            {thumbnailUrl ? (
              <img src={getAssetUrl(thumbnailUrl)} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" />
            )}
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="border-b border-stone-200 mt-8"></div>
    </article>
  )
}

function HomeSkeletonCard() {
  return (
    <article className="animate-pulse">
      {/* Author + meta skeleton */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-stone-200" />
        <div className="flex-1 h-3 bg-stone-200 rounded-full max-w-xs" />
      </div>

      <div className="flex flex-col md:flex-row md:gap-6 gap-4">
        <div className="flex-1 min-w-0 space-y-3 order-2 md:order-1">
          <div className="h-5 bg-stone-200 rounded-full max-w-sm" />
          <div className="h-4 bg-stone-200 rounded-full max-w-md" />
          <div className="flex gap-4 mt-2">
            <div className="h-3 w-16 bg-stone-200 rounded-full" />
            <div className="h-3 w-12 bg-stone-200 rounded-full" />
            <div className="h-3 w-12 bg-stone-200 rounded-full" />
          </div>
        </div>

        <div className="order-1 md:order-2 flex-shrink-0 w-full md:w-44 md:h-28">
          <div className="w-full aspect-video md:aspect-auto md:w-44 md:h-28 rounded-lg bg-stone-200" />
        </div>
      </div>

      <div className="border-b border-stone-200 mt-8" />
    </article>
  )
}
