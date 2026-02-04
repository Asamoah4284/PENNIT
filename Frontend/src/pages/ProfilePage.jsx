import { useState } from 'react'
import { getUser } from '../lib/auth'

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'settings', label: 'Settings' },
  { id: 'account', label: 'Account' },
]

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('about')
  const user = getUser()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
          Profile
        </h1>
        <button
          type="button"
          className="px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          Edit profile
        </button>
      </div>

      <nav className="border-b border-stone-200 mb-8">
        <ul className="flex gap-6 overflow-x-auto pb-px">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-stone-900 border-b-2 border-stone-900'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
        {activeTab === 'about' && (
          <div className="flex gap-6">
            <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-2xl font-bold text-stone-500 flex-shrink-0">
              {(user?.penName || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">{user?.penName || 'Your name'}</h2>
              <p className="text-stone-500 text-sm mt-1">{user?.email}</p>
              <p className="text-stone-600 mt-4">Add a bio to tell readers about yourself.</p>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <p className="text-stone-600">Notification and display preferences will appear here.</p>
        )}
        {activeTab === 'account' && (
          <p className="text-stone-600">Email, password, and account security options will appear here.</p>
        )}
      </div>
    </div>
  )
}
