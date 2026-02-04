import { useState } from 'react'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'reads', label: 'Reads' },
  { id: 'engagement', label: 'Engagement' },
]

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
          Stats
        </h1>
        <button
          type="button"
          className="px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          Export
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

      <div className="space-y-4">
        <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-stone-50">
            <p className="text-stone-500 text-sm">Total reads</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">0</p>
          </div>
          <div className="p-4 rounded-xl bg-stone-50">
            <p className="text-stone-500 text-sm">Stories</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">0</p>
          </div>
          <div className="p-4 rounded-xl bg-stone-50">
            <p className="text-stone-500 text-sm">Followers</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">0</p>
          </div>
          <div className="p-4 rounded-xl bg-stone-50">
            <p className="text-stone-500 text-sm">Earnings</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">—</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-8 text-center">
          <p className="text-stone-500">
            {activeTab === 'overview' && 'Your stats overview will appear here.'}
            {activeTab === 'reads' && 'Read trends and history will appear here.'}
            {activeTab === 'engagement' && 'Engagement metrics will appear here.'}
          </p>
        </div>
      </div>
    </div>
  )
}
