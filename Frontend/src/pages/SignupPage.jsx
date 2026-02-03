import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { setUser } from '../lib/auth'

const ROLE_OPTIONS = [
  { value: 'reader', label: 'Reader' },
  { value: 'writer', label: 'Writer' },
]

export default function SignupPage() {
  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role')
  const initialRole = roleParam === 'writer' || roleParam === 'reader' ? roleParam : 'reader'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState(initialRole)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    if (!password || password.length < 6) {
      setError('Please enter a password (at least 6 characters).')
      return
    }
    const mockUser = {
      id: 'user-' + Date.now(),
      email: email.trim(),
      role,
      penName: role === 'writer' ? (displayName.trim() || email.split('@')[0]) : undefined,
      authorId: role === 'writer' ? 'author-1' : undefined,
    }
    setUser(mockUser)
    navigate(role === 'writer' ? '/dashboard' : '/reader')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Sign up</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-stone-700 mb-1">
            {role === 'writer' ? 'Pen name' : 'Display name'}
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder={role === 'writer' ? 'Your pen name' : 'Your name'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">I am a</label>
          <div className="flex gap-4">
            {ROLE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={role === opt.value}
                  onChange={() => setRole(opt.value)}
                  className="text-yellow-500 focus:ring-yellow-500"
                />
                <span className="text-stone-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-yellow-400 text-stone-900 font-semibold rounded-lg hover:bg-yellow-500"
        >
          Create account
        </button>
      </form>
      <p className="mt-6 text-stone-600">
        Already have an account? <Link to="/login" className="text-yellow-600 font-medium hover:underline">Log in</Link>
      </p>
    </div>
  )
}
