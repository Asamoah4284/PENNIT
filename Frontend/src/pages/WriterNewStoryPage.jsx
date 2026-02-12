import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUser } from '../lib/auth'
import { createWork, uploadImage, getAssetUrl } from '../lib/api'
import ImageCropModal from '../components/ImageCropModal'

const CATEGORIES = [
  { value: 'short_story', label: 'Short story' },
  { value: 'poem', label: 'Poem' },
  { value: 'novel', label: 'Novel' },
]

// Common themes/topics that cut across poems, short stories, and novels
const QUICK_TOPICS = ['Family', 'Identity', 'Love', 'Ghana', 'Relationships', 'Faith']

export default function WriterNewStoryPage() {
  const navigate = useNavigate()
  const user = getUser()
  const authorId = user?.authorId
  const fileInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('short_story')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [topicsInput, setTopicsInput] = useState('')

  const toggleQuickTopic = (topic) => {
    const parts = topicsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const exists = parts.includes(topic)
    const next = exists ? parts.filter((t) => t !== topic) : [...parts, topic]
    const limited = next.slice(0, 5)
    setTopicsInput(limited.join(', '))
  }

  const handleThumbnailFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(URL.createObjectURL(file))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCropComplete = async (blob) => {
    if (!blob) return
    setThumbnailUploading(true)
    try {
      const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' })
      const { url } = await uploadImage(file)
      setThumbnailUrl(url)
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
      setCropImageSrc(null)
    } finally {
      setThumbnailUploading(false)
    }
  }

  const handleCropCancel = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
  }

  const saveStory = async (status) => {
    if (!title.trim()) return
    if (!authorId) {
      setSaveError('Your writer profile is not set up. Please sign out and sign in again.')
      return
    }
    if (status === 'published' && !body.trim()) {
      setSaveError('Add some story content to publish.')
      return
    }
    setSaveError('')
    setSaving(true)
    try {
      const topics = topicsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5)

      const work = await createWork({
        title: title.trim(),
        authorId,
        category,
        genre: 'General',
        excerpt: excerpt.trim(),
        body: body.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        topics,
        status,
      })
      navigate(`/writers-dashboard/story/${work.id}`)
    } catch (err) {
      setSaveError(err?.message || (status === 'draft' ? 'Failed to save draft.' : 'Failed to publish. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = (e) => {
    e.preventDefault()
    saveStory('published')
  }

  const handleSaveDraft = (e) => {
    e.preventDefault()
    saveStory('draft')
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link to="/writers-dashboard" className="text-stone-500 text-sm hover:text-stone-900 mb-6 inline-block">
        ← Back to dashboard
      </Link>

      <form onSubmit={handlePublish} className="space-y-5">
        <h2 className="text-xl font-bold text-stone-900">New story</h2>
        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>
        )}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your story a title"
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:ring-2 focus:ring-stone-400/50 focus:border-stone-400"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Thumbnail (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleThumbnailFileSelect}
            className="hidden"
            id="new-thumbnail"
          />
          {thumbnailUrl ? (
            <div className="flex items-start gap-3 mt-2">
              <div className="rounded-lg overflow-hidden border border-stone-200 w-40 aspect-video flex-shrink-0">
                <img src={getAssetUrl(thumbnailUrl)} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="new-thumbnail" className="text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer">
                  {thumbnailUploading ? 'Uploading…' : 'Change image'}
                </label>
                <button type="button" onClick={() => setThumbnailUrl('')} className="text-sm font-medium text-red-600 hover:text-red-700 text-left">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="new-thumbnail"
              className={`mt-2 flex items-center justify-center w-full max-w-[200px] h-20 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50/80 cursor-pointer hover:bg-stone-100 text-stone-500 text-sm ${thumbnailUploading ? 'opacity-60' : ''}`}
            >
              {thumbnailUploading ? 'Uploading…' : 'Choose image'}
            </label>
          )}
        </div>

        {cropImageSrc && (
          <ImageCropModal
            imageSrc={cropImageSrc}
            onComplete={handleCropComplete}
            onCancel={handleCropCancel}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Short summary</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A brief teaser or summary in one or two sentences."
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Topics</label>
          <input
            type="text"
            value={topicsInput}
            onChange={(e) => setTopicsInput(e.target.value)}
            placeholder="Add up to 5 topics, separated by commas (e.g. family, identity, Ghana)"
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:ring-2 focus:ring-stone-400/40 focus:border-stone-400 text-sm"
          />
          <p className="mt-1 text-xs text-stone-400">
            Topics help readers discover your story. Use common themes, locations, or genres.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_TOPICS.map((topic) => {
              const isActive = topicsInput
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .includes(topic)
              return (
                <button
                  type="button"
                  key={topic}
                  onClick={() => toggleQuickTopic(topic)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    isActive
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 text-stone-600 bg-white hover:bg-stone-50'
                  }`}
                >
                  {topic}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Story</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your story here…"
            rows={12}
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 font-serif resize-y"
          />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
          >
            {saving ? 'Publishing…' : 'Publish'}
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || !title.trim()}
            className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <Link
            to="/writers-dashboard"
            className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
