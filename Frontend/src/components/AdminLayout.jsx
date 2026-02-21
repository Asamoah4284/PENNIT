import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getUser, logout } from '../lib/auth'

const NAV = [
    {
        label: 'Overview',
        path: '/victor-access-control',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
        ),
    },
    {
        label: 'Users',
        path: '/victor-access-control/users',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM9 13a6 6 0 00-6 6h12a6 6 0 00-6-6zm8 0a5.978 5.978 0 00-4 1.528A7.954 7.954 0 0117 19h2a6 6 0 00-4-5.66V13z" />
            </svg>
        ),
    },
    {
        label: 'Content',
        path: '/victor-access-control/works',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
        ),
    },
]

export default function AdminLayout() {
    const user = getUser()
    const location = useLocation()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleLogout = () => { logout(); navigate('/') }

    const isActive = (path) => location.pathname === path

    const currentPage = NAV.find((n) => isActive(n.path))?.label ?? 'Dashboard'

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col md:flex-row" style={{ fontFamily: "'Inter', 'system-ui', sans-serif" }}>

            {/* ── Mobile Sidebar Overlay ── */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-[#E5E7EB] transition-all duration-300 
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
                    ${collapsed ? 'md:w-[60px]' : 'md:w-[220px]'} w-[240px] md:relative`}
            >
                {/* Logo */}
                <div className="h-14 flex items-center justify-between px-4 border-b border-[#E5E7EB] shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center shrink-0">
                            <span className="text-white font-black text-xs tracking-tighter">VA</span>
                        </div>
                        {(!collapsed || mobileOpen) && (
                            <span className="font-semibold text-[13px] text-[#111] tracking-tight truncate">Victor Admin</span>
                        )}
                    </div>
                    {/* Mobile close button */}
                    <button onClick={() => setMobileOpen(false)} className="md:hidden p-1 text-[#9CA3AF]">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
                    {NAV.map((item) => {
                        const active = isActive(item.path)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileOpen(false)}
                                title={collapsed ? item.label : undefined}
                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-150 group ${active
                                    ? 'bg-[#F3F4F6] text-[#111]'
                                    : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111]'
                                    }`}
                            >
                                <span className={`shrink-0 ${active ? 'text-[#111]' : 'text-[#9CA3AF] group-hover:text-[#6B7280]'}`}>
                                    {item.icon}
                                </span>
                                {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Bottom: collapse + user */}
                <div className="border-t border-[#E5E7EB] p-2 space-y-1 shrink-0 bg-white">
                    {/* Collapse toggle (Desktop only) */}
                    <button
                        onClick={() => setCollapsed((v) => !v)}
                        className="hidden md:flex w-full items-center gap-2.5 px-2.5 py-2 rounded-md text-[#9CA3AF] hover:bg-[#F9FAFB] hover:text-[#6B7280] transition-colors"
                        title={collapsed ? 'Expand' : 'Collapse'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 shrink-0 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                        {!collapsed && <span className="text-[12px] font-medium">Collapse</span>}
                    </button>

                    {/* User row */}
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[#6B7280] hover:bg-red-50 hover:text-red-500 transition-colors group"
                    >
                        <div className="w-5 h-5 rounded-full bg-[#111] shrink-0 flex items-center justify-center">
                            <span className="text-white text-[9px] font-bold">{user?.name?.[0]?.toUpperCase() ?? 'A'}</span>
                        </div>
                        {(!collapsed || mobileOpen) && (
                            <span className="text-[12px] font-medium truncate flex-1 text-left">{user?.name ?? 'Admin'}</span>
                        )}
                        {(!collapsed || mobileOpen) && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                </div>
            </aside>

            {/* ── Main area ────────────────────────────────────────────── */}
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full`}>

                {/* Top bar */}
                <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="p-1 md:hidden text-[#6B7280] hover:text-[#111]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-2 text-[12px] md:text-[13px]">
                            <span className="text-[#9CA3AF] font-medium hidden sm:inline">Pennit</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-[#D1D5DB] hidden sm:inline">
                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[#111] font-semibold">{currentPage}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[10px] sm:text-[11px] font-semibold">
                            <span className="w-1 to 1.5 h-1 md:h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Live
                        </span>
                        <Link to="/" className="text-[11px] sm:text-[12px] text-[#9CA3AF] hover:text-[#111] font-medium transition-colors whitespace-nowrap">
                            <span className="hidden sm:inline">← Back to Pennit</span>
                            <span className="sm:hidden">← Home</span>
                        </Link>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
