import { useState, useRef } from 'react'
import { uploadImage, getAssetUrl } from '../lib/api'

const CATEGORIES = [
  { value: 'short_story', label: 'Short story' },
  { value: 'poem', label: 'Poem' },
  { value: 'novel', label: 'Novel' },
]

export default function NewStoryModal({ isOpen, onClose, onSave }) {
  const fileInputRef = useRef(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('short_story')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setTitle('')
    setCategory('short_story')
    setThumbnailUrl('')
    setExcerpt('')
    setBody('')
  }

  const handleClose = () => {
    setError('')
    reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const handleThumbnailChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, GIF, or WebP).')
      return
    }
    setError('')
    setThumbnailUploading(true)
    try {
      const { url } = await uploadImage(file)
      setThumbnailUrl(url)
    } catch (err) {
      setError(err?.message || 'Failed to upload image.')
    } finally {
      setThumbnailUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const clearThumbnail = () => {
    setThumbnailUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSaveDraft = async () => {
    if (!title.trim()) return
    if (!excerpt.trim()) {
      setError('Short summary is required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave?.({ title: title.trim(), category, thumbnailUrl: thumbnailUrl.trim(), excerpt: excerpt.trim(), body: body.trim(), status: 'draft' })
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!title.trim()) return
    if (!excerpt.trim()) {
      setError('Short summary is required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave?.({ title: title.trim(), category, thumbnailUrl: thumbnailUrl.trim(), excerpt: excerpt.trim(), body: body.trim(), status: 'published' })
      handleClose()
    } catch (err) {
      setError(err?.message || 'Failed to publish. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-story-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        aria-label="Close"
      />

      {/* Modal: full height on mobile, card on desktop */}
      <div className="relative w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-stone-100 border-b-0 sm:border-b min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0 px-4 sm:px-6 py-4 border-b border-stone-100">
          <h2 id="new-story-title" className="text-lg font-semibold text-stone-900">
            New story
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 -mr-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors touch-manipulation"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body – scrollable, min-h-0 so flex shrink works */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div>
            <label htmlFor="story-title" className="block text-sm font-medium text-stone-700 mb-1.5">
              Title
            </label>
            <input
              id="story-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your story a title"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/50 focus:border-stone-400"
            />
          </div>

          <div>
            <label htmlFor="story-category" className="block text-sm font-medium text-stone-700 mb-1.5">
              Category
            </label>
            <select
              id="story-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400/50 focus:border-stone-400 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Thumbnail <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleThumbnailChange}
              className="hidden"
              id="story-thumbnail"
            />
            {thumbnailUrl ? (
              <div className="mt-2 flex items-start gap-3">
                <div className="rounded-lg overflow-hidden border border-stone-200 bg-stone-50 w-full max-w-[200px] aspect-video flex-shrink-0">
                  <img
                    src={getAssetUrl(thumbnailUrl)}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={thumbnailUploading}
                    className="text-sm font-medium text-stone-600 hover:text-stone-900 disabled:opacity-50"
                  >
                    {thumbnailUploading ? 'Uploading…' : 'Change image'}
                  </button>
                  <button
                    type="button"
                    onClick={clearThumbnail}
                    disabled={thumbnailUploading}
                    className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="story-thumbnail"
                className={`mt-2 flex flex-col items-center justify-center gap-1 w-full max-w-[240px] min-h-[100px] py-4 px-4 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/80 cursor-pointer hover:bg-stone-100 hover:border-stone-300 transition-colors ${thumbnailUploading ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <span className="text-stone-700 text-sm font-medium text-center">
                  {thumbnailUploading ? 'Uploading…' : 'Select image from device'}
                </span>
                <span className="text-stone-400 text-xs text-center">JPG, PNG, GIF or WebP · Max 5 MB</span>
              </label>
            )}
          </div>

          <div>
            <label htmlFor="story-excerpt" className="block text-sm font-medium text-stone-700 mb-1.5">
              Short summary <span className="text-red-500">*</span>{' '}
              <span className="text-stone-400 font-normal">(for previews)</span>
            </label>
            <textarea
              id="story-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="A brief teaser or summary in one or two sentences."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/50 focus:border-stone-400 resize-none"
              required
            />
          </div>

          <div>
            <label htmlFor="story-body" className="block text-sm font-medium text-stone-700 mb-1.5">
              Story
            </label>
            <textarea
              id="story-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your story here…"
              rows={8}
              className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/50 focus:border-stone-400 resize-y min-h-[180px] sm:min-h-[200px] font-serif text-base leading-relaxed"
            />
          </div>
        </div>

        {/* Footer: stacked on mobile for easy tap, row on desktop */}
        <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-stone-100 bg-stone-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={handleClose}
            className="order-3 sm:order-1 px-4 py-3 sm:py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || !title.trim() || !excerpt.trim()}
            className="order-2 px-4 py-3 sm:py-2 rounded-lg text-sm font-medium text-stone-700 bg-stone-200 hover:bg-stone-300 disabled:opacity-50 disabled:pointer-events-none transition-colors touch-manipulation"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving || !title.trim() || !excerpt.trim()}
            className="order-1 sm:order-3 px-4 py-3 sm:py-2 rounded-lg text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 disabled:pointer-events-none transition-colors touch-manipulation"
          >
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
