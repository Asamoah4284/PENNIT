import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  getWork,
  getAssetUrl,
  trackWorkView,
  trackWorkRead,
  getWorkClapStatus,
  toggleWorkClap,
  toggleSaveWork,
  getWorkComments,
  createWorkComment,
  getSavedWorks,
  getMySubscription,
} from '../lib/api'
import { getUser } from '../lib/auth'
import { useConfig } from '../contexts/ConfigContext'
import DOMPurify from 'dompurify'

function formatCount(n) {
  const num = Math.max(0, Number(n) ?? 0)
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return String(num)
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
}

const WRITER_FREE_POEM_LIMIT = 2
const WRITER_FREE_POEM_KEY = 'pennit_writer_free_poems'

function getWriterFreePoemIds() {
  try {
    const raw = localStorage.getItem(WRITER_FREE_POEM_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveWriterFreePoemIds(ids) {
  localStorage.setItem(WRITER_FREE_POEM_KEY, JSON.stringify(ids))
}

export default function ReadingPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [work, setWork] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clapped, setClapped] = useState(false)
  const [clapCount, setClapCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [commentItems, setCommentItems] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(false)
  const [replyingToId, setReplyingToId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const menuRef = useRef(null)
  const commentsSectionRef = useRef(null)
  const replyInputRef = useRef(null)
  const readStartTime = useRef(null)
  const readIntervalRef = useRef(null)

  const fromHome = location.state?.from === 'home'
  const backTo = fromHome ? '/home' : '/reader'
  const backLabel = fromHome ? 'Back to home' : 'Back to discover'
  const goBack = () => navigate(backTo)
  const user = getUser()
  const { monetizationEnabled } = useConfig()
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [writerPoemUnlocked, setWriterPoemUnlocked] = useState(false)

  const writerNeedsSubscription =
    monetizationEnabled &&
    user?.role === 'writer' &&
    !hasActiveSubscription

  const showFullContent =
    !monetizationEnabled ||
    hasActiveSubscription ||
    (writerNeedsSubscription && writerPoemUnlocked)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    getWork(id)
      .then((w) => {
        setWork(w)
        setClapCount(Math.max(0, w.clapCount ?? 0))
      })
      .catch(() => setWork(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || !user?.id) return
    getWorkClapStatus(id, user.id)
      .then((res) => {
        setClapped(!!res.clapped)
        setClapCount(Math.max(0, res.clapCount ?? 0))
      })
      .catch(() => {})
  }, [id, user?.id])

  useEffect(() => {
    if (!id || !user?.id) return
    getSavedWorks(user.id)
      .then((list) => {
        const ids = Array.isArray(list) ? list.map((w) => w.id || w._id) : []
        setSaved(ids.includes(id))
      })
      .catch(() => {})
  }, [id, user?.id])

  useEffect(() => {
    if (!id) return
    setCommentsLoading(true)
    getWorkComments(id, { limit: 50 })
      .then(setCommentItems)
      .catch(() => setCommentItems([]))
      .finally(() => setCommentsLoading(false))
  }, [id])

  /** When monetization is on, resolve subscription so we can show full content or paywalled preview. */
  useEffect(() => {
    if (!monetizationEnabled) {
      setSubscriptionLoading(false)
      return
    }
    if (!user?.id) {
      setHasActiveSubscription(false)
      setSubscriptionLoading(false)
      return
    }
    setSubscriptionLoading(true)
    getMySubscription(user.id)
      .then((data) => {
        const sub = data?.subscription
        const active =
          !!sub &&
          sub.status === 'active' &&
          sub.currentPeriodEnd &&
          new Date(sub.currentPeriodEnd) > new Date()
        setHasActiveSubscription(!!active)
      })
      .catch(() => setHasActiveSubscription(false))
      .finally(() => setSubscriptionLoading(false))
  }, [monetizationEnabled, user?.id])

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpen])

  useEffect(() => {
    if (replyingToId) {
      const t = setTimeout(() => replyInputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [replyingToId])

  /**
   * Writers without a subscription can read up to 2 poems in full when monetization is enabled.
   * We persist unlocked poem IDs in localStorage.
   */
  useEffect(() => {
    if (!work?.id || !monetizationEnabled || user?.role !== 'writer' || hasActiveSubscription) {
      setWriterPoemUnlocked(false)
      return
    }
    if (work.category !== 'poem') {
      setWriterPoemUnlocked(false)
      return
    }

    const unlockedIds = getWriterFreePoemIds()
    if (unlockedIds.includes(work.id)) {
      setWriterPoemUnlocked(true)
      return
    }

    if (unlockedIds.length < WRITER_FREE_POEM_LIMIT) {
      const next = [...unlockedIds, work.id]
      saveWriterFreePoemIds(next)
      setWriterPoemUnlocked(true)
      return
    }

    setWriterPoemUnlocked(false)
  }, [work?.id, work?.category, monetizationEnabled, user?.role, hasActiveSubscription])

  const handleClap = async () => {
    if (!user?.id || pendingAction) return
    setPendingAction(true)
    const prevClapped = clapped
    const prevCount = clapCount
    setClapped(!prevClapped)
    setClapCount(Math.max(0, prevCount + (prevClapped ? -1 : 1)))
    try {
      const res = await toggleWorkClap(id, user.id)
      setClapped(!!res.clapped)
      setClapCount(Math.max(0, res.clapCount ?? 0))
    } catch {
      setClapped(prevClapped)
      setClapCount(prevCount)
    } finally {
      setPendingAction(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id || pendingAction) return
    setPendingAction(true)
    try {
      const res = await toggleSaveWork(id, user.id)
      setSaved(!!res.saved)
    } catch {
      // keep current state
    } finally {
      setPendingAction(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ url, title: work?.title })
      } catch {
        await navigator.clipboard.writeText(url)
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!user?.id || !commentText.trim() || pendingAction) return
    setPendingAction(true)
    try {
      const created = await createWorkComment(id, { content: commentText.trim(), userId: user.id })
      setCommentItems((prev) => [{ ...created, userName: user.penName || user.name || 'You' }, ...prev])
      setCommentText('')
    } catch {
      // could show toast
    } finally {
      setPendingAction(false)
    }
  }

  const handleReply = (parentId) => {
    setReplyingToId(parentId)
    setReplyText('')
    setTimeout(() => replyInputRef.current?.focus(), 100)
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault()
    if (!user?.id || !replyingToId || !replyText.trim() || pendingAction) return
    setPendingAction(true)
    try {
      const created = await createWorkComment(id, {
        content: replyText.trim(),
        userId: user.id,
        parentId: replyingToId,
      })
      setCommentItems((prev) => [{ ...created, userName: user.penName || user.name || 'You', parentId: replyingToId }, ...prev])
      setReplyText('')
      setReplyingToId(null)
    } catch {
      // could show toast
    } finally {
      setPendingAction(false)
    }
  }

  const scrollToComments = () => {
    commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  /** Track view on mount. */
  useEffect(() => {
    if (!id) return
    trackWorkView(id, user?.id).catch(() => {})
  }, [id, user?.id])

  /** Track read on leave or every 15s only when user has full access (subscribed or monetization off). */
  useEffect(() => {
    if (!id || !work || !showFullContent) return
    readStartTime.current = Date.now()

    const sendRead = () => {
      const timeSpent = Math.floor((Date.now() - (readStartTime.current || Date.now())) / 1000)
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      const progressPercentage = scrollHeight > 0 ? Math.min(100, Math.round((scrollTop / scrollHeight) * 100)) : 0
      trackWorkRead(id, { progressPercentage, timeSpent }, user?.id).catch(() => {})
    }

    readIntervalRef.current = setInterval(sendRead, 15000)

    return () => {
      if (readIntervalRef.current) clearInterval(readIntervalRef.current)
      sendRead()
    }
  }, [id, work, user?.id, showFullContent])

  if (loading) {
    return (
      <ReadingSkeleton />
    )
  }

  if (!work) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-stone-500 mb-4">Story not found.</p>
        <button type="button" onClick={goBack} className="text-yellow-600 font-medium hover:underline">
          ← {backLabel}
        </button>
      </div>
    )
  }

  const categoryLabel = { poem: 'Poem', short_story: 'Short Story', novel: 'Novel' }[work.category] || work.category
  const formatDateTime = (dateString) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  return (
    <article className="max-w-2xl mx-auto px-4 py-8">
      <button type="button" onClick={goBack} className="text-stone-500 text-sm hover:text-yellow-600 mb-6 inline-block">
        ← Back
      </button>
      <header className="mb-8">
        <p className="text-yellow-600 font-medium text-sm uppercase tracking-wide mb-2">{categoryLabel}</p>
        <h1 className="text-3xl font-bold text-stone-900 font-serif">{work.title}</h1>
        <p className="text-stone-600 mt-2">
          <Link to={`/author/${work.authorId}`} className="text-yellow-600 hover:underline font-medium">
            {work.author?.penName || 'Unknown'}
          </Link>
        </p>
        <p className="text-stone-500 text-sm mt-2">
          Posted {formatDateTime(work.createdAt)} · {work.readCount} reads
        </p>
      </header>

      {/* Engagement bar: clap, comment, save, share, more – before thumbnail and story body */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-4 mb-6 border-y border-stone-200">
        <div className="flex items-center gap-6 text-stone-500">
          <button
            type="button"
            onClick={handleClap}
            disabled={pendingAction || !user}
            className={`flex items-center gap-2 text-sm hover:text-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${clapped ? 'text-stone-900' : ''}`}
            aria-label={clapped ? 'Unclap' : 'Clap'}
          >
            <span className="text-lg leading-none" aria-hidden>👏</span>
            <span>{formatCount(clapCount)}</span>
          </button>
          <button
            type="button"
            onClick={scrollToComments}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            aria-label="Comments"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
            </svg>
            <span>{formatCount(commentsLoading ? (work.commentCount ?? 0) : commentItems.length)}</span>
          </button>
        </div>
        <div className="flex items-center gap-3 text-stone-500">
          <button
            type="button"
            onClick={handleSave}
            disabled={pendingAction || !user}
            className="p-2 rounded-full hover:bg-stone-100 hover:text-stone-700 transition-colors disabled:opacity-50"
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3h-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-stone-100 hover:text-stone-700 transition-colors"
            aria-label="Share"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933 2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
            </svg>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev) }}
              className="p-2 rounded-full hover:bg-stone-100 hover:text-stone-700 transition-colors"
              aria-label="More options"
              aria-expanded={menuOpen}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path fillRule="evenodd" d="M6 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" clipRule="evenodd" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 pt-1.5 z-50">
                <div className="absolute right-4 top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white drop-shadow-[0_-1px_1px_rgba(0,0,0,0.06)]" />
                <div className="min-w-[240px] rounded-lg bg-white border border-stone-200 shadow-lg py-1">
                  <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-t-lg" onClick={() => setMenuOpen(false)}>Follow author</button>
                  <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-none" onClick={() => setMenuOpen(false)}>Follow publication</button>
                  <div className="my-1 border-t border-stone-200" />
                  <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-none" onClick={() => setMenuOpen(false)}>Mute author</button>
                  <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-none" onClick={() => setMenuOpen(false)}>Mute publication</button>
                  <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-stone-50 rounded-b-lg" onClick={() => setMenuOpen(false)}>Report story…</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {work.thumbnailUrl && (
        <div className="rounded-xl overflow-hidden border border-stone-200 mb-8 max-w-2xl aspect-video bg-stone-100">
          <img src={getAssetUrl(work.thumbnailUrl)} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {showFullContent ? (
        <div className="prose prose-stone max-w-none font-serif text-lg leading-relaxed text-stone-800">
          {work.body != null && work.body !== '' ? (
            <div
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(work.body) }}
            />
          ) : (
            <p className="text-stone-500 italic">No content available for this story.</p>
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="prose prose-stone max-w-none font-serif text-lg leading-relaxed text-stone-800">
              {work.body != null && work.body !== '' ? (
                (() => {
                  const previewLength = 600
                  const fullText = stripHtml(work.body)
                  const preview = fullText.length <= previewLength ? fullText : `${fullText.slice(0, previewLength)}...`
                  return preview
                })()
              ) : (
                <p className="text-stone-500 italic">No content available for this story.</p>
              )}
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent"
              aria-hidden
            />
          </div>
          <div className="mt-6 p-6 rounded-xl border border-stone-200 bg-stone-50 max-w-2xl">
            <p className="text-stone-700 font-medium mb-2">Subscribe to read the full story</p>
            <p className="text-stone-600 text-sm mb-4">
              {writerNeedsSubscription
                ? `As a writer without a subscription, you can read up to ${WRITER_FREE_POEM_LIMIT} poems in full. Subscribe to unlock all stories.`
                : 'Get full access to all stories on Pennit with a monthly subscription.'}
            </p>
            <Link
              to="/pricing"
              className="inline-block px-5 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              View subscription plans
            </Link>
          </div>
        </>
      )}

      {/* Comments section */}
      <section ref={commentsSectionRef} className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Comments</h2>
        {commentsLoading ? (
          <p className="text-sm text-stone-500">Loading comments…</p>
        ) : (
          <>
            <ul className="space-y-4 mb-6">
              {commentItems.length === 0 ? (
                <li className="text-sm text-stone-500">No comments yet. Be the first to comment.</li>
              ) : (
                (() => {
                  const roots = commentItems.filter((c) => !c.parentId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  const repliesByParent = commentItems.reduce((acc, c) => {
                    if (c.parentId) {
                      if (!acc[c.parentId]) acc[c.parentId] = []
                      acc[c.parentId].push(c)
                    }
                    return acc
                  }, {})
                  return roots.map((root) => {
                    const replies = (repliesByParent[root.id] || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                    return (
                      <li key={root.id} className="border-b border-stone-100 pb-3 last:border-0">
                        <div className="text-sm">
                          <span className="font-medium text-stone-800">{root.userName || 'Reader'}</span>
                          <span className="text-stone-400 mx-2">·</span>
                          <span className="text-stone-700">{root.content}</span>
                        </div>
                        {user && (
                          <button
                            type="button"
                            onClick={() => handleReply(root.id)}
                            className="mt-1 text-xs font-medium text-stone-500 hover:text-stone-700"
                          >
                            Reply
                          </button>
                        )}
                        {replyingToId === root.id && user && (
                          <form onSubmit={handleSubmitReply} className="mt-2 flex gap-2">
                            <input
                              ref={replyingToId === root.id ? replyInputRef : undefined}
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                              disabled={pendingAction}
                            />
                            <button
                              type="submit"
                              disabled={pendingAction || !replyText.trim()}
                              className="px-3 py-2 text-sm font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50"
                            >
                              Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReplyingToId(null); setReplyText('') }}
                              className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700"
                            >
                              Cancel
                            </button>
                          </form>
                        )}
                        {replies.length > 0 && (
                          <ul className="mt-3 ml-4 pl-4 border-l-2 border-stone-200 space-y-2">
                            {replies.map((r) => {
                              const subReplies = (repliesByParent[r.id] || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                              return (
                                <li key={r.id}>
                                  <div className="text-sm">
                                    <span className="font-medium text-stone-800">{r.userName || 'Reader'}</span>
                                    <span className="text-stone-400 mx-2">·</span>
                                    <span className="text-stone-700">{r.content}</span>
                                  </div>
                                  {user && (
                                    <button
                                      type="button"
                                      onClick={() => handleReply(r.id)}
                                      className="mt-0.5 text-xs font-medium text-stone-500 hover:text-stone-700"
                                    >
                                      Reply
                                    </button>
                                  )}
                                  {replyingToId === r.id && user && (
                                    <form onSubmit={handleSubmitReply} className="mt-2 flex gap-2">
                                      <input
                                        ref={replyingToId === r.id ? replyInputRef : undefined}
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Write a reply..."
                                        className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                                        disabled={pendingAction}
                                      />
                                      <button
                                        type="submit"
                                        disabled={pendingAction || !replyText.trim()}
                                        className="px-3 py-2 text-sm font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50"
                                      >
                                        Reply
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setReplyingToId(null); setReplyText('') }}
                                        className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700"
                                      >
                                        Cancel
                                      </button>
                                    </form>
                                  )}
                                  {subReplies.length > 0 && (
                                    <ul className="mt-2 ml-3 pl-3 border-l border-stone-200 space-y-2">
                                      {subReplies.map((sr) => (
                                        <li key={sr.id} className="text-sm">
                                          <span className="font-medium text-stone-800">{sr.userName || 'Reader'}</span>
                                          <span className="text-stone-400 mx-2">·</span>
                                          <span className="text-stone-700">{sr.content}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  })
                })()
              )}
            </ul>
            {user ? (
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2.5 text-sm border border-stone-300 rounded-full focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  disabled={pendingAction}
                />
                <button
                  type="submit"
                  disabled={pendingAction || !commentText.trim()}
                  className="px-4 py-2.5 text-sm font-medium rounded-full bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </form>
            ) : (
              <p className="text-sm text-stone-500">Sign in to comment.</p>
            )}
          </>
        )}
      </section>

      <footer className="mt-12 pt-6 border-t border-stone-200">
        <p className="text-stone-500 text-sm">{work.readCount} reads</p>
        <Link to={`/author/${work.authorId}`} className="text-yellow-600 font-medium hover:underline mt-2 inline-block">
          More from {work.author?.penName || 'Unknown'}
        </Link>
      </footer>
    </article>
  )
}

function ReadingSkeleton() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-20 bg-stone-200 rounded-full mb-4" />
      <div className="h-8 w-3/4 bg-stone-200 rounded mb-3" />
      <div className="h-4 w-32 bg-stone-200 rounded mb-2" />
      <div className="h-3 w-40 bg-stone-200 rounded mb-8" />

      <div className="rounded-xl overflow-hidden border border-stone-200 mb-8 max-w-2xl aspect-video bg-stone-200" />

      <div className="space-y-3">
        <div className="h-4 bg-stone-200 rounded" />
        <div className="h-4 bg-stone-200 rounded w-11/12" />
        <div className="h-4 bg-stone-200 rounded w-10/12" />
        <div className="h-4 bg-stone-200 rounded w-9/12" />
      </div>
    </article>
  )
}
