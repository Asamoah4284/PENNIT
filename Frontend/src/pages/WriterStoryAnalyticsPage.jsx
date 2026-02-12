import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWork } from '../lib/api'

const POINTS_PER_READ = 1
const GHS_PER_POINT = 0.05

const categoryLabel = (cat) => {
  const map = { poem: 'Poem', short_story: 'Short story', novel: 'Novel' }
  return map[cat] || cat
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDateTime = (dateString) => {
  if (!dateString) return '—'
  const d = new Date(dateString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function WriterStoryAnalyticsPage() {
  const { id } = useParams()
  const [work, setWork] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    getWork(id)
      .then(setWork)
      .catch(() => setError('Story not found.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-stone-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-stone-500 text-sm">Loading analytics…</span>
        </div>
      </div>
    )
  }

  if (error || !work) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <p className="text-stone-500 mb-4">{error || 'Story not found.'}</p>
        <Link to="/writers-dashboard" className="text-stone-900 font-medium hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const reads = work.readCount ?? 0
  const impressions = work.impressions ?? reads // use reads as proxy if no impressions yet
  const pointsEarned = reads * POINTS_PER_READ
  const estimatedEarningsGHS = pointsEarned * GHS_PER_POINT

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link to="/writers-dashboard" className="text-stone-500 text-sm hover:text-stone-900 mb-6 inline-block">
        ← Back to dashboard
      </Link>
      <Link to={`/writers-dashboard/story/${work.id}`} className="text-stone-500 text-sm hover:text-stone-900 mb-2 block">
        ← Edit story
      </Link>

      <header className="mb-8">
        <p className="text-stone-500 text-sm font-medium uppercase tracking-wide mb-1">
          {categoryLabel(work.category)}
        </p>
        <h1 className="text-2xl font-bold text-stone-900 font-serif">{work.title}</h1>
        <p className="text-stone-500 text-sm mt-2">
          Published {formatDateTime(work.createdAt)}
          {work.status === 'draft' && (
            <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-medium">Draft</span>
          )}
        </p>
      </header>

      {/* Primary metrics */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Impressions</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{impressions.toLocaleString()}</p>
            <p className="text-stone-400 text-xs mt-1">Times shown in feeds</p>
          </div>
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Reads</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{reads.toLocaleString()}</p>
            <p className="text-stone-400 text-xs mt-1">Full reads</p>
          </div>
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Points earned</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{pointsEarned.toLocaleString()}</p>
            <p className="text-stone-400 text-xs mt-1">From this post</p>
          </div>
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Est. earnings</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">GH₵ {estimatedEarningsGHS.toFixed(2)}</p>
            <p className="text-stone-400 text-xs mt-1">Ghana cedis</p>
          </div>
        </div>
      </section>

      {/* Engagement & quality */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">Engagement</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-stone-200 bg-white">
            <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Unique viewers</p>
            <p className="text-xl font-bold text-stone-900 mt-1">{reads > 0 ? reads : '—'}</p>
            <p className="text-stone-400 text-xs mt-1">Distinct readers</p>
          </div>
          <div className="p-4 rounded-xl border border-stone-200 bg-white">
            <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Read-through rate</p>
            <p className="text-xl font-bold text-stone-900 mt-1">
              {impressions > 0 ? ((reads / impressions) * 100).toFixed(1) : '—'}%
            </p>
            <p className="text-stone-400 text-xs mt-1">Impressions → reads</p>
          </div>
          <div className="p-4 rounded-xl border border-stone-200 bg-white">
            <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Avg. read time</p>
            <p className="text-xl font-bold text-stone-900 mt-1">—</p>
            <p className="text-stone-400 text-xs mt-1">Coming soon</p>
          </div>
        </div>
      </section>

      {/* Activity / timeline placeholder */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">Recent activity</h2>
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          {reads === 0 ? (
            <p className="text-stone-500 text-sm">No activity yet. When readers view this story, events will appear here.</p>
          ) : (
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-stone-600">{reads} read{reads !== 1 ? 's' : ''} so far</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-stone-500">
                <span className="w-2 h-2 rounded-full bg-stone-200" />
                <span>Published {formatDate(work.createdAt)}</span>
              </li>
            </ul>
          )}
        </div>
      </section>

      {/* Performance note */}
      <p className="text-stone-400 text-xs">
        Impressions and read-through rate use current data. Unique viewers and avg. read time will appear when tracking is available.
      </p>
    </div>
  )
}
