import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAuthor, getAssetUrl, toggleFollowAuthor } from '../lib/api'
import { getUser } from '../lib/auth'

const CATEGORY_LABELS = { poem: 'Poem', short_story: 'Short Story', novel: 'Novel' }

const formatReads = (count) => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count ?? 0)
}

export default function AuthorPage() {
  const { id } = useParams()
  const [author, setAuthor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingFollow, setPendingFollow] = useState(false)

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
        <Link to="/reader" className="text-yellow-600 font-medium hover:underline">Back to discover</Link>
      </div>
    )
  }

  const works = (author.works || []).filter((w) => w.status !== 'draft')
  const totalReads = works.reduce((sum, w) => sum + (w.readCount || 0), 0)

  const followerCount = author.followerCount ?? 0

  const handleToggleFollow = async () => {
    if (!user) return
    setPendingFollow(true)
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full min-w-0">
      <Link to="/reader" className="text-stone-500 text-sm hover:text-yellow-600 mb-6 inline-block">
        ← Back to discover
      </Link>

      {/* Profile header */}
      <header className="mb-10">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-center justify-between">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center text-2xl sm:text-3xl font-bold text-amber-800 border-2 border-amber-200/80">
              {author.penName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif tracking-tight">
                {author.penName || 'Author'}
              </h1>
              {author.bio && (
                <p className="text-stone-600 mt-2 leading-relaxed max-w-xl">
                  {author.bio}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleFollow}
            disabled={pendingFollow || !user}
            className={`mt-4 sm:mt-0 px-4 py-2 rounded-full text-sm font-medium border ${
              author._following
                ? 'border-stone-300 text-stone-700 bg-stone-100'
                : 'border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            {author._following ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
          <div className="p-4 sm:p-5 rounded-2xl bg-stone-900 text-white">
            <p className="text-stone-300 text-xs font-medium uppercase tracking-wider">Total reads</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{formatReads(totalReads)}</p>
            <p className="text-stone-400 text-xs mt-1">Across all works</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-white">
            <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Stories</p>
            <p className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1">{works.length}</p>
            <p className="text-stone-400 text-xs mt-1">Published</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-white">
            <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Followers</p>
            <p className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1">{followerCount}</p>
            <p className="text-stone-400 text-xs mt-1">Readers following</p>
          </div>
        </div>
      </header>

      {/* Works list */}
      <section>
        <h2 className="text-lg font-semibold text-stone-900 mb-6">Works</h2>
        {works.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-12 text-center">
            <p className="text-stone-500">No published works yet.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {works.map((work) => (
              <li key={work.id}>
                <Link
                  to={`/reading/${work.id}`}
                  className="group flex gap-4 p-4 rounded-2xl border border-stone-200 bg-white hover:border-amber-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-stone-100">
                    {work.thumbnailUrl ? (
                      <img
                        src={getAssetUrl(work.thumbnailUrl)}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-200 to-stone-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-stone-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-700 text-xs font-medium uppercase tracking-wider">
                      {CATEGORY_LABELS[work.category] || work.category}
                    </p>
                    <h3 className="font-semibold text-stone-900 group-hover:text-amber-800 line-clamp-2 mt-0.5">
                      {work.title}
                    </h3>
                    {work.excerpt && (
                      <p className="text-stone-500 text-sm mt-1 line-clamp-2">
                        {work.excerpt}
                      </p>
                    )}
                    <p className="text-stone-400 text-sm mt-2">
                      <span className="font-medium text-stone-600">{formatReads(work.readCount)} reads</span>
                      <span className="mx-1">·</span>
                      <span>this work</span>
                    </p>
                  </div>
                  <span className="flex-shrink-0 self-center text-stone-400 group-hover:text-stone-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
