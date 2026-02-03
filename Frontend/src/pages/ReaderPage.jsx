import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWorks } from '../lib/api'
import { mockAuthors } from '../data/mock'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'poem', label: 'Poems' },
  { value: 'short_story', label: 'Short Stories' },
  { value: 'novel', label: 'Novels' },
]

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
]

function getAuthorName(authorId) {
  const author = mockAuthors.find((a) => a.id === authorId)
  return author ? author.penName : 'Unknown'
}

export default function ReaderPage() {
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('popular')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getWorks().then((data) => {
      setWorks(data)
      setLoading(false)
    })
  }, [])

  const filtered = works
    .filter((w) => category === 'all' || w.category === category)
    .filter((w) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const authorName = getAuthorName(w.authorId).toLowerCase()
      return (
        w.title.toLowerCase().includes(q) ||
        authorName.includes(q) ||
        (w.genre && w.genre.toLowerCase().includes(q))
      )
    })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'popular') return (b.readCount || 0) - (a.readCount || 0)
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Discover</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="search"
          placeholder="Search by title, author, or genre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`px-4 py-2 rounded-lg font-medium ${
                category === c.value
                  ? 'bg-yellow-400 text-stone-900'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
              }`}
            >
              {c.label}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-stone-300 rounded-lg bg-white"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <ul className="space-y-6">
        {sorted.map((work) => (
          <li key={work.id}>
            <Link
              to={`/reading/${work.id}`}
              className="block p-4 rounded-xl border border-stone-200 bg-white hover:border-yellow-300 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">{work.title}</h2>
                  <p className="text-stone-600 text-sm mt-1">
                    {getAuthorName(work.authorId)} · {CATEGORIES.find((c) => c.value === work.category)?.label || work.category}
                  </p>
                  <p className="text-stone-500 text-sm mt-2 line-clamp-2">{work.excerpt}</p>
                </div>
                <span className="flex-shrink-0 text-stone-400 text-sm">{work.readCount} reads</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {sorted.length === 0 && (
        <p className="text-stone-500 text-center py-12">No works match your filters.</p>
      )}
    </div>
  )
}
