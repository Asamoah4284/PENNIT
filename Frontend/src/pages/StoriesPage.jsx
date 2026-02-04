import { useState } from 'react'
import NewStoryModal from '../components/NewStoryModal'

const TABS = [
  { id: 'published', label: 'Published' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'all', label: 'All' },
]

export default function StoriesPage() {
  const [activeTab, setActiveTab] = useState('published')
  const [showNewStoryModal, setShowNewStoryModal] = useState(false)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
          Stories
        </h1>
        <button
          type="button"
          onClick={() => setShowNewStoryModal(true)}
          className="px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          New story
        </button>
      </div>

      <NewStoryModal
        isOpen={showNewStoryModal}
        onClose={() => setShowNewStoryModal(false)}
        onSave={async () => {}}
      />

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

      <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-8 text-center">
        <p className="text-stone-500">
          {activeTab === 'published' && 'No published stories yet.'}
          {activeTab === 'drafts' && 'No drafts.'}
          {activeTab === 'all' && 'No stories yet.'}
        </p>
        <button
          type="button"
          onClick={() => setShowNewStoryModal(true)}
          className="mt-4 px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors"
        >
          Start writing
        </button>
      </div>
    </div>
  )
}
