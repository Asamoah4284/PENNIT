import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mockWorks, mockAuthors } from '../data/mock'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('forYou')

  // Helper to get author by ID
  const getAuthor = (authorId) => mockAuthors.find(a => a.id === authorId)

  // Format date to readable string
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1d ago'
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Format read count
  const formatReads = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Promo Banner */}
      <div className="bg-yellow-50 border-b border-yellow-100 -mx-4 sm:-mx-6 -mt-6 sm:-mt-8 px-4 sm:px-6 py-3 mb-6 sm:mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-stone-700">
          <span className="text-yellow-500">✦</span>
          <span><strong>Pre-launch:</strong> Launching February–March 2026. Join now to be part of the community from day one.</span>
        </div>
        <button className="text-stone-400 hover:text-stone-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-stone-200 mb-8">
        <button
          onClick={() => setActiveTab('forYou')}
          className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'forYou' ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
        >
          For you
          {activeTab === 'forYou' && <span className="absolute bottom-0 left-0 right-0 h-px bg-stone-900"></span>}
        </button>
        <button
          onClick={() => setActiveTab('featured')}
          className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'featured' ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Featured
          {activeTab === 'featured' && <span className="absolute bottom-0 left-0 right-0 h-px bg-stone-900"></span>}
        </button>
      </div>

      {/* Stories Feed */}
      <div className="space-y-8">
        {mockWorks.map((work) => {
          const author = getAuthor(work.authorId)
          return (
            <StoryCard
              key={work.id}
              id={work.id}
              author={author}
              title={work.title}
              excerpt={work.excerpt}
              date={formatDate(work.createdAt)}
              reads={formatReads(work.readCount)}
              comments={Math.floor(work.readCount / 10)}
              category={work.category}
              publication={work.genre}
              thumbnailUrl={work.thumbnailUrl}
            />
          )
        })}
      </div>
    </div>
  )
}

function StoryCard({ id, author, title, excerpt, date, reads, comments, category, publication, thumbnailUrl }) {
  return (
    <article className="group">
      {/* Author Info */}
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <div className="w-6 h-6 rounded-full bg-stone-300 flex-shrink-0 overflow-hidden">
          {author?.avatarUrl ? (
            <img src={author.avatarUrl} alt={author.penName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-400 to-stone-500 flex items-center justify-center text-white text-xs font-medium">
              {author?.penName?.[0] || 'A'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm min-w-0 truncate">
          {publication && (
            <>
              <span className="text-stone-500">In</span>
              <Link to={`/publication/${publication.toLowerCase().replace(/\s+/g, '-')}`} className="font-medium text-stone-700 hover:underline">
                {publication}
              </Link>
              <span className="text-stone-500">by</span>
            </>
          )}
          <Link to={`/author/${author?.id}`} className="font-medium text-stone-900 hover:underline">
            {author?.penName || 'Anonymous'}
          </Link>
          <span className="text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
      </div>

      {/* Content: image on top on mobile, beside text on desktop */}
      <div className="flex flex-col md:flex-row md:gap-6 gap-4">
        {/* Text Content – order 2 on mobile so it appears below image */}
        <div className="flex-1 min-w-0 order-2 md:order-1">
          <Link to={`/reading/${id}`}>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 mb-2 leading-snug group-hover:underline line-clamp-2">
              {title}
            </h2>
          </Link>
          <p className="text-stone-600 text-sm sm:text-base leading-relaxed line-clamp-2 mb-4">
            {excerpt}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-stone-500">
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">✦</span>
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <span>{reads}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M10 3c-4.31 0-8 3.033-8 7 0 2.024.978 3.825 2.499 5.085a3.478 3.478 0 0 1-.522 1.756.75.75 0 0 0 .584 1.143 5.976 5.976 0 0 0 3.936-1.108c.487.082.99.124 1.503.124 4.31 0 8-3.033 8-7s-3.69-7-8-7Z" clipRule="evenodd" />
              </svg>
              <span>{comments}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex-1 min-w-0" />
            <div className="flex items-center gap-0.5">
              <button type="button" className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors touch-manipulation">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </button>
              <button type="button" className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors touch-manipulation">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                </svg>
              </button>
              <button type="button" className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors touch-manipulation">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Thumbnail – full width on mobile (top), fixed size beside text on desktop */}
        <Link to={`/reading/${id}`} className="order-1 md:order-2 flex-shrink-0 w-full md:w-44 md:h-28">
          <div className="w-full aspect-video md:aspect-auto md:w-44 md:h-28 rounded-lg overflow-hidden bg-stone-200">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" />
            )}
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="border-b border-stone-200 mt-8"></div>
    </article>
  )
}
