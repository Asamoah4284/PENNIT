import { Link, useNavigate } from 'react-router-dom'
import { getUser, logout } from '../lib/auth'
import { useConfig } from '../contexts/ConfigContext'
import { getAssetUrl } from '../lib/api'
import { useState, useEffect, useRef } from 'react'

export default function Header({ onToggleLeftSidebar }) {
  const [userTick, setUserTick] = useState(0)
  const user = getUser()
  const { monetizationEnabled } = useConfig()
  const navigate = useNavigate()
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    const onUserUpdated = () => setUserTick((t) => t + 1)
    window.addEventListener('pennit:user-updated', onUserUpdated)
    return () => window.removeEventListener('pennit:user-updated', onUserUpdated)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Close sidebar when clicking outside or navigating (if needed)
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isSidebarOpen])

  useEffect(() => {
    if (!isProfileMenuOpen) return
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProfileMenuOpen])

  const displayName = user?.name || user?.penName || user?.email?.split('@')[0] || 'User'
  const initial = displayName[0].toUpperCase()
  const avatarUrl = user?.avatarUrl

  return (
    <>
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Left Section: Hamburger, Logo, Search */}
          <div className="flex items-center gap-4 md:gap-6 flex-1">
            {/* Hamburger Menu (Button): on desktop toggles left sidebar visibility; on mobile toggles overlay */}
            <button
              onClick={() => {
                if (window.matchMedia('(min-width: 1024px)').matches) {
                  onToggleLeftSidebar?.()
                } else {
                  setIsSidebarOpen((prev) => !prev)
                }
              }}
              className="p-1 text-stone-500 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <img src="/images/logo.jpeg" alt="Pennit" className="h-[43px] w-auto object-contain" />
            </Link>

            {/* Search Bar */}
            <div className={`hidden md:flex items-center bg-stone-100 rounded-full px-4 py-2.5 transition-all duration-200 ${isSearchFocused ? 'bg-white ring-1 ring-stone-900 w-96' : 'w-80'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-stone-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent border-none outline-none text-base ml-2 w-full text-stone-900 placeholder:text-stone-400"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </div>

          {/* Right Section: Write, Bell, Profile */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Write Link - Always visible or context dependent */}
            <Link
              to={user?.role === 'writer' ? '/writers-dashboard' : '/?signup=writer'}
              className="hidden sm:flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              <span className="text-base font-light">Write</span>
            </Link>

            {user ? (
              <>
                {/* Notification Bell */}
                <button className="text-stone-500 hover:text-stone-900 transition-colors relative">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                </button>

                {/* Avatar / Profile Dropdown */}
                <div className="relative ml-2" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="w-9 h-9 rounded-full bg-stone-800 text-white flex items-center justify-center font-semibold text-base select-none shadow-sm ring-2 ring-stone-100 hover:ring-stone-300 transition-all overflow-hidden"
                    aria-label="Open profile menu"
                    aria-expanded={isProfileMenuOpen}
                  >
                    {avatarUrl ? (
                      <img src={getAssetUrl(avatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initial
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-lg border border-stone-100 overflow-hidden z-50 transform origin-top-right transition-all">
                    <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                      <p className="text-base font-semibold text-stone-900 truncate">{displayName}</p>
                      <p className="text-sm text-stone-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      {user.role === 'writer' ? (
                        <Link to="/writers-dashboard" onClick={() => setIsProfileMenuOpen(false)} className="block px-4 py-2 text-base text-stone-600 hover:bg-stone-50 hover:text-stone-900">Dashboard</Link>
                      ) : (
                        <>
                          <Link to="/home" onClick={() => setIsProfileMenuOpen(false)} className="block px-4 py-2 text-base text-stone-600 hover:bg-stone-50 hover:text-stone-900">Home</Link>
                          <Link to="/reader" onClick={() => setIsProfileMenuOpen(false)} className="block px-4 py-2 text-base text-stone-600 hover:bg-stone-50 hover:text-stone-900">Discover</Link>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-base text-stone-600 hover:bg-stone-50 border-t border-stone-100 hover:text-red-600 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Logged Out Links */}
                <Link to="/?signin=1" className="text-base font-medium text-stone-600 hover:text-stone-900 hidden sm:block">
                  Sign In
                </Link>
                <Link to="/?signup=1" className="bg-stone-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm sm:px-6 sm:py-2.5 sm:text-base">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          {/* Sidebar Header with Logo */}
          <div className="flex items-center justify-between mb-8">
            <Link to="/" onClick={() => setIsSidebarOpen(false)}>
              <img src="/images/logo.jpeg" alt="Pennit" className="h-[36px] w-auto object-contain" />
            </Link>
            {/* Close Button only visible if needed, usually overlay is enough but adding X is UX friendly */}
            {/* <button onClick={() => setIsSidebarOpen(false)} className="text-stone-400 hover:text-stone-900">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
               </svg>
            </button> */}
          </div>

          {/* Navigation List */}
          <nav className="space-y-2">
            <SidebarLink to="/home" icon={<HomeIcon />} label="Home" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/reader" icon={<StoriesIcon />} label="Discover" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/library" icon={<LibraryIcon />} label="Library" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/profile" icon={<UserIcon />} label="Profile" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/stats" icon={<StatsIcon />} label="Stats" onClick={() => setIsSidebarOpen(false)} />
            {monetizationEnabled && (
              <SidebarLink to="/pricing" icon={<PricingIcon />} label="Subscribe" onClick={() => setIsSidebarOpen(false)} />
            )}
            {user?.role === 'writer' && (
              <SidebarLink to="/writers-dashboard" icon={<HomeIcon />} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
            )}
          </nav>

          {user && (
            <>
              <div className="my-8 border-t border-stone-100"></div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 mb-4 px-3">Following</h3>
                <div className="px-3">
                  <div className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-stone-50 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-600">Find writers</p>
                      <p className="text-xs text-stone-400">See suggestions</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function SidebarLink({ to, icon, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-colors ${active ? 'text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
    >
      <span className="text-stone-400 group-hover:text-stone-900">{icon}</span>
      <span className="text-base">{label}</span>
    </Link>
  )
}

// Icons
function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function StoriesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function StatsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function PricingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  )
}
