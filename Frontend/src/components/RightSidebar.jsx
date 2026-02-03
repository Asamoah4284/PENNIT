import { Link } from 'react-router-dom'

export default function RightSidebar() {
    return (
        <div className="sticky top-16 p-6 h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Staff Picks */}
            <section className="mb-8">
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
            </section>

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
                    <FollowSuggestion
                        name="Adaeze Obi"
                        bio="Poet & storyteller. Lagos-based."
                    />
                    <FollowSuggestion
                        name="Kofi Mensah"
                        bio="Fiction writer exploring identity."
                    />
                    <FollowSuggestion
                        name="Zara Ibrahim"
                        bio="Short fiction enthusiast."
                    />
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
        <Link
            to={`/topic/${label.toLowerCase().replace(/\s+/g, '-')}`}
            className="px-3 py-1.5 bg-stone-100 text-stone-600 text-sm rounded-full hover:bg-stone-200 transition-colors"
        >
            {label}
        </Link>
    )
}

function FollowSuggestion({ name, bio }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-300 flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{name}</p>
                <p className="text-xs text-stone-500 truncate">{bio}</p>
            </div>
            <button className="text-xs font-medium text-stone-900 border border-stone-900 rounded-full px-3 py-1 hover:bg-stone-900 hover:text-white transition-colors flex-shrink-0">
                Follow
            </button>
        </div>
    )
}
