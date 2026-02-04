import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import RightSidebar from './RightSidebar'

export default function Layout() {
  const location = useLocation()
  const hideRightSidebar = ['/library', '/profile', '/stories', '/stats', '/writers-dashboard'].includes(location.pathname)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        {/* Left Sidebar - hidden on mobile */}
        <aside className="hidden lg:block w-64 border-r border-stone-200 flex-shrink-0">
          <Sidebar />
        </aside>

        {/* Main Content Area – white + wow orbs + carved edge lines */}
        <main className="flex-1 xl:border-r xl:border-stone-200 bg-artistic-lines carving-edge bg-wow-orbs bg-white/95">
          <div className="relative z-10 min-h-full">
            <Outlet />
          </div>
        </main>

        {/* Right Sidebar - hidden on Library, Profile, Stories, Stats and on mobile/tablet */}
        {!hideRightSidebar && (
          <aside className="hidden xl:block w-80 flex-shrink-0">
            <RightSidebar />
          </aside>
        )}
      </div>
    </div>
  )
}
