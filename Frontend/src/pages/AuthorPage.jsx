import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAuthor } from '../lib/api'

const CATEGORY_LABELS = { poem: 'Poem', short_story: 'Short Story', novel: 'Novel' }

export default function AuthorPage() {
  const { id } = useParams()
  const [author, setAuthor] = useState(null)
  const [loading, setLoading] = useState(true)

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
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-500">
        Loading…
      </div>
    )
  }

  if (!author) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-stone-500 mb-4">Author not found.</p>
        <Link to="/reader" className="text-yellow-600 font-medium hover:underline">Back to discover</Link>
      </div>
    )
  }

  const totalReads = (author.works || []).reduce((sum, w) => sum + (w.readCount || 0), 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        <div className="flex-shrink-0 w-24 h-24 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-2xl font-bold">
          {author.penName?.charAt(0) || '?'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{author.penName}</h1>
          {author.bio && <p className="text-stone-600 mt-2">{author.bio}</p>}
          <p className="text-stone-500 text-sm mt-2">{totalReads} total reads</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-4">Published works</h2>
      <ul className="space-y-4">
        {(author.works || []).map((work) => (
          <li key={work.id}>
            <Link
              to={`/reading/${work.id}`}
              className="block p-4 rounded-xl border border-stone-200 bg-white hover:border-yellow-300 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-semibold text-stone-900">{work.title}</h3>
                  <p className="text-stone-500 text-sm mt-1">
                    {CATEGORY_LABELS[work.category] || work.category} · {work.readCount} reads
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {(author.works || []).length === 0 && (
        <p className="text-stone-500">No published works yet.</p>
      )}
    </div>
  )
}
