import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  getWork,
  getAssetUrl,
  trackWorkView,
  trackWorkRead,
  trackWorkShare,
  getWorkClapStatus,
  toggleWorkClap,
  toggleSaveWork,
  getWorkComments,
  createWorkComment,
  getSavedWorks,
  getMySubscription,
  translateWork,
  toggleWorkCommentLike,
  getMyPlaylists,
  addWorkToPlaylist,
  removeWorkFromPlaylist,
  createPlaylist,
  tipWork,
  toggleFollowAuthor,
} from '../lib/api'
import { getUser } from '../lib/auth'
import { useConfig } from '../contexts/ConfigContext'
import { CONTENT_LANGUAGES, getLanguageName } from '../lib/languages'
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

/**
 * Shows a live countdown to when early-access expires (e.g. "23h 14m").
 * Ticks every minute. When expired it renders "a moment".
 */
function EarlyAccessCountdown({ until }) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    const compute = () => {
      const ms = new Date(until) - Date.now()
      if (ms <= 0) { setDisplay('a moment'); return }
      const totalMins = Math.ceil(ms / 60000)
      const hours = Math.floor(totalMins / 60)
      const mins = totalMins % 60
      if (hours > 0) setDisplay(`${hours}h ${mins}m`)
      else setDisplay(`${mins}m`)
    }
    compute()
    const timer = setInterval(compute, 60000)
    return () => clearInterval(timer)
  }, [until])

  return <strong>{display}</strong>
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
  const [responsesOpen, setResponsesOpen] = useState(false)
  const menuRef = useRef(null)
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
  const [isSubscriber, setIsSubscriber] = useState(false)
  const [canTip, setCanTip] = useState(false)
  const [trialEndsAt, setTrialEndsAt] = useState(null)
  const [writerPoemUnlocked, setWriterPoemUnlocked] = useState(false)
  const [viewLanguage, setViewLanguage] = useState(null)
  const [translated, setTranslated] = useState(null)
  const [translateLoading, setTranslateLoading] = useState(false)
  const [translateError, setTranslateError] = useState('')

  // Playlist state
  const [playlists, setPlaylists] = useState([])
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false)
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false)
  const playlistMenuRef = useRef(null)
  const [tipModalOpen, setTipModalOpen] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [tipSubmitting, setTipSubmitting] = useState(false)
  const [followAuthorLoading, setFollowAuthorLoading] = useState(false)
  const [tipSuccess, setTipSuccess] = useState(false)
  const [tipError, setTipError] = useState('')

  const writerNeedsSubscription =
    monetizationEnabled &&
    user?.role === 'writer' &&
    !hasActiveSubscription

  // Derived access-control flags
  const isEarlyAccess = work?.earlyAccessUntil
    ? new Date(work.earlyAccessUntil) > new Date()
    : false
  const isFeaturedWork = !!(work?.featured || work?.editorsPick)

  /**
   * Full-content visibility:
   * - Monetization off → always show
   * - Subscriber (trial or paid) → always show
   * - Writer: non-featured and not early-access → free; featured/early-access need subscription or 2 free poems
   * - Reader: featured/early-access need subscription; after window non-featured free
   */
  const showFullContent = (() => {
    if (!monetizationEnabled) return true
    if (isSubscriber) return true
    if (user?.role === 'writer' && !isFeaturedWork && !isEarlyAccess) return true
    if (writerNeedsSubscription && writerPoemUnlocked) return true
    if (isFeaturedWork) return false
    if (isEarlyAccess) return false
    return true
  })()

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('pennit:responses-open', { detail: { open: responsesOpen } }))
  }, [responsesOpen])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    getWork(id)
      .then((w) => {
        setWork(w)
        setClapCount(Math.max(0, w.clapCount ?? 0))
        setViewLanguage(null)
        setTranslated(null)
        setTranslateError('')
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

  // Load the user's playlists so they can add this work quickly (subscriber = trial or paid)
  useEffect(() => {
    if (!user?.id || !isSubscriber) return
    getMyPlaylists(user.id)
      .then((list) => setPlaylists(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [user?.id, isSubscriber])

  // Close playlist menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (playlistMenuRef.current && !playlistMenuRef.current.contains(e.target)) {
        setPlaylistMenuOpen(false)
        setShowNewPlaylistInput(false)
        setNewPlaylistName('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!id) return
    setCommentsLoading(true)
    getWorkComments(id, { limit: 50 }, user?.id)
      .then(setCommentItems)
      .catch(() => setCommentItems([]))
      .finally(() => setCommentsLoading(false))
  }, [id, user?.id])

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
        setIsSubscriber(!!data?.isSubscriber)
        setCanTip(!!data?.canTip)
        setTrialEndsAt(data?.trialEndsAt ?? null)
      })
      .catch(() => {
        setHasActiveSubscription(false)
        setIsSubscriber(false)
        setCanTip(false)
        setTrialEndsAt(null)
      })
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
    if (!work?.id || !monetizationEnabled || user?.role !== 'writer' || isSubscriber) {
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
  }, [work?.id, work?.category, monetizationEnabled, user?.role, isSubscriber])

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

  const handleTogglePlaylist = async (playlistId) => {
    if (!user?.id || !id) return
    const playlist = playlists.find((p) => p.id === playlistId)
    const alreadyIn = playlist?.workIds?.includes(id) ||
      (playlist?.workIds || []).some((wid) => String(wid) === String(id))
    try {
      if (alreadyIn) {
        await removeWorkFromPlaylist(user.id, playlistId, id)
        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === playlistId
              ? { ...p, workIds: (p.workIds || []).filter((wid) => String(wid) !== String(id)), workCount: Math.max(0, (p.workCount ?? 1) - 1) }
              : p
          )
        )
      } else {
        await addWorkToPlaylist(user.id, playlistId, id)
        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === playlistId
              ? { ...p, workIds: [...(p.workIds || []), id], workCount: (p.workCount ?? 0) + 1 }
              : p
          )
        )
      }
    } catch {
      // keep current state
    }
  }

  const handleCreateAndAddPlaylist = async () => {
    if (!user?.id || !newPlaylistName.trim()) return
    setPlaylistLoading(true)
    try {
      const created = await createPlaylist(user.id, { name: newPlaylistName.trim() })
      await addWorkToPlaylist(user.id, created.id, id)
      setPlaylists((prev) => [{ ...created, workIds: [id], workCount: 1 }, ...prev])
      setNewPlaylistName('')
      setShowNewPlaylistInput(false)
    } catch {
      // could show toast
    } finally {
      setPlaylistLoading(false)
    }
  }

  const authorId = work?.authorId?._id ?? work?.authorId?.id ?? work?.authorId

  const handleFollowAuthor = async () => {
    const aid = authorId != null ? String(authorId) : null
    if (!user?.id || !aid) return
    setMenuOpen(false)
    setFollowAuthorLoading(true)
    try {
      await toggleFollowAuthor(aid, user.id)
      window.dispatchEvent(new CustomEvent('pennit:user-updated'))
    } catch {
      // keep menu closed
    } finally {
      setFollowAuthorLoading(false)
    }
  }

  const handleTipSubmit = async (e) => {
    e.preventDefault()
    const amount = Number(tipAmount)
    if (!user?.id || !id || Number.isNaN(amount) || amount < 0.01 || amount > 9.99) return
    setTipSubmitting(true)
    setTipError('')
    try {
      await tipWork(id, user.id, amount)
      setTipSuccess(true)
      setTipAmount('')
      setTimeout(() => { setTipModalOpen(false); setTipSuccess(false) }, 1500)
    } catch (err) {
      setTipError(err?.message || 'Failed to send tip.')
    } finally {
      setTipSubmitting(false)
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
    // Record share signal for the personalised feed (fire-and-forget)
    if (id) {
      trackWorkShare(id, user?.id).catch(() => {})
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

  const handleToggleCommentLike = async (commentId) => {
    if (!user?.id || pendingAction) return
    setPendingAction(true)
    try {
      const res = await toggleWorkCommentLike(id, commentId, user.id)
      setCommentItems((prev) =>
        prev.map((c) =>
          c.id === res.commentId
            ? { ...c, liked: !!res.liked, likeCount: Math.max(0, res.likeCount ?? 0) }
            : c
        )
      )
    } catch {
      // ignore – could show toast
    } finally {
      setPendingAction(false)
    }
  }

  const sourceLanguage = work?.language || 'en'
  const handleTranslateTo = async (targetCode) => {
    if (!work?.id) return
    setTranslateError('')
    if (targetCode === sourceLanguage || !targetCode) {
      setViewLanguage(null)
      setTranslated(null)
      return
    }
    setTranslateLoading(true)
    try {
      const data = await translateWork(work.id, targetCode)
      setTranslated(data)
      setViewLanguage(targetCode)
    } catch (err) {
      setTranslateError(err?.message || 'Translation unavailable. Try again later.')
      setTranslated(null)
      setViewLanguage(null)
    } finally {
      setTranslateLoading(false)
    }
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
      // Pass viewLanguage so the feed knows which language this user reads in
      const lang = viewLanguage ?? work?.language ?? 'en'
      trackWorkRead(id, { progressPercentage, timeSpent, language: lang }, user?.id).catch(() => {})
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
    <>
    <article className="max-w-2xl mx-auto px-4 py-8">
      <button type="button" onClick={goBack} className="text-stone-500 text-sm hover:text-yellow-600 mb-6 inline-block">
        ← Back
      </button>
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-yellow-600 font-medium text-sm uppercase tracking-wide">{categoryLabel}</p>
          {work.editorsPick && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200">
              ⭐ Editor's Pick
            </span>
          )}
          {!work.editorsPick && work.featured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200">
              Featured
            </span>
          )}
          {isEarlyAccess && isSubscriber && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200">
              🕐 Early access
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-stone-900 font-serif">
          {translated?.title ?? work.title}
        </h1>
        <p className="text-stone-600 mt-2">
          <Link to={`/author/${work.authorId}`} className="text-yellow-600 hover:underline font-medium">
            {work.author?.penName || 'Unknown'}
          </Link>
        </p>
        <p className="text-stone-500 text-sm mt-2">
          Posted {formatDateTime(work.createdAt)} · {work.readCount} reads
          {work.language && (
            <> · Language: {getLanguageName(work.language)}</>
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="reading-translate" className="text-sm font-medium text-stone-600">Translate to:</label>
          <select
            id="reading-translate"
            value={viewLanguage ?? sourceLanguage}
            onChange={(e) => handleTranslateTo(e.target.value || null)}
            disabled={translateLoading}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value={sourceLanguage}>Original ({getLanguageName(sourceLanguage)})</option>
            {CONTENT_LANGUAGES.filter((l) => l.code !== sourceLanguage).map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          {translateLoading && <span className="text-sm text-stone-400">Translating…</span>}
          {translateError && <span className="text-sm text-red-600">{translateError}</span>}
        </div>
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
            onClick={() => setResponsesOpen(true)}
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

          {/* Add to playlist — subscriber only */}
          {isSubscriber && user && (
            <div className="relative" ref={playlistMenuRef}>
              <button
                type="button"
                onClick={() => { setPlaylistMenuOpen((p) => !p); setShowNewPlaylistInput(false); setNewPlaylistName('') }}
                className="p-2 rounded-full hover:bg-stone-100 hover:text-stone-700 transition-colors"
                aria-label="Add to playlist"
                title="Add to playlist"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h4.5M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </button>
              {playlistMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-xl bg-white border border-stone-200 shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100">
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Add to playlist</p>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {playlists.length === 0 && !showNewPlaylistInput && (
                      <p className="px-4 py-3 text-sm text-stone-400">No playlists yet.</p>
                    )}
                    {playlists.map((pl) => {
                      const isIn = (pl.workIds || []).some((wid) => String(wid) === String(id))
                      return (
                        <button
                          key={pl.id}
                          type="button"
                          onClick={() => handleTogglePlaylist(pl.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-left"
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isIn ? 'bg-stone-900 border-stone-900' : 'border-stone-300'}`}>
                            {isIn && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                              </svg>
                            )}
                          </span>
                          <span className="text-sm text-stone-700 truncate">{pl.name}</span>
                          <span className="ml-auto text-xs text-stone-400 flex-shrink-0">{pl.workCount ?? 0}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="border-t border-stone-100 p-3">
                    {showNewPlaylistInput ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndAddPlaylist() }}
                          placeholder="Playlist name…"
                          className="flex-1 text-sm border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-stone-900"
                        />
                        <button
                          type="button"
                          onClick={handleCreateAndAddPlaylist}
                          disabled={!newPlaylistName.trim() || playlistLoading}
                          className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {playlistLoading ? '…' : 'Create'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowNewPlaylistInput(true)}
                        className="w-full flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 font-medium transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                        </svg>
                        New playlist
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
          {canTip && (
            <button
              type="button"
              onClick={() => { setTipModalOpen(true); setTipError(''); setTipSuccess(false); setTipAmount('') }}
              className="p-2 rounded-full hover:bg-amber-100 hover:text-amber-700 transition-colors"
              aria-label="Tip writer"
              title="Tip the writer"
            >
              <span className="text-lg leading-none" aria-hidden>⭐</span>
            </button>
          )}
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
                  <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-t-lg disabled:opacity-50" onClick={handleFollowAuthor} disabled={!authorId || followAuthorLoading}>
                    {followAuthorLoading ? '…' : 'Follow author'}
                  </button>
                  <div className="my-1 border-t border-stone-200" />
                  <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-none" onClick={() => setMenuOpen(false)}>Mute author</button>
                  {isSubscriber && (
                    <>
                      <div className="my-1 border-t border-stone-200" />
                      <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 rounded-none" onClick={() => { setMenuOpen(false); setPlaylistMenuOpen(true) }}>Add to playlist</button>
                    </>
                  )}
                  <div className="my-1 border-t border-stone-200" />
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
          {translated ? (
            <>
              {translated.excerpt && (
                <p className="text-stone-600 text-lg leading-relaxed mb-6">{translated.excerpt}</p>
              )}
              {translated.body != null && translated.body !== '' ? (
                <div className="whitespace-pre-wrap">{translated.body}</div>
              ) : (
                <p className="text-stone-500 italic">No content available for this story.</p>
              )}
              <p className="mt-4 text-sm text-stone-400 italic">Translated to {getLanguageName(translated.language)}.</p>
            </>
          ) : work.body != null && work.body !== '' ? (
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

          {/* Contextual paywall card */}
          {isFeaturedWork ? (
            <div className="mt-6 p-6 rounded-xl border border-amber-200 bg-amber-50 max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-500 text-lg">⭐</span>
                <p className="text-stone-900 font-semibold">
                  {work.editorsPick ? "Editor's Pick" : 'Featured piece'}
                </p>
              </div>
              <p className="text-stone-600 text-sm mb-4">
                This curated piece is exclusively available to Pennit subscribers. Subscribe to unlock it along with all featured content.
              </p>
              <Link
                to="/pricing"
                className="inline-block px-5 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                Subscribe to read
              </Link>
            </div>
          ) : isEarlyAccess ? (
            <div className="mt-6 p-6 rounded-xl border border-blue-200 bg-blue-50 max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-500 text-lg">🕐</span>
                <p className="text-stone-900 font-semibold">Early access — subscribers only right now</p>
              </div>
              <p className="text-stone-600 text-sm mb-1">
                This piece was just published. Subscribers can read it immediately.
                Free readers will get access in{' '}
                <EarlyAccessCountdown until={work.earlyAccessUntil} />.
              </p>
              <p className="text-stone-500 text-xs mb-4">Subscribe now for instant access to all new publications.</p>
              <Link
                to="/pricing"
                className="inline-block px-5 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
              >
                Subscribe for early access
              </Link>
            </div>
          ) : (
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
          )}
        </>
      )}

      <footer className="mt-12 pt-6 border-t border-stone-200">
        <p className="text-stone-500 text-sm">{work.readCount} reads</p>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <Link to={`/author/${work.authorId}`} className="text-yellow-600 font-medium hover:underline">
            More from {work.author?.penName || 'Unknown'}
          </Link>
          {canTip && (
            <button
              type="button"
              onClick={() => { setTipModalOpen(true); setTipError(''); setTipSuccess(false); setTipAmount('') }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200 transition-colors"
            >
              <span>⭐</span> Tip writer
            </button>
          )}
        </div>
      </footer>
    </article>

    {/* Tip modal */}
    {tipModalOpen && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40" aria-modal="true" role="dialog">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-stone-900">Tip the writer</h3>
            <button
              type="button"
              onClick={() => { setTipModalOpen(false); setTipError(''); setTipAmount('') }}
              className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {tipSuccess ? (
            <p className="text-green-600 font-medium text-center py-4">Thank you! Your tip was sent.</p>
          ) : (
            <form onSubmit={handleTipSubmit} className="space-y-4">
              <p className="text-stone-600 text-sm">Amount (GH₵): min 0.01, max 9.99. Goes to {work?.author?.penName || 'the author'}.</p>
              <input
                type="number"
                min="0.01"
                max="9.99"
                step="0.01"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                placeholder="e.g. 2.00"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
              {tipError && <p className="text-red-600 text-sm">{tipError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setTipModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-medium hover:bg-stone-50">Cancel</button>
                <button type="submit" disabled={tipSubmitting || !tipAmount || Number(tipAmount) < 0.01 || Number(tipAmount) > 9.99} className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50">
                  {tipSubmitting ? 'Sending…' : 'Send tip'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}

    {/* Responses drawer */}
    <div
      className={`fixed inset-0 z-[60] flex justify-end transition-opacity duration-300 ease-out ${
        responsesOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!responsesOpen}
    >
      <button
        type="button"
        className="flex-1 bg-black/30 transition-opacity duration-300 ease-out"
        aria-label="Close responses"
        onClick={() => { setResponsesOpen(false); setReplyingToId(null); setReplyText('') }}
      />
      <aside
        className={`w-full max-w-md h-full bg-white shadow-2xl border-l border-stone-200 flex flex-col transform transition-transform duration-300 ease-out ${
          responsesOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
          <header className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Responses ({formatCount(commentItems.length)})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => { setResponsesOpen(false); setReplyingToId(null); setReplyText('') }}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            {user ? (
              <form onSubmit={handleSubmitComment} className="mb-4">
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-[0.12em] mb-2">
                  What are your thoughts?
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="w-full text-sm resize-none rounded-xl border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 placeholder:text-stone-400"
                  placeholder="Share your response…"
                  disabled={pendingAction}
                />
                <div className="mt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCommentText('')}
                    className="text-xs font-medium text-stone-500 hover:text-stone-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pendingAction || !commentText.trim()}
                    className="px-4 py-1.5 text-xs font-semibold rounded-full bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Respond
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-stone-500 mb-2">Sign in to add a response.</p>
            )}

            {commentsLoading ? (
              <p className="text-sm text-stone-500">Loading responses…</p>
            ) : commentItems.length === 0 ? (
              <p className="text-sm text-stone-500">No responses yet. Be the first.</p>
            ) : (
              <ul className="space-y-5">
                {(() => {
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
                      <li key={root.id}>
                        <div className="text-sm">
                          <span className="font-medium text-stone-900">{root.userName || 'Reader'}</span>
                          {root.commenterIsSubscriber && (
                            <span className="ml-1 text-amber-500" title="Subscriber" aria-label="Subscriber">⭐</span>
                          )}
                          <span className="text-stone-400 mx-2">·</span>
                          <span className="text-stone-700">{root.content}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-xs text-stone-500">
                          <button
                            type="button"
                            onClick={() => handleToggleCommentLike(root.id)}
                            className={`inline-flex items-center gap-1 hover:text-stone-800 transition-colors ${root.liked ? 'text-stone-900' : ''}`}
                            disabled={pendingAction || !user}
                          >
                            <span aria-hidden>👏</span>
                            <span>{formatCount(root.likeCount ?? 0)}</span>
                          </button>
                          {user && (
                            <button
                              type="button"
                              onClick={() => handleReply(root.id)}
                              className="font-medium hover:text-stone-800"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                        {replyingToId === root.id && user && (
                          <form onSubmit={handleSubmitReply} className="mt-2 flex gap-2">
                            <input
                              ref={replyingToId === root.id ? replyInputRef : undefined}
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply…"
                              className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                              disabled={pendingAction}
                            />
                            <button
                              type="submit"
                              disabled={pendingAction || !replyText.trim()}
                              className="px-3 py-2 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50"
                            >
                              Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReplyingToId(null); setReplyText('') }}
                              className="px-3 py-2 text-xs text-stone-500 hover:text-stone-700"
                            >
                              Cancel
                            </button>
                          </form>
                        )}
                        {replies.length > 0 && (
                          <ul className="mt-3 ml-4 pl-3 border-l border-stone-200 space-y-2">
                            {replies.map((r) => (
                              <li key={r.id}>
                                <div className="text-sm">
                                  <span className="font-medium text-stone-800">{r.userName || 'Reader'}</span>
                                  {r.commenterIsSubscriber && (
                                    <span className="ml-1 text-amber-500" title="Subscriber" aria-label="Subscriber">⭐</span>
                                  )}
                                  <span className="text-stone-400 mx-2">·</span>
                                  <span className="text-stone-700">{r.content}</span>
                                </div>
                                <div className="mt-1 flex items-center gap-4 text-xs text-stone-500">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCommentLike(r.id)}
                                    className={`inline-flex items-center gap-1 hover:text-stone-800 transition-colors ${r.liked ? 'text-stone-900' : ''}`}
                                    disabled={pendingAction || !user}
                                  >
                                    <span aria-hidden>👏</span>
                                    <span>{formatCount(r.likeCount ?? 0)}</span>
                                  </button>
                                  {user && (
                                    <button
                                      type="button"
                                      onClick={() => handleReply(r.id)}
                                      className="font-medium hover:text-stone-800"
                                    >
                                      Reply
                                    </button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })
                })()}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
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
