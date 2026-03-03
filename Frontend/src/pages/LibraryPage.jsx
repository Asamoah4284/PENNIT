import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  getSavedWorks,
  getAssetUrl,
  getMyPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  getPlaylistWorks,
  removeWorkFromPlaylist,
  getMySubscription,
} from '../lib/api'
import { getUser } from '../lib/auth'
import { useConfig } from '../contexts/ConfigContext'

const TABS = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'saved-lists', label: 'Saved' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'reading-history', label: 'History' },
]

/** Small lock icon used alongside private playlists */
function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
    </svg>
  )
}

/** Inline text-input for creating / renaming a playlist */
function PlaylistNameInput({ defaultValue = '', placeholder = 'Playlist name…', onConfirm, onCancel, loading }) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="flex gap-2 items-center">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onConfirm(value.trim())
          if (e.key === 'Escape') onCancel()
        }}
        placeholder={placeholder}
        className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-shadow"
      />
      <button
        type="button"
        onClick={() => value.trim() && onConfirm(value.trim())}
        disabled={!value.trim() || loading}
        className="px-3.5 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium disabled:opacity-40 hover:bg-stone-700 transition-colors"
      >
        {loading ? '…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-2 rounded-lg text-sm text-stone-500 hover:bg-stone-100 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('playlists')
  const [showCreateCard, setShowCreateCard] = useState(true)

  // Saved works
  const [savedWorks, setSavedWorks] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedError, setSavedError] = useState(null)

  // Playlists
  const [playlists, setPlaylists] = useState([])
  const [playlistsLoading, setPlaylistsLoading] = useState(false)
  const [playlistsError, setPlaylistsError] = useState(null)
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  // Open playlist detail
  const [openPlaylist, setOpenPlaylist] = useState(null) // { id, name, … }
  const [openWorks, setOpenWorks] = useState([])
  const [openWorksLoading, setOpenWorksLoading] = useState(false)
  const [editingPlaylistId, setEditingPlaylistId] = useState(null) // renaming

  // Subscription
  const [hasSubscription, setHasSubscription] = useState(false)

  const user = getUser()
  const { monetizationEnabled } = useConfig()

  /** Resolve subscriber access (trial or active subscription) for playlists */
  useEffect(() => {
    if (!user?.id || !monetizationEnabled) {
      setHasSubscription(!monetizationEnabled)
      return
    }
    getMySubscription(user.id)
      .then((data) => {
        setHasSubscription(!!data?.isSubscriber)
      })
      .catch(() => setHasSubscription(false))
  }, [user?.id, monetizationEnabled])

  /** Load saved works */
  useEffect(() => {
    if (activeTab !== 'saved-lists' || !user) return
    setSavedLoading(true)
    setSavedError(null)
    getSavedWorks(user.id)
      .then((data) => setSavedWorks(Array.isArray(data) ? data : []))
      .catch(() => { setSavedError('Could not load saved stories.'); setSavedWorks([]) })
      .finally(() => setSavedLoading(false))
  }, [activeTab, user?.id])

  /** Load playlists */
  useEffect(() => {
    if (activeTab !== 'playlists' || !user?.id || !hasSubscription) return
    setPlaylistsLoading(true)
    setPlaylistsError(null)
    getMyPlaylists(user.id)
      .then((list) => setPlaylists(Array.isArray(list) ? list : []))
      .catch(() => setPlaylistsError('Could not load playlists.'))
      .finally(() => setPlaylistsLoading(false))
  }, [activeTab, user?.id, hasSubscription])

  const handleCreatePlaylist = async (name) => {
    if (!user?.id) return
    setCreateLoading(true)
    try {
      const pl = await createPlaylist(user.id, { name })
      setPlaylists((prev) => [{ ...pl, workCount: 0 }, ...prev])
      setShowCreateInput(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleRenamePlaylist = async (playlistId, name) => {
    if (!user?.id) return
    try {
      const updated = await updatePlaylist(user.id, playlistId, { name })
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, name: updated.name } : p)))
      if (openPlaylist?.id === playlistId) setOpenPlaylist((p) => ({ ...p, name: updated.name }))
    } catch (err) {
      alert(err.message)
    } finally {
      setEditingPlaylistId(null)
    }
  }

  const handleDeletePlaylist = async (playlistId) => {
    if (!user?.id || !window.confirm('Delete this playlist?')) return
    try {
      await deletePlaylist(user.id, playlistId)
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId))
      if (openPlaylist?.id === playlistId) setOpenPlaylist(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleOpenPlaylist = async (pl) => {
    setOpenPlaylist(pl)
    setOpenWorksLoading(true)
    try {
      const data = await getPlaylistWorks(pl.id, user.id)
      setOpenWorks(data.works || [])
    } catch {
      setOpenWorks([])
    } finally {
      setOpenWorksLoading(false)
    }
  }

  const handleRemoveFromPlaylist = async (workId) => {
    if (!openPlaylist || !user?.id) return
    try {
      await removeWorkFromPlaylist(user.id, openPlaylist.id, workId)
      setOpenWorks((prev) => prev.filter((w) => (w.id || w._id) !== workId))
      setPlaylists((prev) =>
        prev.map((p) => p.id === openPlaylist.id ? { ...p, workCount: Math.max(0, (p.workCount ?? 1) - 1) } : p)
      )
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Your library</h1>
        {activeTab === 'playlists' && hasSubscription && (
          <button
            type="button"
            onClick={() => { setShowCreateInput((p) => !p); setOpenPlaylist(null) }}
            className="px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            New playlist
          </button>
        )}
      </div>

      {/* Tabs */}
      <nav className="border-b border-stone-200 mb-8">
        <ul className="flex gap-6 overflow-x-auto pb-px">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => { setActiveTab(tab.id); setOpenPlaylist(null); setShowCreateInput(false) }}
                className={`py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-stone-900 border-b-2 border-stone-900'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* ═══ PLAYLISTS TAB ═══ */}
      {activeTab === 'playlists' && (
        <>
          {!hasSubscription ? (
            /* Upsell for non-subscribers */
            <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 overflow-hidden">
              <div className="relative p-8 sm:p-10">
                <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-white/10 translate-x-1/2 -translate-y-1/2" />
                <h2 className="text-white font-bold text-xl sm:text-2xl mb-3 relative">
                  Playlists are a subscriber feature
                </h2>
                <p className="text-white/80 text-sm sm:text-base mb-6 relative max-w-md">
                  Organise your favourite stories, poems, and novels into curated playlists.
                  Subscribe to unlock this and all premium features.
                </p>
                <Link
                  to="/pricing"
                  className="inline-block px-6 py-3 rounded-xl bg-white text-green-700 text-sm font-bold hover:bg-green-50 transition-colors"
                >
                  View subscription plans
                </Link>
              </div>
            </div>
          ) : openPlaylist ? (
            /* ── Playlist detail view ── */
            <div>
              <button
                type="button"
                onClick={() => setOpenPlaylist(null)}
                className="flex items-center gap-1.5 text-stone-500 text-sm hover:text-stone-900 mb-6 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Back to playlists
              </button>

              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  {editingPlaylistId === openPlaylist.id ? (
                    <div className="max-w-sm">
                      <PlaylistNameInput
                        defaultValue={openPlaylist.name}
                        onConfirm={(name) => handleRenamePlaylist(openPlaylist.id, name)}
                        onCancel={() => setEditingPlaylistId(null)}
                      />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-stone-900">{openPlaylist.name}</h2>
                      {openPlaylist.description && (
                        <p className="text-stone-500 text-sm mt-1">{openPlaylist.description}</p>
                      )}
                    </>
                  )}
                  <p className="text-stone-400 text-xs mt-2 flex items-center gap-1">
                    {openWorks.length} {openWorks.length === 1 ? 'story' : 'stories'}
                    {openPlaylist.isPrivate && <><span>·</span><LockIcon /><span>Private</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingPlaylistId(openPlaylist.id)}
                    className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                    title="Rename"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePlaylist(openPlaylist.id)}
                    className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete playlist"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {openWorksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-stone-50 animate-pulse">
                      <div className="w-12 h-12 rounded-lg bg-stone-200 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-stone-200 rounded w-2/3" />
                        <div className="h-3 bg-stone-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : openWorks.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-stone-400 text-sm">This playlist is empty.</p>
                  <p className="text-stone-400 text-xs mt-1">Add stories while reading by tapping the playlist icon.</p>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white overflow-hidden">
                  {openWorks.map((work) => (
                    <li key={work.id} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-stone-50 transition-colors">
                      <Link to={`/reading/${work.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                          {work.thumbnailUrl ? (
                            <img src={getAssetUrl(work.thumbnailUrl)} alt={work.title} className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-900 truncate">{work.title}</p>
                          <p className="text-xs text-stone-500 truncate">{work.author?.penName || 'Unknown'}</p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromPlaylist(work.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Remove from playlist"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            /* ── Playlists list view ── */
            <div className="space-y-4">
              {/* New playlist input */}
              {showCreateInput && (
                <div className="rounded-xl border border-stone-200 bg-white p-4">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">New playlist</p>
                  <PlaylistNameInput
                    placeholder="e.g. Poems to Read, Night Reading…"
                    onConfirm={handleCreatePlaylist}
                    onCancel={() => setShowCreateInput(false)}
                    loading={createLoading}
                  />
                </div>
              )}

              {/* Green promo card */}
              {showCreateCard && playlists.length === 0 && !showCreateInput && (
                <div className="relative rounded-2xl bg-green-500 overflow-hidden">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-green-400/40 -translate-x-1/2" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-green-400/40 translate-x-1/2" />
                  <div className="relative flex items-center justify-between gap-6 p-6 sm:p-8">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-lg sm:text-xl leading-snug mb-4">
                        Create a playlist to organise and revisit your favourite pieces
                      </p>
                      <button
                        type="button"
                        onClick={() => { setShowCreateInput(true); setShowCreateCard(false) }}
                        className="px-4 py-2.5 rounded-lg bg-green-800 text-white text-sm font-semibold hover:bg-green-900 transition-colors"
                      >
                        Start a playlist
                      </button>
                    </div>
                    <div className="flex-shrink-0 hidden sm:flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-green-800">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-800">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                      </svg>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateCard(false)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                      aria-label="Dismiss"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {playlistsError && <p className="text-sm text-red-600">{playlistsError}</p>}

              {playlistsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl bg-white border border-stone-200 p-5 animate-pulse flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-stone-200 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-stone-200 rounded w-1/3" />
                        <div className="h-3 bg-stone-100 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {playlists.map((pl) => (
                    <div key={pl.id} className="group rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden hover:border-stone-300 transition-colors">
                      <button
                        type="button"
                        onClick={() => handleOpenPlaylist(pl)}
                        className="w-full text-left"
                      >
                        <div className="p-5 sm:p-6 flex gap-4 items-center">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
                              <span className="text-stone-500 font-bold text-lg">{pl.name.charAt(0).toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingPlaylistId === pl.id ? (
                              <div onClick={(e) => e.stopPropagation()}>
                                <PlaylistNameInput
                                  defaultValue={pl.name}
                                  onConfirm={(name) => handleRenamePlaylist(pl.id, name)}
                                  onCancel={() => setEditingPlaylistId(null)}
                                />
                              </div>
                            ) : (
                              <h2 className="text-base font-bold text-stone-900 truncate">{pl.name}</h2>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-xs text-stone-400">
                              <span>{pl.workCount ?? 0} {(pl.workCount ?? 0) === 1 ? 'story' : 'stories'}</span>
                              {pl.isPrivate && (
                                <span className="flex items-center gap-0.5"><LockIcon /> Private</span>
                              )}
                            </div>
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-stone-300 shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </button>
                      {/* Inline actions on hover */}
                      <div className="hidden group-hover:flex items-center gap-1 px-5 pb-4">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingPlaylistId(pl.id) }}
                          className="text-xs text-stone-500 hover:text-stone-900 px-2.5 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(pl.id) }}
                          className="text-xs text-red-500 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {!playlistsLoading && playlists.length === 0 && !showCreateInput && (
                    <p className="text-center py-12 text-stone-400 text-sm">
                      No playlists yet.{' '}
                      <button type="button" onClick={() => setShowCreateInput(true)} className="text-stone-600 font-medium hover:underline">
                        Create one
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ SAVED LISTS TAB ═══ */}
      {activeTab === 'saved-lists' && (
        <>
          {savedError && <p className="mb-4 text-sm text-red-600">{savedError}</p>}

          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
                  <span className="text-stone-500 font-semibold text-lg">
                    {(user?.name || user?.email || 'R').charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900">{user?.name || user?.email || 'Reader'}</p>
                <h2 className="text-lg font-bold text-stone-900 mt-1">Reading list</h2>
                <div className="flex items-center gap-2 mt-2 text-sm text-stone-500">
                  {savedLoading ? (
                    <span>Loading…</span>
                  ) : (
                    <span>{savedWorks.length} {savedWorks.length === 1 ? 'story' : 'stories'}</span>
                  )}
                  <span className="flex items-center gap-1 text-stone-400">
                    <LockIcon />
                    <span>Private</span>
                  </span>
                </div>
              </div>
            </div>

            {savedWorks.length > 0 && (
              <div className="border-t border-stone-100 bg-stone-50/60">
                <ul className="divide-y divide-stone-100">
                  {savedWorks.map((work) => (
                    <li key={work.id}>
                      <Link
                        to={`/reading/${work.id}`}
                        className="flex items-center gap-4 px-5 sm:px-6 py-3 hover:bg-stone-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-200 flex-shrink-0">
                          {work.thumbnailUrl ? (
                            <img src={getAssetUrl(work.thumbnailUrl)} alt={work.title} className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">{work.title}</p>
                          <p className="text-xs text-stone-500 truncate">{work.excerpt || work.genre || 'Saved story'}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-stone-300">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ PLACEHOLDER TABS ═══ */}
      {(activeTab === 'highlights' || activeTab === 'reading-history') && (
        <div className="text-center py-20">
          <p className="text-stone-400 text-sm">Coming soon.</p>
        </div>
      )}
    </div>
  )
}
