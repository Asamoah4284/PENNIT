import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAuthors, toggleFollowAuthor, getAssetUrl } from '../lib/api'
import { getUser } from '../lib/auth'

export default function RightSidebar() {
    const [authors, setAuthors] = useState([])
    const [loading, setLoading] = useState(true)
    const user = getUser()

    useEffect(() => {
        async function loadAuthors() {
            try {
                const data = await getAuthors()
                // Filter out the current user if they are a writer
                const filtered = user?.authorId 
                    ? data.filter(a => a.id !== user.authorId)
                    : data
                setAuthors(filtered.slice(0, 5)) // Show top 5
            } catch (err) {
                console.error('Failed to load authors:', err)
            } finally {
                setLoading(false)
            }
        }
        loadAuthors()
    }, [user?.authorId])

    const handleFollowToggle = async (authorId) => {
        if (!user) return
        try {
            await toggleFollowAuthor(authorId, user.id)
            // For a better UX we could update the local state, 
            // but for "Who to follow" we can just keep it simple.
        } catch (err) {
            console.error('Follow failed:', err)
        }
    }


    return (
        <div className="sticky top-16 p-6 h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Staff Picks - Hidden for now */}
            {/* <section className="mb-8">
                <h2 className="text-base font-bold text-stone-900 mb-4">Staff Picks</h2>
                <div className="space-y-4">
                    <StaffPickItem
                        publication="Pennit Weekly"
                        author="Editorial Team"
                        title="Celebrating African Voices: Our Top Reads This Month"
                        date="2d ago"
                    />
                    <StaffPickItem
                        publication="Creative Corner"
                        author="Amina K."
                        title="The Art of Short Fiction: A Writer's Journey"
                        date="Jan 28"
                    />
                    <StaffPickItem
                        publication="Poetry Hub"
                        author="Kwame A."
                        title="Finding Rhythm in Everyday Life"
                        date="Jan 25"
                    />
                </div>
                <Link to="/staff-picks" className="block mt-4 text-sm text-green-600 hover:text-green-700 font-medium">
                    See the full list
                </Link>
            </section> */}

            {/* Writing on Pennit Card */}
            <section className="bg-yellow-50 rounded-xl p-5 mb-8">
                <h3 className="text-base font-bold text-stone-900 mb-3">Writing on Pennit</h3>
                <ul className="text-sm text-stone-600 space-y-2 mb-4">
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">•</span>
                        Join our Pennit Writing 101 Webinar
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">•</span>
                        Read Pennit tips & tricks
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">•</span>
                        Get practical writing advice
                    </li>
                </ul>
                <Link
                    to="/write"
                    className="inline-block bg-stone-900 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-stone-800 transition-colors"
                >
                    Start writing
                </Link>
            </section>

            {/* Recommended Topics */}
            <section className="mb-8">
                <h3 className="text-sm font-medium text-stone-500 mb-3">Recommended topics</h3>
                <div className="flex flex-wrap gap-2">
                    <TopicTag label="Poetry" />
                    <TopicTag label="Short Stories" />
                    <TopicTag label="Fiction" />
                    <TopicTag label="African Culture" />
                    <TopicTag label="Creative Writing" />
                    <TopicTag label="Literature" />
                </div>
            </section>

            {/* Who to follow */}
            <section>
                <h3 className="text-sm font-medium text-stone-500 mb-3">Who to follow</h3>
                <div className="space-y-4">
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-stone-200"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-stone-200 rounded w-1/2"></div>
                                        <div className="h-2 bg-stone-200 rounded w-3/4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : authors.length > 0 ? (
                        authors.map(author => (
                            <FollowSuggestion
                                key={author.id}
                                id={author.id}
                                name={author.penName}
                                bio={author.bio}
                                avatarUrl={author.avatarUrl}
                                onFollow={() => handleFollowToggle(author.id)}
                            />
                        ))
                    ) : (
                        <p className="text-xs text-stone-400">No writers to suggest right now.</p>
                    )}
                </div>
            </section>
        </div>
    )
}

function StaffPickItem({ publication, author, title, date }) {
    return (
        <div className="group cursor-pointer">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-stone-200 flex-shrink-0"></div>
                <span className="text-xs text-stone-500 truncate">
                    In <span className="font-medium text-stone-600">{publication}</span> by {author}
                </span>
            </div>
            <h4 className="text-sm font-bold text-stone-900 leading-snug group-hover:underline line-clamp-2">
                {title}
            </h4>
            <p className="text-xs text-stone-400 mt-1">{date}</p>
        </div>
    )
}

function TopicTag({ label }) {
    return (
        <span
            className="px-3 py-1.5 bg-stone-100 text-stone-600 text-sm rounded-full"
        >
            {label}
        </span>
    )
}

function FollowSuggestion({ id, name, bio, avatarUrl, onFollow }) {
    const [followed, setFollowed] = useState(false)

    const handleClick = () => {
        setFollowed(!followed)
        onFollow()
    }

    return (
        <div className="flex items-start gap-3">
            <Link to={`/author/${id}`} className="flex-shrink-0">
                {avatarUrl ? (
                    <img
                        src={getAssetUrl(avatarUrl)}
                        alt={name}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-stone-300 flex-shrink-0"></div>
                )}
            </Link>
            <div className="flex-1 min-w-0">
                <Link to={`/author/${id}`} className="text-sm font-medium text-stone-900 truncate hover:underline block">
                    {name}
                </Link>
                <p className="text-xs text-stone-500 line-clamp-1">{bio || 'Pennit Writer'}</p>
            </div>
            <button
                onClick={handleClick}
                className={`text-xs font-medium border rounded-full px-3 py-1 transition-colors flex-shrink-0 ${
                    followed
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'text-stone-900 border-stone-900 hover:bg-stone-900 hover:text-white'
                }`}
            >
                {followed ? 'Following' : 'Follow'}
            </button>
        </div>
    )
}
