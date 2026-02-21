import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../lib/api'
import { setUser, getUser } from '../lib/auth'

export default function AdminLoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        const user = getUser()
        if (user && user.role === 'admin') {
            navigate('/victor-access-control')
        }
    }, [navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const user = await login({ email, password })
            if (user.role !== 'admin') {
                throw new Error('Access denied: You are not an admin.')
            }
            setUser(user)
            navigate('/victor-access-control')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <Link to="/">
                        <img src="/images/logo.jpeg" alt="Pennit" className="h-12 w-auto mx-auto mb-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Admin Portal</h1>
                    <p className="text-stone-500 text-sm mt-2">Please sign in to access the dashboard</p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1 ml-1" htmlFor="email">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all placeholder:text-stone-300 text-stone-900"
                                placeholder="admin@pennit.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1 ml-1" htmlFor="password">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all placeholder:text-stone-300 text-stone-900"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/10 disabled:opacity-50"
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8">
                    <Link to="/" className="text-stone-400 text-sm hover:text-stone-900 transition-colors">
                        &larr; Return to Pennit
                    </Link>
                </p>
            </div>
        </div>
    )
}
