import { useState, useEffect } from 'react'
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import { getWork } from '../lib/api'

export default function ReadingPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [work, setWork] = useState(null)
  const [loading, setLoading] = useState(true)

  const fromHome = location.state?.from === 'home'
  const backTo = fromHome ? '/home' : '/reader'
  const backLabel = fromHome ? 'Back to home' : 'Back to discover'
  const goBack = () => navigate(backTo)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    getWork(id)
      .then(setWork)
      .catch(() => setWork(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-stone-500">
        Loading…
      </div>
    )
  }

  if (!work) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-stone-500 mb-4">Story not found.</p>
        <button type="button" onClick={goBack} className="text-yellow-600 font-medium hover:underline">
          ← {backLabel}
        </button>
      </div>
    )
  }

  const categoryLabel = { poem: 'Poem', short_story: 'Short Story', novel: 'Novel' }[work.category] || work.category
  const formatDateTime = (dateString) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  return (
    <article className="max-w-2xl mx-auto px-4 py-8">
      <button type="button" onClick={goBack} className="text-stone-500 text-sm hover:text-yellow-600 mb-6 inline-block">
        ← Back
      </button>
      <header className="mb-8">
        <p className="text-yellow-600 font-medium text-sm uppercase tracking-wide mb-2">{categoryLabel}</p>
        <h1 className="text-3xl font-bold text-stone-900 font-serif">{work.title}</h1>
        <p className="text-stone-600 mt-2">
          <Link to={`/author/${work.authorId}`} className="text-yellow-600 hover:underline font-medium">
            {work.author?.penName || 'Unknown'}
          </Link>
        </p>
        <p className="text-stone-500 text-sm mt-2">
          Posted {formatDateTime(work.createdAt)} · {work.readCount} reads
        </p>
      </header>
      {work.thumbnailUrl && (
        <div className="rounded-xl overflow-hidden border border-stone-200 mb-8 max-w-2xl aspect-video bg-stone-100">
          <img src={work.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="prose prose-stone max-w-none font-serif text-lg leading-relaxed text-stone-800 whitespace-pre-wrap">
        {work.body != null && work.body !== '' ? work.body : (
          <p className="text-stone-500 italic">No content available for this story.</p>
        )}
      </div>
      <footer className="mt-12 pt-6 border-t border-stone-200">
        <p className="text-stone-500 text-sm">{work.readCount} reads</p>
        <Link to={`/author/${work.authorId}`} className="text-yellow-600 font-medium hover:underline mt-2 inline-block">
          More from {work.author?.penName || 'Unknown'}
        </Link>
      </footer>
    </article>
  )
}
