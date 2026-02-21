import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getReaderStats, getAssetUrl } from '../lib/api'
import { getUser } from '../lib/auth'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
]

function formatReadingTime(seconds) {
  if (!seconds || seconds < 60) return '0 min'
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/* ─── Charts ─── */
function BarChart({ data, valueKey, labelKey, color = '#292524', height = 100 }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1)
  const barW = 28
  const gap = 10
  const topPad = 22
  const width = data.length * (barW + gap) - gap
  return (
    <svg viewBox={`0 0 ${width} ${height + topPad}`} className="w-full" style={{ height: height + topPad }}>
      {data.map((d, i) => {
        const barH = Math.max(Math.round((d[valueKey] / max) * height), d[valueKey] > 0 ? 2 : 0)
        const x = i * (barW + gap)
        const y = height - barH + topPad
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} opacity={0.85} />
            <text x={x + barW / 2} y={height + topPad - 2} textAnchor="middle" fontSize={9} fill="#78716c">{d[labelKey]}</text>
            {d[valueKey] > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#57534e" fontWeight="600">{d[valueKey]}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function LineAreaChart({ data, color = '#292524', height = 130 }) {
  const values = data.map((d) => d.reads)
  const max = Math.max(...values, 1)
  const w = 600
  const pts = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * w : w / 2
    const y = height - (v / max) * (height - 10)
    return [x, y]
  })
  const polyPoints = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const areaPoints = [`0,${height}`, ...pts.map(([x, y]) => `${x},${y}`), `${w},${height}`].join(' ')
  const total = values.reduce((a, b) => a + b, 0)
  const xLabels = data
    .filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0)
    .map((d) => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <p className="text-xs text-stone-500">Last 30 days</p>
        <p className="text-2xl font-bold text-stone-900">{total} reads</p>
      </div>
      <svg viewBox={`0 0 ${w} ${height + 20}`} className="w-full" preserveAspectRatio="none" style={{ height: height + 20 }}>
        <defs>
          <linearGradient id="readerAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = height - t * (height - 10)
          return <line key={t} x1={0} y1={y} x2={w} y2={y} stroke="#e7e5e4" strokeWidth={1} />
        })}
        <polygon points={areaPoints} fill="url(#readerAreaGrad)" />
        <polyline points={polyPoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {pts.filter((_, i) => i % 5 === 0).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill={color} />
        ))}
      </svg>
      {xLabels.length > 0 && (
        <div className="flex justify-between text-xs text-stone-400 mt-1 px-1">
          {xLabels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  )
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-stone-100 rounded-xl ${className}`} />
}

function StatCard({ label, value, sub }) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-stone-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const CATEGORY_LABELS = { poem: 'Poem', short_story: 'Short Story', novel: 'Novel' }

export default function ReadingStatsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback((showLoading = true) => {
    const user = getUser()
    if (!user) {
      setError('Not logged in.')
      setLoading(false)
      return
    }
    if (showLoading) setLoading(true)
    else setRefreshing(true)
    setError(null)
    getReaderStats(user.id)
      .then((data) => {
        setStats(data)
        setLastUpdated(new Date())
      })
      .catch((err) => setError(err?.message || 'Failed to load reading stats'))
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    fetchStats(true)
  }, [fetchStats])

  useEffect(() => {
    const interval = setInterval(() => fetchStats(false), 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchStats])

  useEffect(() => {
    const onFocus = () => fetchStats(false)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchStats])

  const handleRefresh = () => fetchStats(false)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Reading progress</h1>
          {lastUpdated && !error && (
            <p className="text-stone-500 text-sm mt-1">
              Live data · Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <nav className="border-b border-stone-200 mb-8">
        <ul className="flex gap-6 overflow-x-auto pb-px">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                  activeTab === tab.id ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-sm text-red-600 mb-6">
          {error}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </>
            ) : (
              <>
                <StatCard
                  label="Stories read"
                  value={(stats?.totalWorksRead ?? 0).toLocaleString()}
                  sub="Completed (60%+ read)"
                />
                <StatCard
                  label="Saved"
                  value={(stats?.savedCount ?? 0).toLocaleString()}
                  sub="In your library"
                />
                <StatCard
                  label="Reading time"
                  value={formatReadingTime(stats?.totalTimeSpentSeconds ?? 0)}
                  sub="Total time on stories"
                />
              </>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-5">Reads — Last 7 days</h2>
            {loading ? (
              <Skeleton className="h-32" />
            ) : (
              <BarChart
                data={stats?.dailyReads ?? []}
                valueKey="reads"
                labelKey="day"
                color="#292524"
                height={100}
              />
            )}
          </div>

          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-4">Recently read</h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !stats?.recentReads?.length ? (
              <p className="text-stone-500 text-sm">Stories you finish reading will appear here.</p>
            ) : (
              <ul className="space-y-3">
                {stats.recentReads.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/reading/${r.id}`}
                      className="flex gap-4 p-3 rounded-xl hover:bg-stone-50 transition-colors"
                    >
                      <div className="w-12 h-16 rounded-lg bg-stone-100 flex-shrink-0 overflow-hidden">
                        {r.thumbnailUrl ? (
                          <img src={getAssetUrl(r.thumbnailUrl)} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-stone-900 truncate">{r.title}</p>
                        <p className="text-xs text-stone-500">{r.authorName} · {CATEGORY_LABELS[r.category] || r.category}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Read {new Date(r.readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-stone-400 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-5">Read trend — Last 30 days</h2>
            {loading ? (
              <Skeleton className="h-40" />
            ) : (
              <LineAreaChart data={stats?.monthlyReads ?? []} color="#292524" height={130} />
            )}
          </div>
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-5">This week</h2>
            {loading ? (
              <Skeleton className="h-32" />
            ) : (
              <BarChart
                data={stats?.dailyReads ?? []}
                valueKey="reads"
                labelKey="day"
                color="#78716c"
                height={110}
              />
            )}
          </div>
        </div>
      )}

    </div>
  )
}
