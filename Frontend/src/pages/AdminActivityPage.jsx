import { useState, useEffect, useCallback } from 'react'
import { getUser } from '../lib/auth'
import { getAdminActivity } from '../lib/api'

const POLL_INTERVAL_MS = 5000

const ACTION_LABELS = {
  signup: 'Signed up',
  login: 'Logged in',
  role_switch: 'Switched account role',
  work_created: 'Created a draft',
  work_submitted: 'Submitted a story for review',
  work_updated: 'Updated a story',
  work_deleted_by_author: 'Deleted a story',
  work_approved: 'Approved a story',
  work_deleted: 'Deleted a work (admin)',
  admin_user_created: 'Created a user',
  admin_role_updated: 'Changed a user\'s role',
  author_follow: 'Followed an author',
  config_updated: 'Updated platform settings',
  work_read: 'Read a piece',
  work_clap: 'Clapped / liked a piece',
  work_comment: 'Commented on a piece',
  work_share: 'Shared a piece',
}

function formatTimeAgo(date) {
  const d = new Date(date)
  const now = new Date()
  const sec = Math.floor((now - d) / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return null
  const s = Number(seconds)
  if (s < 60) return `${s}s`
  const min = Math.floor(s / 60)
  const sec = s % 60
  if (sec) return `${min}m ${sec}s`
  return `${min}m`
}

function ActivityMeta({ action, meta }) {
  if (!meta || typeof meta !== 'object') return null
  const parts = []
  if (meta.workTitle) parts.push(`"${meta.workTitle}"`)
  if (meta.newRole) parts.push(`→ ${meta.newRole}`)
  if (meta.createdEmail) parts.push(meta.createdEmail)
  if (meta.createdRole) parts.push(`(${meta.createdRole})`)
  if (meta.targetEmail) parts.push(meta.targetEmail)
  if (meta.newRole && !meta.targetEmail && action === 'admin_role_updated') parts.push(`to ${meta.newRole}`)
  if (action === 'work_approved' && meta.workTitle) return <span className="text-[#6B7280]">“{meta.workTitle}”</span>
  if (action === 'admin_user_created') return <span className="text-[#6B7280]">{meta.createdEmail} ({meta.createdRole})</span>
  if (action === 'admin_role_updated') return <span className="text-[#6B7280]">{meta.targetEmail} → {meta.newRole}</span>
  if (action === 'role_switch') return <span className="text-[#6B7280]">→ {meta.newRole}</span>
  if (meta.workTitle && (action === 'work_created' || action === 'work_submitted' || action === 'work_updated' || action === 'work_deleted_by_author' || action === 'work_deleted')) return <span className="text-[#6B7280]">“{meta.workTitle}”</span>
  if (action === 'work_read' && (meta.workTitle || meta.timeSpentSeconds != null)) {
    const duration = formatDuration(meta.timeSpentSeconds)
    return (
      <span className="text-[#6B7280]">
        {meta.workTitle ? `"${meta.workTitle}"` : ''}
        {duration && <>{meta.workTitle ? ' · ' : ''}{duration}</>}
      </span>
    )
  }
  if (action === 'work_clap' && meta.workTitle) return <span className="text-[#6B7280]">"{meta.workTitle}"</span>
  if (action === 'work_comment' && meta.workTitle) return <span className="text-[#6B7280]">"{meta.workTitle}"</span>
  if (action === 'work_share' && meta.workTitle) return <span className="text-[#6B7280]">"{meta.workTitle}"</span>
  if (parts.length) return <span className="text-[#6B7280]"> {parts.join(' ')}</span>
  return null
}

export default function AdminActivityPage() {
  const user = getUser()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [live, setLive] = useState(true)

  const fetchActivity = useCallback(async () => {
    if (!user?.id) return
    try {
      const list = await getAdminActivity(user.id, { limit: 80 })
      setActivities(Array.isArray(list) ? list : [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchActivity()
    if (!live || !user?.id) return
    const id = setInterval(fetchActivity, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchActivity, live, user?.id])

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Activity log</h1>
          <p className="text-[13px] text-[#6B7280] mt-1">
            Live activity from all users. Auto-refreshes every {POLL_INTERVAL_MS / 1000}s.
          </p>
        </div>
        
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="border-b border-[#F3F4F6] bg-[#FAFAFA]">
                <th className="px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Activity</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {loading && activities.length === 0 ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><div className="h-4 w-32 bg-[#F3F4F6] rounded animate-pulse" /></td>
                    <td className="px-5 py-3"><div className="h-4 w-48 bg-[#F3F4F6] rounded animate-pulse" /></td>
                    <td className="px-5 py-3 text-right"><div className="h-4 w-16 bg-[#F3F4F6] rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))
              ) : (
                activities.map((a) => (
                  <tr key={a.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-[13px] font-medium text-[#111]">{a.userName || 'Unknown'}</p>
                        <p className="text-[12px] text-[#9CA3AF]">{a.userEmail || '—'}</p>
                        {a.userRole && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F3F4F6] text-[#6B7280]">{a.userRole}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[13px] text-[#111]">
                        {ACTION_LABELS[a.action] || a.action}
                        <ActivityMeta action={a.action} meta={a.meta} />
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-[12px] text-[#9CA3AF] font-medium whitespace-nowrap" title={a.createdAt}>
                        {formatTimeAgo(a.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && activities.length === 0 && (
          <div className="py-16 text-center text-[13px] text-[#9CA3AF]">No activity yet.</div>
        )}
      </div>
    </div>
  )
}
