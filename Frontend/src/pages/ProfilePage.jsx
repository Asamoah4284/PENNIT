import { useState, useEffect, useRef } from 'react'
import { getUser, setUser } from '../lib/auth'
import { getMe, updateProfile, changePassword, uploadImage, getAssetUrl } from '../lib/api'
import ImageCropModal from '../components/ImageCropModal'

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'settings', label: 'Settings' },
  { id: 'account', label: 'Account' },
]

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('about')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const fileInputRef = useRef(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const user = getUser()

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    getMe(user.id)
      .then(setProfile)
      .catch(() => setError('Could not load profile.'))
      .finally(() => setLoading(false))
  }, [user?.id])

  const openEdit = () => {
    setEditName(profile?.name ?? user?.name ?? '')
    setEditBio(profile?.bio ?? '')
    setEditAvatarUrl(profile?.avatarUrl ?? '')
    setSaveError('')
    setEditOpen(true)
  }

  const handleAvatarFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(URL.createObjectURL(file))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCropComplete = async (blob) => {
    if (!blob) return
    setAvatarUploading(true)
    try {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      const { url } = await uploadImage(file)
      setEditAvatarUrl(url)
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
      setCropImageSrc(null)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleCropCancel = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!user?.id) return
    setSaveError('')
    setSaving(true)
    try {
      const updated = await updateProfile(user.id, {
        name: editName.trim(),
        bio: editBio.trim(),
        avatarUrl: editAvatarUrl.trim(),
      })
      setProfile(updated)
      setUser(updated)
      window.dispatchEvent(new CustomEvent('pennit:user-updated'))
      setEditOpen(false)
    } catch (err) {
      setSaveError(err?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.name || profile?.penName || user?.name || user?.penName || user?.email || 'Your name'
  const displayBio = profile?.bio ?? ''
  const displayAvatarUrl = profile?.avatarUrl ?? ''

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Profile</h1>
        <button
          type="button"
          onClick={openEdit}
          className="px-5 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
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

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 mb-6">{error}</div>
      )}

      <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
        {activeTab === 'about' && (
          <div className="flex gap-6">
            <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-2xl font-bold text-stone-500 flex-shrink-0 overflow-hidden">
              {loading ? (
                <span className="text-stone-400">…</span>
              ) : displayAvatarUrl ? (
                <img
                  src={getAssetUrl(displayAvatarUrl)}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                (displayName || user?.email || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-stone-900">{displayName}</h2>
              <p className="text-stone-500 text-sm mt-1">{user?.email}</p>
              <p className="text-stone-600 mt-4 whitespace-pre-wrap">
                {displayBio || 'Add a bio to tell readers about yourself.'}
              </p>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <p className="text-stone-600">Notification and display preferences will appear here.</p>
        )}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Email</label>
              <p className="text-stone-900 font-medium">
                {loading ? '…' : (profile?.email ?? user?.email ?? '—')}
              </p>
              <p className="text-stone-500 text-sm mt-0.5">Used to sign in. Contact support to change.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Password</label>
              <p className="text-stone-900 font-medium tracking-wider">••••••••</p>
              <p className="text-stone-500 text-sm mt-0.5">Hidden for security. Use Change password to set a new one.</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit profile modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h2 className="text-lg font-semibold text-stone-900">Edit profile</h2>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-4 space-y-4">
              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</p>
              )}

              {/* Profile image */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Profile image</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-stone-200 flex-shrink-0 overflow-hidden flex items-center justify-center text-xl font-bold text-stone-500">
                    {editAvatarUrl ? (
                      <img src={getAssetUrl(editAvatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (editName || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileSelect}
                      className="hidden"
                      id="profile-avatar-input"
                    />
                    <label
                      htmlFor="profile-avatar-input"
                      className="px-3 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 cursor-pointer inline-block"
                    >
                      {avatarUploading ? 'Uploading…' : 'Choose photo'}
                    </label>
                    {editAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl('')}
                        className="text-sm text-stone-500 hover:text-red-600"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-stone-700 mb-1.5">Name</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:ring-2 focus:ring-stone-400/40 focus:border-stone-400"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="edit-bio" className="block text-sm font-medium text-stone-700 mb-1.5">Bio</label>
                <textarea
                  id="edit-bio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 resize-none focus:ring-2 focus:ring-stone-400/40 focus:border-stone-400"
                  placeholder="Tell readers about yourself."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || !editName.trim()}
                  className="px-4 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}
