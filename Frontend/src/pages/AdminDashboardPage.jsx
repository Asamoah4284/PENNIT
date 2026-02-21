import { useState, useEffect, useRef } from 'react'
import { getUser } from '../lib/auth'
import {
    getAdminStats, getAdminUsers, getAdminWorks,
    updateAdminUserRole, deleteAdminWork, approveAdminWork, editAdminWork,
    deleteAdminUser,
} from '../lib/api'
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import RichTextEditor from '../components/RichTextEditor'

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
const PIE_PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EF4444']
const STATUS_PALETTE = { published: '#10B981', pending: '#F59E0B', draft: '#9CA3AF' }
const ACCENT = '#6366F1'
const GREEN = '#10B981'

/* ─── Tiny helpers ─────────────────────────────────────────────────────────── */
function Badge({ children, color = 'gray' }) {
    const map = {
        gray: 'bg-[#F3F4F6] text-[#374151]',
        green: 'bg-green-50 text-green-700',
        blue: 'bg-blue-50 text-blue-700',
        purple: 'bg-purple-50 text-purple-700',
        red: 'bg-red-50 text-red-600',
        yellow: 'bg-yellow-50 text-yellow-700',
    }
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${map[color]}`}>
            {children}
        </span>
    )
}
function roleColor(r) { return r === 'admin' ? 'purple' : r === 'writer' ? 'blue' : 'gray' }
function Skeleton({ className }) { return <div className={`animate-pulse bg-[#F3F4F6] rounded ${className}`} /> }

function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 shadow-sm text-[12px]">
            <p className="font-semibold text-[#111] mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {prefix}{p.value}{suffix}</p>
            ))}
        </div>
    )
}

function StatCard({ label, value, sub, icon, loading }) {
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">{label}</span>
                <span className="text-[#D1D5DB]">{icon}</span>
            </div>
            {loading ? (<><Skeleton className="h-7 w-24" /><Skeleton className="h-3 w-32 mt-1" /></>) : (
                <>
                    <span className="text-[28px] font-bold text-[#111] leading-none tracking-tight">{value}</span>
                    {sub && <span className="text-[12px] text-[#9CA3AF] font-medium">{sub}</span>}
                </>
            )}
        </div>
    )
}

function ChartCard({ title, sub, children, loading, minHeight = 200 }) {
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F3F4F6]">
                <p className="text-[13px] font-semibold text-[#111]">{title}</p>
                {sub && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{sub}</p>}
            </div>
            <div className="p-5" style={{ minHeight }}>
                {loading ? (
                    <div className="flex items-end gap-2 h-full">
                        {[60, 80, 50, 90, 70, 85].map((h, i) => (
                            <div key={i} className="flex-1 bg-[#F3F4F6] rounded animate-pulse" style={{ height: `${h}%` }} />
                        ))}
                    </div>
                ) : children}
            </div>
        </div>
    )
}

/* ─── Edit Slide-over ───────────────────────────────────────────────────────── */
function EditPanel({ work, onClose, onSave }) {
    const [form, setForm] = useState({
        title: work.title ?? '',
        excerpt: work.excerpt ?? '',
        genre: work.genre ?? '',
        category: work.category ?? 'short_story',
        status: work.status ?? 'published',
        body: work.body ?? '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const overlayRef = useRef(null)

    // close on backdrop click
    const handleBackdrop = (e) => { if (e.target === overlayRef.current) onClose() }

    const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true); setError(null)
        try {
            const updated = await onSave(work.id, form)
            onClose(updated)
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const inputCls = 'w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111] font-medium placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-shadow'
    const labelCls = 'block text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-1.5'

    return (
        <div
            ref={overlayRef}
            onClick={handleBackdrop}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex justify-end"
            style={{ animation: 'fadeIn 0.15s ease' }}
        >
            <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideIn { from { transform:translateX(100%) } to { transform:translateX(0) } }
      `}</style>
            <div
                className="w-full max-w-[520px] h-full bg-white shadow-2xl flex flex-col"
                style={{ animation: 'slideIn 0.2s cubic-bezier(0.32,0.72,0,1)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#F3F4F6] shrink-0">
                    <div>
                        <p className="text-[14px] font-bold text-[#111]">Edit Work</p>
                        <p className="text-[12px] text-[#9CA3AF] mt-0.5 truncate max-w-[240px] sm:max-w-[340px]">{work.title}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 sm:w-4 sm:h-4">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-[12px] font-medium px-3 py-2 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className={labelCls}>Title</label>
                        <input value={form.title} onChange={handleChange('title')} className={inputCls} placeholder="Work title" required />
                    </div>

                    {/* Category + Status row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Category</label>
                            <select value={form.category} onChange={handleChange('category')} className={inputCls}>
                                <option value="short_story">Short Story</option>
                                <option value="poem">Poem</option>
                                <option value="novel">Novel</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Status</label>
                            <select value={form.status} onChange={handleChange('status')} className={inputCls}>
                                <option value="published">Published</option>
                                <option value="pending">Pending</option>
                                <option value="draft">Draft</option>
                            </select>
                        </div>
                    </div>

                    {/* Genre */}
                    <div>
                        <label className={labelCls}>Genre</label>
                        <input value={form.genre} onChange={handleChange('genre')} className={inputCls} placeholder="e.g. Romance, Sci-Fi, Mystery…" />
                    </div>

                    {/* Excerpt */}
                    <div>
                        <label className={labelCls}>Excerpt / Description</label>
                        <textarea
                            value={form.excerpt} onChange={handleChange('excerpt')}
                            rows={3} className={`${inputCls} resize-none`}
                            placeholder="A short description displayed in cards and listings…"
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className={labelCls}>Body</label>
                        <style>{`
                            .admin-quill .ql-toolbar { border-radius: 8px 8px 0 0; background: #FAFAFA; }
                            .admin-quill .ql-container { border-radius: 0 0 8px 8px; font-size: 13px; }
                            .admin-quill .ql-editor { min-height: 200px; sm:min-height: 260px; max-height: 400px; overflow-y: auto; line-height: 1.75; }
                        `}</style>
                        <div className="admin-quill">
                            <RichTextEditor
                                value={form.body}
                                onChange={(val) => setForm(f => ({ ...f, body: val }))}
                                placeholder="Full content of the work…"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#F3F4F6] flex items-center justify-between shrink-0 bg-white">
                    <button type="button" onClick={onClose} className="text-[13px] font-medium text-[#6B7280] hover:text-[#111] transition-colors px-4 py-2 rounded-lg hover:bg-[#F3F4F6]">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 bg-[#111] hover:bg-[#222] text-white text-[13px] font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {saving && (
                            <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        )}
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboardPage({ tab = 'overview' }) {
    const user = getUser()
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [works, setWorks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [editing, setEditing] = useState(null) // work being edited

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); setError(null)
            try {
                if (tab === 'overview') setStats(await getAdminStats(user.id))
                else if (tab === 'users') setUsers(await getAdminUsers(user.id))
                else if (tab === 'works') setWorks(await getAdminWorks(user.id))
            } catch (err) { setError(err.message) }
            finally { setLoading(false) }
        }
        if (user) fetchData()
    }, [tab, user?.id])

    /* handlers */
    const handleRoleChange = async (uid, role) => {
        try {
            await updateAdminUserRole(user.id, uid, role)
            setUsers(p => p.map(u => u.id === uid ? { ...u, role } : u))
        } catch (err) { alert(err.message) }
    }
    const handleDeleteWork = async (wid) => {
        if (!window.confirm('Permanently delete this work?')) return
        try { await deleteAdminWork(user.id, wid); setWorks(p => p.filter(w => w.id !== wid)) }
        catch (err) { alert(err.message) }
    }
    const handleDeleteUser = async (uid) => {
        if (uid === user.id) return alert('You cannot delete your own account.')
        if (!window.confirm('Permanently delete this user? Their profile and works may remain as orphans if not handled. Proceed?')) return
        try {
            await deleteAdminUser(user.id, uid)
            setUsers(p => p.filter(u => u.id !== uid))
        } catch (err) { alert(err.message) }
    }
    const handleApproveWork = async (wid) => {
        try {
            await approveAdminWork(user.id, wid)
            setWorks(p => p.map(w => w.id === wid ? { ...w, status: 'published' } : w))
        } catch (err) { alert(err.message) }
    }
    const handleSaveEdit = async (wid, updates) => {
        const updated = await editAdminWork(user.id, wid, updates)
        setWorks(p => p.map(w => w.id === wid ? { ...w, ...updated } : w))
        return updated
    }
    const closeEdit = (updated) => {
        if (updated && typeof updated === 'object') {
            setWorks(p => p.map(w => w.id === updated.id ? { ...w, ...updated } : w))
        }
        setEditing(null)
    }

    if (error) return (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-[13px] font-medium px-4 py-3 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Error: {error}
        </div>
    )

    /* ═══════════════════════════════════════════════════════════ OVERVIEW */
    if (tab === 'overview') return (
        <div className="space-y-6 max-w-6xl">
            <div>
                <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Overview</h1>
                <p className="text-[13px] text-[#6B7280] mt-1">Platform-wide metrics and trends.</p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Total Users" loading={loading}
                    value={stats?.totalUsers?.toLocaleString() ?? '0'} sub={`${stats?.totalAuthors ?? 0} writers`}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM9 13a6 6 0 00-6 6h12a6 6 0 00-6-6z" /></svg>}
                />
                <StatCard label="Total Works" loading={loading}
                    value={stats?.totalWorks?.toLocaleString() ?? '0'} sub="All time submissions"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>}
                />
                <StatCard label="Revenue" loading={loading}
                    value={`GH₵ ${(stats?.totalRevenue ?? 0).toFixed(2)}`} sub="From subscriptions"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>}
                />
                <StatCard label="Payouts" loading={loading}
                    value={`GH₵ ${(stats?.totalPayouts ?? 0).toFixed(2)}`} sub="Disbursed to authors"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>}
                />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="User Growth" sub="New signups per month (last 6 months)" loading={loading} minHeight={220}>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={stats?.usersByMonth ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="ugGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Area type="monotone" dataKey="users" name="Users" stroke={ACCENT} strokeWidth={2} fill="url(#ugGrad)" dot={{ r: 3, fill: ACCENT }} activeDot={{ r: 5 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Revenue Trend" sub="Monthly subscription revenue (GH₵)" loading={loading} minHeight={220}>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={stats?.revenueByMonth ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip prefix="GH₵ " />} />
                            <Area type="monotone" dataKey="revenue" name="Revenue" stroke={GREEN} strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: GREEN }} activeDot={{ r: 5 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <ChartCard title="Content Submissions" sub="Published works per month (last 6 months)" loading={loading} minHeight={220}>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={stats?.worksByMonth ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F9FAFB' }} />
                                <Bar dataKey="works" name="Works" fill={ACCENT} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                <ChartCard title="By Category" sub="Distribution across types" loading={loading} minHeight={220}>
                    {(stats?.worksByCategory ?? []).length === 0 ? (
                        <div className="flex items-center justify-center h-full text-[12px] text-[#9CA3AF]">No data yet</div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <ResponsiveContainer width="100%" height={150}>
                                <PieChart>
                                    <Pie data={stats.worksByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                                        {stats.worksByCategory.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
                                {stats.worksByCategory.map((c, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#6B7280] font-medium">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                                        {c.name} ({c.value})
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <ChartCard title="Works by Status" sub="Pending · Published · Draft" loading={loading} minHeight={200}>
                    {(stats?.worksByStatus ?? []).length === 0 ? (
                        <div className="flex items-center justify-center h-full text-[12px] text-[#9CA3AF]">No data yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={stats.worksByStatus} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barSize={18}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} axisLine={false} tickLine={false} width={64} />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F9FAFB' }} />
                                <Bar dataKey="value" name="Works" radius={[0, 4, 4, 0]}>
                                    {stats.worksByStatus.map((entry, i) => <Cell key={i} fill={STATUS_PALETTE[entry.name] ?? PIE_PALETTE[i]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-[#111]">Recent Users</span>
                        <a href="/victor-access-control/users" className="text-[12px] text-[#6B7280] hover:text-[#111] font-medium">View all →</a>
                    </div>
                    <div className="divide-y divide-[#F9FAFB]">
                        {loading ? [1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                                <Skeleton className="w-7 h-7 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-36" /></div>
                            </div>
                        )) : (stats?.recentUsers ?? []).map(u => (
                            <div key={u.id ?? u._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors">
                                <div className="w-7 h-7 rounded-full bg-[#111] overflow-hidden flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : (u.name || u.email || '?')[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-[#111] truncate">{u.name || 'Unnamed'}</p>
                                    <p className="text-[12px] text-[#9CA3AF] truncate">{u.email}</p>
                                </div>
                                <Badge color={roleColor(u.role)}>{u.role}</Badge>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-[#111]">Recent Works</span>
                        <a href="/victor-access-control/works" className="text-[12px] text-[#6B7280] hover:text-[#111] font-medium">View all →</a>
                    </div>
                    <div className="divide-y divide-[#F9FAFB]">
                        {loading ? [1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3.5"><Skeleton className="h-3 w-40 flex-1" /><Skeleton className="h-5 w-16" /></div>
                        )) : (stats?.recentWorks ?? []).map(w => (
                            <div key={w.id ?? w._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-[#111] truncate">{w.title}</p>
                                    <p className="text-[12px] text-[#9CA3AF]">{w.readCount ?? 0} reads</p>
                                </div>
                                <Badge color={w.status === 'pending' ? 'yellow' : w.status === 'draft' ? 'gray' : 'green'}>{w.status}</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )

    /* ═══════════════════════════════════════════════════════════ USERS */
    if (tab === 'users') return (
        <div className="space-y-5 max-w-6xl">
            <div>
                <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Users</h1>
                <p className="text-[13px] text-[#6B7280] mt-1">{loading ? '…' : `${users.length} accounts registered`}</p>
            </div>
            {/* Desktop View Table */}
            <div className="hidden sm:block bg-white border border-[#E5E7EB] rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead>
                        <tr className="border-b border-[#F3F4F6]">
                            {['User', 'Email', 'Role', 'Joined', ''].map(h => (
                                <th key={h} className="px-5 py-3.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F9FAFB]">
                        {loading ? [1, 2, 3, 4, 5].map(i => (
                            <tr key={i}>{[1, 2, 3, 4, 5].map(j => <td key={j} className="px-5 py-4"><Skeleton className="h-3.5 w-full max-w-[120px]" /></td>)}</tr>
                        )) : users.map(u => (
                            <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors group">
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-[#111] overflow-hidden flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                            {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : (u.name || u.email || '?')[0].toUpperCase()}
                                        </div>
                                        <span className="text-[13px] font-semibold text-[#111] truncate max-w-[140px]">{u.name || 'Unnamed'}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5 text-[13px] text-[#6B7280] max-w-[200px] truncate">{u.email}</td>
                                <td className="px-5 py-3.5">
                                    <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                                        className="text-[12px] font-semibold border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#111] cursor-pointer hover:border-[#9CA3AF] transition-colors">
                                        <option value="reader">reader</option>
                                        <option value="writer">writer</option>
                                        <option value="admin">admin</option>
                                    </select>
                                </td>
                                <td className="px-5 py-3.5 text-[12px] text-[#9CA3AF] font-medium whitespace-nowrap">
                                    {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <button
                                        onClick={() => handleDeleteUser(u.id)}
                                        className="opacity-0 group-hover:opacity-100 text-[11px] font-bold text-red-500 hover:text-red-700 uppercase tracking-tight transition-all"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && users.length === 0 && <div className="py-16 text-center text-[13px] text-[#9CA3AF]">No users found.</div>}
            </div>

            {/* Mobile View Cards */}
            <div className="sm:hidden space-y-3">
                {loading ? [1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-3">
                        <div className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-full" /><Skeleton className="h-4 w-32" /></div>
                        <Skeleton className="h-3 w-48" />
                    </div>
                )) : users.map(u => (
                    <div key={u.id} className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-[#111] overflow-hidden flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : (u.name || u.email || '?')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[14px] font-bold text-[#111] truncate">{u.name || 'Unnamed'}</p>
                                    <p className="text-[12px] text-[#6B7280] truncate">{u.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75V4H5a2 2 0 00-2 2v.25a.75.75 0 00.75.75H4v9A2.25 2.25 0 006.25 18h7.5A2.25 2.25 0 0016 15.75V7h.25a.75.75 0 00.75-.75V6a2 2 0 00-2-2h-1v-.25A2.75 2.75 0 0011.25 1h-2.5zM8 4h4v-.25C12 3.116 11.44 2.5 10.75 2.5h-1.5C8.56 2.5 8 3.116 8 3.75V4zM5 7h10v8.75a.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V7z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6]">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Role</p>
                                <select
                                    value={u.role}
                                    onChange={e => handleRoleChange(u.id, e.target.value)}
                                    className="text-[12px] font-semibold bg-[#F9FAFB] border-none rounded-lg px-2 py-1 text-[#374151] focus:ring-1 focus:ring-black"
                                >
                                    <option value="reader">reader</option>
                                    <option value="writer">writer</option>
                                    <option value="admin">admin</option>
                                </select>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Joined</p>
                                <p className="text-[12px] text-[#111] font-medium">
                                    {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                {!loading && users.length === 0 && <div className="py-12 text-center text-[13px] text-[#9CA3AF]">No users found.</div>}
            </div>
        </div>
    )

    /* ═══════════════════════════════════════════════════════════ WORKS */
    if (tab === 'works') {
        const pending = works.filter(w => w.status === 'pending')
        const published = works.filter(w => w.status === 'published')
        const drafts = works.filter(w => w.status === 'draft')

        const WorkRow = ({ w }) => (
            <tr className="hover:bg-[#FAFAFA] transition-colors group">
                <td className="px-5 py-3.5 max-w-[220px]">
                    <p className="text-[13px] font-semibold text-[#111] truncate">{w.title}</p>
                    {w.excerpt && <p className="text-[12px] text-[#9CA3AF] truncate mt-0.5">{w.excerpt}</p>}
                </td>
                <td className="px-5 py-3.5"><Badge color="gray">{w.category?.replace('_', ' ') ?? '—'}</Badge></td>
                <td className="px-5 py-3.5 text-[13px] text-[#6B7280] font-medium tabular-nums">{(w.readCount ?? 0).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-[12px] text-[#9CA3AF] font-medium whitespace-nowrap">
                    {new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setEditing(w)}
                            className="text-[12px] font-medium text-[#6B7280] hover:text-[#111] px-2.5 py-1 rounded-md hover:bg-[#F3F4F6] transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleDeleteWork(w.id)}
                            className="text-[12px] font-medium text-red-500 hover:text-red-700 px-2.5 py-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        )

        return (
            <>
                {/* Edit slide-over */}
                {editing && (
                    <EditPanel
                        work={editing}
                        onClose={closeEdit}
                        onSave={handleSaveEdit}
                    />
                )}

                <div className="space-y-6 max-w-6xl">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Content</h1>
                            <p className="text-[13px] text-[#6B7280] mt-1">{loading ? '…' : `${works.length} total · ${pending.length} pending review`}</p>
                        </div>
                        {!loading && pending.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 text-[12px] font-semibold rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                {pending.length} awaiting approval
                            </span>
                        )}
                    </div>

                    {/* Pending queue */}
                    {!loading && pending.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">Pending Review</p>
                            <div className="bg-white border border-yellow-200 rounded-xl overflow-hidden divide-y divide-yellow-50">
                                {pending.map(w => (
                                    <div key={w.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 hover:bg-yellow-50/40 transition-colors group">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-[13px] font-semibold text-[#111] truncate">{w.title}</p>
                                                <Badge color="yellow">pending</Badge>
                                            </div>
                                            {w.excerpt && <p className="text-[12px] text-[#9CA3AF] truncate">{w.excerpt}</p>}
                                            <p className="text-[11px] text-[#D1D5DB] mt-1 font-medium">
                                                {new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {w.category?.replace('_', ' ')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 sm:justify-end">
                                            <button onClick={() => setEditing(w)} className="text-[11px] sm:text-[12px] font-semibold text-[#6B7280] bg-white border border-[#E5E7EB] hover:border-[#9CA3AF] hover:text-[#111] px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors">Edit</button>
                                            <button onClick={() => handleApproveWork(w.id)} className="text-[11px] sm:text-[12px] font-semibold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors">Approve</button>
                                            <button onClick={() => handleDeleteWork(w.id)} className="text-[11px] sm:text-[12px] font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Published Table */}
                    <div>
                        <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">Published</p>

                        {/* Desktop View Table */}
                        <div className="hidden sm:block bg-white border border-[#E5E7EB] rounded-xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-[#F3F4F6]">
                                        {['Title', 'Category', 'Reads', 'Date', ''].map(h => <th key={h} className="px-5 py-3.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F9FAFB]">
                                    {loading ? [1, 2, 3, 4].map(i => <tr key={i}>{[1, 2, 3, 4, 5].map(j => <td key={j} className="px-5 py-4"><Skeleton className="h-3.5 w-full max-w-[120px]" /></td>)}</tr>)
                                        : published.map(w => <WorkRow key={w.id} w={w} />)}
                                </tbody>
                            </table>
                            {!loading && published.length === 0 && <div className="py-12 text-center text-[13px] text-[#9CA3AF]">No published works yet.</div>}
                        </div>

                        {/* Mobile View Cards */}
                        <div className="sm:hidden space-y-3">
                            {loading ? [1, 2].map(i => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            )) : published.map(w => (
                                <div key={w.id} className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-4">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-bold text-[#111] truncate">{w.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge color="gray">{w.category?.replace('_', ' ') ?? '—'}</Badge>
                                                <span className="text-[11px] text-[#9CA3AF] font-medium">{(w.readCount ?? 0).toLocaleString()} reads</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6]">
                                        <span className="text-[12px] text-[#9CA3AF] font-medium">
                                            {new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setEditing(w)} className="text-[12px] font-semibold text-[#6B7280] bg-[#F9FAFB] px-3 py-1.5 rounded-lg">Edit</button>
                                            <button onClick={() => handleDeleteWork(w.id)} className="text-[12px] font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Drafts */}
                    {!loading && drafts.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">Drafts ({drafts.length})</p>
                            <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F9FAFB]">
                                {drafts.map(w => (
                                    <div key={w.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors group">
                                        <div className="flex-1 min-w-0 flex items-center justify-between sm:justify-start gap-4">
                                            <p className="text-[13px] font-medium text-[#6B7280] truncate">{w.title}</p>
                                            <Badge color="gray">draft</Badge>
                                        </div>
                                        <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity justify-end">
                                            <button onClick={() => setEditing(w)} className="text-[12px] font-medium text-[#6B7280] hover:text-[#111] px-2.5 py-1 rounded-md bg-[#F3F4F6] sm:bg-transparent hover:bg-[#F3F4F6] transition-colors">Edit</button>
                                            <button onClick={() => handleDeleteWork(w.id)} className="text-[12px] font-medium text-red-500 hover:text-red-700 px-2.5 py-1 rounded-md bg-red-50 sm:bg-transparent hover:bg-red-50 transition-colors">Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </>
        )
    }

    return null
}
