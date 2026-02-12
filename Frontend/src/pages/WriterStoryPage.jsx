import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getWork, updateWork, deleteWork, uploadImage } from '../lib/api'
import ImageCropModal from '../components/ImageCropModal'

const CATEGORIES = [
  { value: 'short_story', label: 'Short story' },
  { value: 'poem', label: 'Poem' },
  { value: 'novel', label: 'Novel' },
]

const categoryLabel = (cat) => {
  const map = { poem: 'Poem', short_story: 'Short story', novel: 'Novel' }
  return map[cat] || cat
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const formatReads = (count) => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count ?? 0)
}

export default function WriterStoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [work, setWork] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('short_story')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    getWork(id)
      .then((data) => {
        setWork(data)
        setTitle(data.title || '')
        setCategory(data.category || 'short_story')
        setExcerpt(data.excerpt || '')
        setBody(data.body || '')
        setThumbnailUrl(data.thumbnailUrl || '')
      })
      .catch(() => setError('Story not found.'))
      .finally(() => setLoading(false))
  }, [id])

  const startEdit = () => {
    setTitle(work?.title || '')
    setCategory(work?.category || 'short_story')
    setExcerpt(work?.excerpt || '')
    setBody(work?.body || '')
    setThumbnailUrl(work?.thumbnailUrl || '')
    setSaveError('')
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setSaveError('')
  }

  const handlePublish = async () => {
    if (!work?.id) return
    setSaveError('')
    setSaving(true)
    try {
      const updated = await updateWork(work.id, { status: 'published' })
      setWork(updated)
    } catch (err) {
      setSaveError(err?.message || 'Failed to publish.')
    } finally {
      setSaving(false)
    }
  }

  const saveWork = async (publish = false) => {
    if (!work?.id || !title.trim()) return
    setSaveError('')
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        category,
        genre: work.genre || 'General',
        excerpt: excerpt.trim(),
        body: body.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
      }
      if (publish) payload.status = 'published'
      const updated = await updateWork(work.id, payload)
      setWork(updated)
      setIsEditing(false)
    } catch (err) {
      setSaveError(err?.message || (publish ? 'Failed to publish.' : 'Failed to save.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    saveWork(false)
  }

  const handleSaveAndPublish = (e) => {
    e.preventDefault()
    saveWork(true)
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

  const handleDelete = async () => {
    if (!work?.id) return
    try {
      await deleteWork(work.id)
      navigate('/writers-dashboard')
    } catch (err) {
      setSaveError(err?.message || 'Failed to delete.')
    } finally {
      setDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center text-stone-500">
        Loading…
      </div>
    )
  }

  if (error || !work) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-stone-500 mb-4">{error || 'Story not found.'}</p>
        <Link to="/writers-dashboard" className="text-stone-900 font-medium hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link to="/writers-dashboard" className="text-stone-500 text-sm hover:text-stone-900 mb-6 inline-block">
        ← Back to dashboard
      </Link>

      {!isEditing ? (
        <>
          {/* View mode */}
          <header className="mb-8">
            <p className="text-stone-500 text-sm font-medium uppercase tracking-wide mb-2">
              {categoryLabel(work.category)}
            </p>
            <h1 className="text-3xl font-bold text-stone-900 font-serif">{work.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-stone-500">
              <span>Posted {formatDateTime(work.createdAt)}</span>
              <span>{formatReads(work.readCount)} reads</span>
            </div>
          </header>

          {work.thumbnailUrl && (
            <div className="rounded-xl overflow-hidden border border-stone-200 mb-8 max-w-md aspect-video">
              <img src={work.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {work.excerpt && (
            <p className="text-stone-600 text-lg leading-relaxed mb-6">{work.excerpt}</p>
          )}

          <div className="prose prose-stone max-w-none font-serif text-lg leading-relaxed text-stone-800 whitespace-pre-wrap">
            {work.body}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 pt-6 border-t border-stone-200">
            {work.status === 'draft' && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Publishing…' : 'Publish'}
              </button>
            )}
            <button
              type="button"
              onClick={startEdit}
              className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
            >
              Edit story
            </button>
            <Link
              to={`/reading/${work.id}`}
              className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50"
            >
              View as reader
            </Link>
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg text-red-600 text-sm font-medium hover:bg-red-50"
            >
              Delete story
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Edit mode */}
          <form onSubmit={handleSave} className="space-y-5">
            <h2 className="text-xl font-bold text-stone-900">Edit story</h2>
            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                id="edit-thumbnail"
              />
              {thumbnailUrl ? (
                <div className="flex items-start gap-3 mt-2">
                  <div className="rounded-lg overflow-hidden border border-stone-200 w-40 aspect-video flex-shrink-0">
                    <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="edit-thumbnail" className="text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer">
                      {thumbnailUploading ? 'Uploading…' : 'Change image'}
                    </label>
                    <button type="button" onClick={() => setThumbnailUrl('')} className="text-sm font-medium text-red-600 hover:text-red-700 text-left">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="edit-thumbnail"
                  className={`mt-2 flex items-center justify-center w-full max-w-[200px] h-20 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50/80 cursor-pointer hover:bg-stone-100 text-stone-500 text-sm ${thumbnailUploading ? 'opacity-60' : ''}`}
                >
                  {thumbnailUploading ? 'Uploading…' : 'Choose image'}
                </label>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Short summary</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-stone-200 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Story</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full px-3 py-2.5 rounded-lg border border-stone-200 font-serif resize-y"
                required
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {work.status === 'draft' && (
                <button
                  type="button"
                  onClick={handleSaveAndPublish}
                  disabled={saving || !title.trim()}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Publishing…' : 'Save & publish'}
                </button>
              )}
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}

      {cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-stone-900 mb-2">Delete this story?</h3>
            <p className="text-stone-600 text-sm mb-6">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
