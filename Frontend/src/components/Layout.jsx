import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import RightSidebar from './RightSidebar'

export default function Layout() {
  const location = useLocation()
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true)
  const isAuthorPage = location.pathname.startsWith('/author/')
  const hideRightSidebar = ['/library', '/profile', '/stories', '/stats', '/writers-dashboard'].includes(location.pathname) || isAuthorPage

  return (
    <div className="min-h-screen flex flex-col">
      <Header onToggleLeftSidebar={() => setIsLeftSidebarVisible((prev) => !prev)} />
      {/* Left Sidebar - fixed on desktop so it stays in place while content scrolls */}
      <aside
        className={`hidden lg:block fixed left-0 top-16 z-10 h-[calc(100vh-4rem)] overflow-hidden border-r border-stone-200 bg-white transition-[width] duration-300 ease-in-out ${
          isLeftSidebarVisible ? 'lg:w-64' : 'lg:w-0 lg:min-w-0 lg:border-r-0'
        }`}
      >
        <div className="w-64 min-w-64 h-full overflow-y-auto">
          <Sidebar />
        </div>
      </aside>
      {/* Main + right need left margin when sidebar is visible */}
      <div
        className={`flex flex-1 transition-[margin] duration-300 ease-in-out ${
          isLeftSidebarVisible ? 'lg:ml-64' : 'lg:ml-0'
        }`}
      >
        {/* Author pages: clean white. Others: artistic background with border. */}
        <main className={`flex-1 min-w-0 overflow-x-hidden ${isAuthorPage ? 'bg-white' : 'xl:border-r xl:border-stone-200 bg-artistic-lines carving-edge bg-wow-orbs bg-white/95'}`}>
          <div className="relative z-10 min-h-full min-w-0">
            <Outlet />
          </div>
        </main>

        {/* Right Sidebar - hidden on Library, Profile, Stories, Stats and on mobile/tablet */}
        {!hideRightSidebar && (
          <aside className="hidden xl:block w-80 flex-shrink-0 bg-white">
            <RightSidebar />
          </aside>
        )}
      </div>
    </div>
  )
}
