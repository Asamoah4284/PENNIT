import { useState, useEffect } from 'react'
import { getUser } from '../lib/auth'
import { getAdminComments } from '../lib/api'

const PAGE_SIZE = 10

export default function AdminCommentsPage() {
  const user = getUser()
  const [comments, setComments] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    getAdminComments(user.id, { page, limit: PAGE_SIZE })
      .then((data) => {
        setComments(Array.isArray(data.comments) ? data.comments : [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
      })
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [user?.id, page])

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Comments</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          {loading ? '…' : `${total} comment${total !== 1 ? 's' : ''} total`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-[#E5E7EB] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#FAFAFA]">
              {['User', 'Work', 'Comment', 'Date'].map((h) => (
                <th key={h} className="px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F9FAFB]">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  {[1, 2, 3, 4].map((j) => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="h-4 w-24 bg-[#F3F4F6] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              comments.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-medium text-[#111]">{c.userName || '—'}</p>
                    <p className="text-[12px] text-[#9CA3AF] truncate max-w-[180px]">{c.userEmail || '—'}</p>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-[#6B7280] truncate max-w-[200px]" title={c.workTitle}>
                    {c.workTitle || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-[#111] max-w-[320px]">
                    <p className="line-clamp-2">{c.content || '—'}</p>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[#9CA3AF] whitespace-nowrap">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && comments.length === 0 && (
          <div className="py-16 text-center text-[13px] text-[#9CA3AF]">No comments yet.</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-2">
              <div className="h-4 w-32 bg-[#F3F4F6] rounded animate-pulse" />
              <div className="h-3 w-40 bg-[#F3F4F6] rounded animate-pulse" />
              <div className="h-3 w-full bg-[#F3F4F6] rounded animate-pulse" />
            </div>
          ))
        ) : (
          comments.map((c) => (
            <div key={c.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#111] truncate">{c.userName || '—'}</p>
                  <p className="text-[12px] text-[#9CA3AF] truncate">{c.userEmail || '—'}</p>
                </div>
                <span className="text-[11px] text-[#9CA3AF] whitespace-nowrap">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Work</p>
                <p className="text-[12px] text-[#6B7280] truncate">{c.workTitle || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Comment</p>
                <p className="text-[13px] text-[#111] break-words">{c.content || '—'}</p>
              </div>
            </div>
          ))
        )}
        {!loading && comments.length === 0 && (
          <div className="py-12 text-center text-[13px] text-[#9CA3AF]">No comments yet.</div>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-t border-[#F3F4F6]">
          <p className="text-[12px] text-[#6B7280]">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[12px] text-[#6B7280] font-medium px-1">Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
