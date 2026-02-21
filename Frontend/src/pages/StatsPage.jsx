import { useState, useEffect, useCallback } from 'react'
import { getWriterStats } from '../lib/api'
import { getUser } from '../lib/auth'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'reads', label: 'Reads' },
  { id: 'engagement', label: 'Engagement' },
]

const CATEGORY_COLORS = {
  short_story: '#292524',
  poem: '#78716c',
  novel: '#d6d3d1',
}

/* ─── Minimal SVG icons (no emoji) ─── */
function IconReads({ className = 'w-5 h-5', stroke = '#a8a29e' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}
function IconStories({ className = 'w-5 h-5', stroke = '#a8a29e' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}
function IconFollowers({ className = 'w-5 h-5', stroke = '#a8a29e' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconClaps({ className = 'w-5 h-5', stroke = '#78716c' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15 9 22 9 17 14 18 22 12 18 6 22 7 14 2 9 9 9" />
    </svg>
  )
}
function IconComments({ className = 'w-5 h-5', stroke = '#78716c' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function IconSaves({ className = 'w-5 h-5', stroke = '#78716c' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/* ─── SVG Charts ─── */

function BarChart({ data, valueKey, labelKey, color = '#292524', height = 100 }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1)
  const barW = 28
  const gap = 10
  const topPad = 22
  const width = data.length * (barW + gap) - gap

  return (
    <svg
      viewBox={`0 0 ${width} ${height + topPad}`}
      className="w-full"
      style={{ height: height + topPad }}
    >
      {data.map((d, i) => {
        const barH = Math.max(Math.round((d[valueKey] / max) * height), d[valueKey] > 0 ? 2 : 0)
        const x = i * (barW + gap)
        const y = height - barH + topPad
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} opacity={0.85} />
            <text x={x + barW / 2} y={height + topPad - 2} textAnchor="middle" fontSize={9} fill="#78716c">
              {d[labelKey]}
            </text>
            {d[valueKey] > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#57534e" fontWeight="600">
                {d[valueKey]}
              </text>
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
    .filter((_, i) => i % Math.floor(data.length / 6) === 0)
    .map((d) => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <p className="text-xs text-stone-500">Last 30 days</p>
        <p className="text-2xl font-bold text-stone-900">{total.toLocaleString()} reads</p>
      </div>
      <svg viewBox={`0 0 ${w} ${height + 20}`} className="w-full" preserveAspectRatio="none" style={{ height: height + 20 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = height - t * (height - 10)
          return <line key={t} x1={0} y1={y} x2={w} y2={y} stroke="#e7e5e4" strokeWidth={1} />
        })}
        <polygon points={areaPoints} fill="url(#areaGrad)" />
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

function DonutChart({ data, size = 150, centerLabel = 'works' }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-[150px] h-[150px] rounded-full border border-stone-200 flex items-center justify-center bg-stone-50/50">
          <span className="text-xs text-stone-400">No data</span>
        </div>
      </div>
    )
  }
  const r = 52
  const cx = size / 2
  const cy = size / 2
  let cumAngle = -Math.PI / 2

  const slices = data.map((d) => {
    const angle = (d.count / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    const x2 = cx + r * Math.cos(cumAngle + angle)
    const y2 = cy + r * Math.sin(cumAngle + angle)
    const large = angle > Math.PI ? 1 : 0
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    cumAngle += angle
    return { path, color: d.color }
  })

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
        <circle cx={cx} cy={cy} r={32} fill="white" stroke="#f5f5f4" strokeWidth={1} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight="600" fill="#292524">
          {total}
        </text>
        <text x={cx} y={cy + 17} textAnchor="middle" fontSize={9} fill="#78716c">
          {centerLabel}
        </text>
      </svg>
      <ul className="space-y-1.5 w-full">
        {data.map((d, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-stone-600">{d.label}</span>
            </span>
            <span className="font-semibold text-stone-900">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HorizontalBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-stone-600 font-medium truncate max-w-[60%]">{label}</span>
        <span className="text-stone-900 font-bold">{value.toLocaleString()}</span>
      </div>
      <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-stone-300">{icon}</span>}
      </div>
      <p className="text-3xl font-bold text-stone-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-stone-100 rounded-xl ${className}`} />
}

export default function StatsPage() {
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
    getWriterStats(user.id)
      .then((data) => {
        setStats(data)
        setLastUpdated(new Date())
      })
      .catch((err) => {
        const msg = err?.message || 'Failed to load stats'
        if (msg.includes('Writer account not found')) {
          setError(user.role === 'writer'
            ? 'Your writer profile could not be loaded. Try signing out and signing in again.'
            : 'Stats are for writers. Sign in with a writer account to see your stats.')
        } else {
          setError(msg)
        }
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    fetchStats(true)
  }, [fetchStats])

  // Auto-refresh every 60 seconds for live stats
  useEffect(() => {
    const interval = setInterval(() => fetchStats(false), 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchStats])

  // Refresh when user returns to the tab/window
  useEffect(() => {
    const onFocus = () => fetchStats(false)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchStats])

  const handleRefresh = () => fetchStats(false)

  const donutData = (stats?.contentBreakdown ?? []).map((b) => ({
    label: b.label,
    count: b.count,
    color: CATEGORY_COLORS[b.category] ?? '#d6d3d1',
  }))

  const engMax = stats
    ? Math.max(stats.totalClaps, stats.totalComments, stats.totalSaves, 1)
    : 1

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Stats</h1>
          {lastUpdated && !error && (
            <p className="text-stone-500 text-sm mt-1">
              Live data · Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 disabled:opacity-50 disabled:pointer-events-none"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
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
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </>
            ) : (
              <>
                <StatCard label="Total Reads" value={(stats?.totalReads ?? 0).toLocaleString()} sub="Across all stories" icon={<IconReads />} />
                <StatCard label="Stories" value={stats?.totalStories ?? 0} sub={`${stats?.totalDrafts ?? 0} draft${stats?.totalDrafts !== 1 ? 's' : ''}`} icon={<IconStories />} />
                <StatCard label="Followers" value={(stats?.totalFollowers ?? 0).toLocaleString()} sub="Readers following you" icon={<IconFollowers />} />
              </>
            )}
          </div>

          {/* Daily reads bar chart */}
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-5">Reads — Last 7 Days</h2>
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

          {/* Content breakdown + top stories */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-stone-900 mb-4">Content Breakdown</h2>
              {loading ? <Skeleton className="h-40" /> : <DonutChart data={donutData} size={150} />}
            </div>
            <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-stone-900 mb-4">Top Stories</h2>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : stats?.topWorks?.length ? (
                <ul className="space-y-3">
                  {stats.topWorks.slice(0, 4).map((w, i) => (
                    <li key={w.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-stone-300 w-4 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">{w.title}</p>
                        <p className="text-xs text-stone-400 capitalize">{w.category.replace('_', ' ')}</p>
                      </div>
                      <span className="text-xs font-semibold text-stone-600 flex-shrink-0">
                        {w.reads.toLocaleString()} reads
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-400 text-center py-4">No published stories yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── READS ── */}
      {activeTab === 'reads' && (
        <div className="space-y-6">
          {/* Monthly line/area chart */}
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-5">Read Trend</h2>
            {loading ? (
              <Skeleton className="h-40" />
            ) : (
              <LineAreaChart data={stats?.monthlyReads ?? []} color="#292524" height={130} />
            )}
          </div>

          {/* This-week bar chart */}
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-5">This Week</h2>
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

          {/* Top stories by reads */}
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-5">Stories by Reads</h2>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : stats?.topWorks?.length ? (
              <div className="space-y-4">
                {stats.topWorks.map((w, i) => (
                  <HorizontalBar
                    key={w.id}
                    label={w.title}
                    value={w.reads}
                    max={stats.topWorks[0].reads}
                    color="#292524"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400 text-center py-4">No data yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ── ENGAGEMENT ── */}
      {activeTab === 'engagement' && (
        <div className="space-y-6">
          {/* Horizontal bars overview */}
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-5">Engagement Overview</h2>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : (
              <div className="space-y-5">
                <HorizontalBar label="Claps" value={stats?.totalClaps ?? 0} max={engMax} color="#292524" />
                <HorizontalBar label="Comments" value={stats?.totalComments ?? 0} max={engMax} color="#78716c" />
                <HorizontalBar label="Saves" value={stats?.totalSaves ?? 0} max={engMax} color="#a8a29e" />
              </div>
            )}
          </div>

          {/* Claps per story bar chart */}
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-900 mb-5">Claps per Story</h2>
            {loading ? (
              <Skeleton className="h-32" />
            ) : stats?.topWorks?.length ? (
              <BarChart
                data={stats.topWorks.map((w) => ({
                  title: w.title.split(' ')[0],
                  claps: w.claps,
                }))}
                valueKey="claps"
                labelKey="title"
                color="#a8a29e"
                height={100}
              />
            ) : (
              <p className="text-sm text-stone-400 text-center py-4">No data yet.</p>
            )}
          </div>

          {/* Donut + summary cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-stone-900 mb-4">Engagement Split</h2>
              {loading ? (
                <Skeleton className="h-40" />
              ) : (
                <DonutChart
                  data={[
                    { label: 'Claps', count: stats?.totalClaps ?? 0, color: '#292524' },
                    { label: 'Comments', count: stats?.totalComments ?? 0, color: '#78716c' },
                    { label: 'Saves', count: stats?.totalSaves ?? 0, color: '#a8a29e' },
                  ]}
                  size={150}
                  centerLabel="total"
                />
              )}
            </div>
            <div className="space-y-3">
              {[
                { label: 'Claps', key: 'totalClaps', Icon: IconClaps },
                { label: 'Comments', key: 'totalComments', Icon: IconComments },
                { label: 'Saves', key: 'totalSaves', Icon: IconSaves },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 bg-white">
                  <span className="flex-shrink-0 text-stone-300">
                    <m.Icon stroke="#a8a29e" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">{m.label}</p>
                    {loading ? (
                      <Skeleton className="h-7 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-stone-900 leading-none mt-0.5">
                        {(stats?.[m.key] ?? 0).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
