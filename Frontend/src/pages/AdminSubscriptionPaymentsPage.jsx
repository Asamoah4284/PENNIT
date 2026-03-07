import { useState, useEffect } from 'react'
import { getUser } from '../lib/auth'
import { getAdminSubscriptionPayments } from '../lib/api'

const PAGE_SIZE = 10

export default function AdminSubscriptionPaymentsPage() {
  const user = getUser()
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    getAdminSubscriptionPayments(user.id, { page, limit: PAGE_SIZE })
      .then((data) => {
        setPayments(Array.isArray(data.payments) ? data.payments : [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
      })
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [user?.id, page])

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Subscription payments</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          {loading ? '…' : `${total} payment${total !== 1 ? 's' : ''} total`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#FAFAFA]">
              {['User', 'Amount (GH₵)', 'Period', 'Status', 'Date'].map((h) => (
                <th key={h} className="px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F9FAFB]">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5].map((j) => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="h-4 w-20 bg-[#F3F4F6] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-medium text-[#111]">{p.userName || '—'}</p>
                    <p className="text-[12px] text-[#9CA3AF]">{p.userEmail || '—'}</p>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-[#111] tabular-nums">
                    GH₵ {(p.amountGhc ?? 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[#6B7280]">
                    {p.periodStart && p.periodEnd
                      ? `${new Date(p.periodStart).toLocaleDateString('en-GB')} – ${new Date(p.periodEnd).toLocaleDateString('en-GB')}`
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                        p.status === 'succeeded'
                          ? 'bg-green-50 text-green-700'
                          : p.status === 'failed' || p.status === 'refunded'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {p.status || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[#9CA3AF]">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && payments.length === 0 && (
          <div className="py-16 text-center text-[13px] text-[#9CA3AF]">No subscription payments yet.</div>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-t border-[#F3F4F6]">
          <p className="text-[12px] text-[#6B7280]">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
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
