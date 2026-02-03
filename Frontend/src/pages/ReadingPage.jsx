import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWork } from '../lib/api'
import { mockAuthors } from '../data/mock'

function getAuthorName(authorId) {
  const author = mockAuthors.find((a) => a.id === authorId)
  return author ? author.penName : 'Unknown'
}

export default function ReadingPage() {
  const { id } = useParams()
  const [work, setWork] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    getWork(id).then((data) => {
      setWork(data)
      setLoading(false)
    })
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
        <p className="text-stone-500 mb-4">Work not found.</p>
        <Link to="/reader" className="text-yellow-600 font-medium hover:underline">Back to discover</Link>
      </div>
    )
  }

  const categoryLabel = { poem: 'Poem', short_story: 'Short Story', novel: 'Novel' }[work.category] || work.category

  return (
    <article className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/reader" className="text-stone-500 text-sm hover:text-yellow-600 mb-6 inline-block">
        ← Back to discover
      </Link>
      <header className="mb-8">
        <p className="text-yellow-600 font-medium text-sm uppercase tracking-wide mb-2">{categoryLabel}</p>
        <h1 className="text-3xl font-bold text-stone-900 font-serif">{work.title}</h1>
        <p className="text-stone-600 mt-2">
          <Link to={`/author/${work.authorId}`} className="text-yellow-600 hover:underline font-medium">
            {getAuthorName(work.authorId)}
          </Link>
        </p>
      </header>
      <div className="prose prose-stone max-w-none font-serif text-lg leading-relaxed text-stone-800 whitespace-pre-wrap">
        {work.body}
      </div>
      <footer className="mt-12 pt-6 border-t border-stone-200">
        <p className="text-stone-500 text-sm">{work.readCount} reads</p>
        <Link to={`/author/${work.authorId}`} className="text-yellow-600 font-medium hover:underline mt-2 inline-block">
          More from {getAuthorName(work.authorId)}
        </Link>
      </footer>
    </article>
  )
}
