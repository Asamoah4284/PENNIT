import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getUser } from '../lib/auth'
import { getWorks } from '../lib/api'

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatReads = (count) => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

const categoryLabel = (cat) => {
  const map = { poem: 'Poem', short_story: 'Short story', novel: 'Novel' }
  return map[cat] || cat
}

export default function WritersDashboardPage() {
  const user = getUser()
  const [activeTab, setActiveTab] = useState('overview')
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)

  const authorId = user?.authorId
  const fetchMyWorks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getWorks()
      const mine = authorId ? data.filter((w) => w.authorId === authorId) : []
      setWorks(mine)
    } finally {
      setLoading(false)
    }
  }, [authorId])

  useEffect(() => {
    fetchMyWorks()
  }, [fetchMyWorks])

  const totalReads = works.reduce((sum, w) => sum + (w.readCount || 0), 0)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header: title + New story */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-stone-900 tracking-tight">Writers</h1>
        <Link
          to="/writers-dashboard/new"
          className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
        >
          New story
        </Link>
      </div>

      {/* Tabs – same pattern as Home */}
      <div className="flex gap-6 border-b border-stone-200 mb-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'overview' ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Overview
          {activeTab === 'overview' && <span className="absolute bottom-0 left-0 right-0 h-px bg-stone-900" />}
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'posts' ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
        >
          My posts
          {activeTab === 'posts' && <span className="absolute bottom-0 left-0 right-0 h-px bg-stone-900" />}
        </button>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Reads</p>
              <p className="text-2xl font-bold text-stone-900 mt-1">{formatReads(totalReads)}</p>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Stories</p>
              <p className="text-2xl font-bold text-stone-900 mt-1">{works.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Followers</p>
              <p className="text-2xl font-bold text-stone-900 mt-1">—</p>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Earnings</p>
              <p className="text-2xl font-bold text-stone-900 mt-1">—</p>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-medium text-stone-500 mb-4">Top stories</h2>
            {works.length === 0 ? (
              <p className="text-stone-500 text-sm py-6">No stories yet. Write your first one.</p>
            ) : (
              <ul className="space-y-1">
                {[...works]
                  .sort((a, b) => (b.readCount || 0) - (a.readCount || 0))
                  .slice(0, 5)
                  .map((w) => (
                    <li key={w.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                      <Link to={`/writers-dashboard/story/${w.id}`} className="text-stone-900 font-medium hover:underline truncate flex-1 min-w-0">
                        {w.title}
                      </Link>
                      <span className="text-stone-500 text-sm flex-shrink-0 ml-3">{formatReads(w.readCount)} reads</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* My posts – manage list, same card feel as Home */}
      {activeTab === 'posts' && (
        <div className="space-y-8">
          {loading ? (
            <p className="text-stone-500 text-sm py-8">Loading…</p>
          ) : works.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-stone-500 text-sm mb-4">You haven’t published any stories yet.</p>
              <Link
                to="/writers-dashboard/new"
                className="inline-block px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
              >
                New story
              </Link>
            </div>
          ) : (
            works.map((work) => (
              <article key={work.id} className="group">
                <Link to={`/writers-dashboard/story/${work.id}`} className="flex gap-6">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-stone-900 leading-snug group-hover:underline line-clamp-2 mb-2">
                      {work.title}
                    </h2>
                    <p className="text-stone-600 text-base leading-relaxed line-clamp-2 mb-3">
                      {work.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-stone-500">
                      <span className="text-yellow-500">✦</span>
                      <span>{categoryLabel(work.category)}</span>
                      <span>{formatDate(work.createdAt)}</span>
                      <span>{formatReads(work.readCount)} reads</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-32 h-20 rounded-sm overflow-hidden bg-stone-200">
                    {work.thumbnailUrl ? (
                      <img src={work.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-stone-300 to-stone-400" />
                    )}
                  </div>
                </Link>
                <div className="border-b border-stone-200 mt-8" />
              </article>
            ))
          )}
        </div>
      )}
    </div>
  )
}
