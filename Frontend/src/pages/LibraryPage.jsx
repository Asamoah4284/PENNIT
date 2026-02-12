import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSavedWorks, getAssetUrl } from '../lib/api'
import { getUser } from '../lib/auth'

const TABS = [
  { id: 'your-lists', label: 'Your lists' },
  { id: 'saved-lists', label: 'Saved lists' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'reading-history', label: 'Reading history' },
  { id: 'responses', label: 'Responses' },
]

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('your-lists')
  const [showCreateCard, setShowCreateCard] = useState(true)
  const [savedWorks, setSavedWorks] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedError, setSavedError] = useState(null)

  const user = getUser()

  useEffect(() => {
    if (activeTab !== 'saved-lists' || !user) return

    setSavedLoading(true)
    setSavedError(null)
    getSavedWorks(user.id)
      .then((data) => {
        setSavedWorks(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setSavedError('Could not load saved stories.')
        setSavedWorks([])
      })
      .finally(() => {
        setSavedLoading(false)
      })
  }, [activeTab, user?.id])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header: title + New list button */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
          Your library
        </h1>
        <button
          type="button"
          className="px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          New list
        </button>
      </div>

      {/* Tabs */}
      <nav className="border-b border-stone-200 mb-8">
        <ul className="flex gap-6 overflow-x-auto pb-px">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
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

      {/* Green "Create a list" card - shown on Saved lists tab */}
      {activeTab === 'saved-lists' && showCreateCard && (
        <div className="relative rounded-2xl bg-green-500 overflow-hidden mb-6">
          {/* Decorative arcs */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-green-400/40 -translate-x-1/2" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-green-400/40 translate-x-1/2" />

          <div className="relative flex items-center justify-between gap-6 p-6 sm:p-8">
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-lg sm:text-xl leading-snug mb-4">
                Create a list to easily organize and share stories
              </p>
              <button
                type="button"
                className="px-4 py-2.5 rounded-lg bg-green-800 text-white text-sm font-semibold hover:bg-green-900 transition-colors"
              >
                Start a list
              </button>
            </div>
            <div className="flex-shrink-0 hidden sm:block relative">
              <div className="w-16 h-16 rounded-full bg-white border-2 border-green-800 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-800">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                </svg>
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-green-800 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateCard(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Saved lists content */}
      {activeTab === 'saved-lists' && (
        <>
          {savedError && (
            <p className="mb-4 text-sm text-red-600">
              {savedError}
            </p>
          )}

          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
            <button
              type="button"
              className="w-full text-left"
            >
              <div className="p-5 sm:p-6 flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
                    <span className="text-stone-500 font-semibold text-lg">
                      {(user?.name || user?.email || 'R').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900">
                    {user?.name || user?.email || 'Reader'}
                  </p>
                  <h2 className="text-lg font-bold text-stone-900 mt-1">Reading list</h2>
                  <div className="flex items-center gap-2 mt-2 text-sm text-stone-500">
                    {savedLoading ? (
                      <span>Loading stories…</span>
                    ) : savedWorks.length === 0 ? (
                      <span>No stories</span>
                    ) : (
                      <span>
                        {savedWorks.length} {savedWorks.length === 1 ? 'story' : 'stories'}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-stone-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                      </svg>
                      <span>Private</span>
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-4">
                  <span className="hidden sm:inline-block text-stone-400 text-sm">…</span>
                  <div className="hidden sm:flex flex-shrink-0 gap-2">
                    {(savedWorks.length ? savedWorks.slice(0, 3) : [1, 2, 3]).map((item, index) => (
                      <div key={item.id || index} className="w-12 h-16 rounded bg-stone-100" />
                    ))}
                  </div>
                </div>
              </div>
            </button>

            {/* Saved stories visible only to the owner */}
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
                            <img
                              src={getAssetUrl(work.thumbnailUrl)}
                              alt={work.title}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">
                            {work.title}
                          </p>
                          <p className="text-xs text-stone-500 truncate">
                            {work.excerpt || work.genre || 'Saved story'}
                          </p>
                        </div>
                        <span className="text-stone-300">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
