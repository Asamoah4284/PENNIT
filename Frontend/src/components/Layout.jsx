import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import RightSidebar from './RightSidebar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        {/* Left Sidebar - hidden on mobile */}
        <aside className="hidden lg:block w-64 border-r border-stone-200 flex-shrink-0">
          <Sidebar />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 xl:border-r xl:border-stone-200">
          <Outlet />
        </main>

        {/* Right Sidebar - hidden on mobile/tablet */}
        <aside className="hidden xl:block w-80 flex-shrink-0">
          <RightSidebar />
        </aside>
      </div>
    </div>
  )
}
