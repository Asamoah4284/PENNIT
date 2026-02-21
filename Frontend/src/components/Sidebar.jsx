import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getUser } from '../lib/auth'
import { getMyFollowing, getAssetUrl } from '../lib/api'

export default function Sidebar() {
  const user = getUser()
  const location = useLocation()
  const isActive = (path) => location.pathname === path
  const [following, setFollowing] = useState([])
  const [followingMenuOpen, setFollowingMenuOpen] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!user?.id) return
    getMyFollowing(user.id)
      .then((data) => setFollowing(data?.following ?? []))
      .catch(() => setFollowing([]))
  }, [user?.id])

  useEffect(() => {
    if (followingMenuOpen === null) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setFollowingMenuOpen(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [followingMenuOpen])

  return (
    <div className="sticky top-16 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Nav links */}
      <nav className="p-4 pt-6 space-y-0.5 border-b border-stone-100">
        <SidebarLink to="/home" icon={<HomeIcon />} label="Home" active={isActive('/home')} />
        <SidebarLink to="/reader" icon={<StoriesIcon />} label="Discover" active={isActive('/reader')} />
        <SidebarLink to="/library" icon={<LibraryIcon />} label="Library" active={isActive('/library')} />
        <SidebarLink to="/profile" icon={<UserIcon />} label="Profile" active={isActive('/profile')} />
        <SidebarLink to="/reading-stats" icon={<ProgressIcon />} label="Reading progress" active={isActive('/reading-stats')} />
        {user?.role === 'writer' && (
          <>
            <SidebarLink to="/stats" icon={<StatsIcon />} label="Stats" active={isActive('/stats')} />
            <SidebarLink to="/writers-dashboard" icon={<DashboardIcon />} label="Dashboard" active={location.pathname.startsWith('/writers-dashboard')} />
          </>
        )}
      </nav>

      {/* Following section */}
      <div className="flex-1 min-h-0 p-4 flex flex-col">
        <h3 className="text-sm font-bold text-stone-900 mb-3">Following</h3>
        {following.length === 0 ? (
          <p className="text-stone-500 text-sm">Writers you follow will appear here.</p>
        ) : (
          <ul className="space-y-2">
            {following.slice(0, 5).map((author) => (
              <li key={author.id} className="flex items-center gap-3 group">
                <Link to={`/author/${author.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-200 flex-shrink-0">
                    {author.avatarUrl ? (
                      <img src={getAssetUrl(author.avatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-stone-500">
                        {(author.penName || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-stone-900 truncate">{author.penName}</span>
                </Link>
                <div className="relative flex-shrink-0" ref={followingMenuOpen === author.id ? menuRef : null}>
                  <button
                    type="button"
                    onClick={() => setFollowingMenuOpen(followingMenuOpen === author.id ? null : author.id)}
                    className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    aria-label="Options"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {following.length > 5 && (
          <Link to="/reader" className="mt-3 text-sm text-stone-500 hover:text-stone-900 font-medium">
            See all ({following.length})
          </Link>
        )}
        {following.length > 0 && following.length <= 5 && (
          <Link to="/reader" className="mt-3 text-sm text-stone-500 hover:text-stone-900 font-medium">
            See all
          </Link>
        )}
      </div>
    </div>
  )
}

function SidebarLink({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active ? 'text-stone-900 font-semibold bg-stone-50' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
    >
      <span className={active ? 'text-stone-900' : 'text-stone-400'}>{icon}</span>
      <span className="text-sm">{label}</span>
    </Link>
  )
}

function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function StoriesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function ProgressIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function StatsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  )
}
