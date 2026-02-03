import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { setUser } from '../lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }
    // Mock login: store user and redirect by role
    const role = email.includes('writer') ? 'writer' : 'reader'
    const mockUser = {
      id: 'user-' + Date.now(),
      email: email.trim(),
      role,
      penName: role === 'writer' ? email.split('@')[0] : undefined,
      authorId: role === 'writer' ? 'author-1' : undefined,
    }
    setUser(mockUser)
    navigate(role === 'writer' ? '/dashboard' : '/reader')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Log in</h1>
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
            autoComplete="current-password"
          />
        </div>
        <p className="text-sm text-stone-500">
          <Link to="/signup" className="text-yellow-600 hover:underline">Forgot password?</Link> (placeholder)
        </p>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-yellow-400 text-stone-900 font-semibold rounded-lg hover:bg-yellow-500"
        >
          Log in
        </button>
      </form>
      <p className="mt-6 text-stone-600">
        Don&apos;t have an account? <Link to="/signup" className="text-yellow-600 font-medium hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
