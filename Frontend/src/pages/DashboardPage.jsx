import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUser } from '../lib/auth'
import { getWorks } from '../lib/api'

const CATEGORY_LABELS = { poem: 'Poem', short_story: 'Short Story', novel: 'Novel' }

export default function DashboardPage() {
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const user = getUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (user.role !== 'writer') {
      navigate('/reader')
      return
    }
    getWorks().then((data) => {
      const authorId = user.authorId || user.id
      const myWorks = data.filter((w) => w.authorId === authorId)
      setWorks(myWorks)
      setLoading(false)
    })
  }, [user, navigate])

  if (!user || user.role !== 'writer') {
    return null
  }

  const totalReads = works.reduce((sum, w) => sum + (w.readCount || 0), 0)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Writer dashboard</h1>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <div className="p-4 rounded-xl bg-stone-100 border border-stone-200">
          <p className="text-stone-500 text-sm">Total reads</p>
          <p className="text-2xl font-bold text-stone-900">{totalReads}</p>
        </div>
        <div className="p-4 rounded-xl bg-stone-100 border border-stone-200">
          <p className="text-stone-500 text-sm">Earnings</p>
          <p className="text-2xl font-bold text-stone-900">Coming after launch</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Your works</h2>
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-100"
        >
          Add new work (Coming soon)
        </button>
      </div>

      <ul className="space-y-4">
        {works.map((work) => (
          <li key={work.id}>
            <Link
              to={`/reading/${work.id}`}
              className="block p-4 rounded-xl border border-stone-200 bg-white hover:border-yellow-300 transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-stone-900">{work.title}</h3>
                  <p className="text-stone-500 text-sm mt-1">
                    {CATEGORY_LABELS[work.category] || work.category}
                  </p>
                </div>
                <span className="text-stone-600 font-medium">{work.readCount} reads</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {works.length === 0 && (
        <p className="text-stone-500 py-6">You haven&apos;t published any works yet. Add new work (coming soon) will let you publish poems, short stories, and novels.</p>
      )}

      <p className="mt-8">
        <Link to={`/author/${user.authorId || user.id}`} className="text-yellow-600 font-medium hover:underline">
          View my public profile →
        </Link>
      </p>
    </div>
  )
}
