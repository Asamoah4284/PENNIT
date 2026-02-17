import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { signup as signupApi, login as loginApi } from '../lib/api'
import { setUser } from '../lib/auth'

export default function LandingPage() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [authView, setAuthView] = useState('signin') // 'signin', 'signup-email', 'signin-email'
    const [signupEmail, setSignupEmail] = useState('')
    const [signupName, setSignupName] = useState('')
    const [signupPhone, setSignupPhone] = useState('')
    const [signupPassword, setSignupPassword] = useState('')
    const [signupRole, setSignupRole] = useState('reader')
    const [signupPenName, setSignupPenName] = useState('')
    const [showSignupPassword, setShowSignupPassword] = useState(false)
    const [signupError, setSignupError] = useState('')
    const [signupLoading, setSignupLoading] = useState(false)
    const [signinEmail, setSigninEmail] = useState('')
    const [signinPassword, setSigninPassword] = useState('')
    const [showSigninPassword, setShowSigninPassword] = useState(false)
    const [signinError, setSigninError] = useState('')
    const [signinLoading, setSigninLoading] = useState(false)

    // Open auth popup when arriving with ?signup=1, ?signup=writer, or ?signin=1
    useEffect(() => {
        const signup = searchParams.get('signup')
        const signin = searchParams.get('signin')
        if (signup === 'writer' || signup === '1') {
            setShowAuthModal(true)
            setAuthView('signup-email')
            setSignupRole(signup === 'writer' ? 'writer' : 'reader')
            setSearchParams({}, { replace: true })
        } else if (signin === '1') {
            setShowAuthModal(true)
            setAuthView('signin')
            setSearchParams({}, { replace: true })
        }
    }, [searchParams, setSearchParams])

    const formatReads = (count) => {
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
        return count.toString()
    }

    const handleSignupSubmit = async (e) => {
        e.preventDefault()
        setSignupError('')
        if (!signupEmail.trim()) {
            setSignupError('Please enter your email.')
            return
        }
        if (!signupName.trim()) {
            setSignupError('Please enter your name.')
            return
        }
        if (!signupPassword || signupPassword.length < 6) {
            setSignupError('Password must be at least 6 characters.')
            return
        }
        setSignupLoading(true)
        try {
            const user = await signupApi({
                email: signupEmail.trim(),
                name: signupName.trim(),
                phone: signupPhone.trim(),
                password: signupPassword,
                role: signupRole,
                penName: signupRole === 'writer' ? signupPenName.trim() : undefined,
            })
            setUser({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role === 'writer' ? 'writer' : 'reader',
                penName: user.penName || undefined,
                authorId: user.authorId || undefined,
            })
            setSignupEmail('')
            setSignupName('')
            setSignupPhone('')
            setSignupPassword('')
            setSignupPenName('')
            setShowAuthModal(false)
            setAuthView('signin')
            navigate(signupRole === 'writer' ? '/writers-dashboard' : '/home')
        } catch (err) {
            setSignupError(err.message || 'Could not create account. Please try again.')
        } finally {
            setSignupLoading(false)
        }
    }

    const handleSigninSubmit = async (e) => {
        e.preventDefault()
        setSigninError('')
        if (!signinEmail.trim()) {
            setSigninError('Please enter your email.')
            return
        }
        if (!signinPassword) {
            setSigninError('Please enter your password.')
            return
        }
        setSigninLoading(true)
        try {
            const user = await loginApi({ email: signinEmail.trim(), password: signinPassword })
            const role = user.role === 'writer' ? 'writer' : 'reader'
            setUser({
                id: user.id,
                email: user.email,
                name: user.name,
                role,
                penName: user.penName || undefined,
                authorId: user.authorId || undefined,
            })
            setSigninEmail('')
            setSigninPassword('')
            setShowAuthModal(false)
            setAuthView('signin')
            navigate(role === 'writer' ? '/writers-dashboard' : '/home')
        } catch (err) {
            setSigninError(err.message || 'Could not sign in. Please try again.')
        } finally {
            setSigninLoading(false)
        }
    }

    return (
        <div className="h-screen overflow-hidden lg:min-h-screen lg:overflow-visible bg-[#FDFCFB]">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-50 px-6 lg:px-12 py-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex-shrink-0">
                        <img src="/images/logo.jpeg" alt="Pennit" className="h-[48px] w-auto object-contain rounded-md" />
                    </Link>



                    {/* Auth Buttons */}
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="hidden sm:flex items-center gap-2 text-sm font-medium text-white hover:text-white/90 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                            Write
                        </button>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="text-sm font-medium text-white hover:text-white/90 transition-colors"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="text-xs font-bold sm:text-sm sm:font-black bg-yellow-400 text-stone-900 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full hover:bg-yellow-300 transition-colors"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section: on mobile show image first; on lg show text left + image right */}
            <section className="relative min-h-screen flex flex-col lg:flex-row">
                {/* Left Side - Text (hidden on mobile, shown on lg) */}
                <div className="hidden lg:flex w-full lg:w-1/2 bg-[#FDFCFB] flex-col justify-center px-6 lg:px-20 py-32 lg:py-20 relative overflow-hidden bg-writing-carvings corner-flourish">
                    {/* Paper texture */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-[0.04] pointer-events-none" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/natural-paper.png')` }}></div>
                    {/* Gold orbs – wow glow */}
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-yellow-400/15 blur-[120px] rounded-full"></div>
                    <div className="absolute top-1/3 -right-20 w-72 h-72 bg-amber-300/12 blur-[100px] rounded-full"></div>
                    <div className="absolute bottom-1/4 -left-16 w-64 h-64 bg-yellow-500/10 blur-[90px] rounded-full"></div>
                    {/* Diagonal accent stripe */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-yellow-100/30 via-transparent to-transparent pointer-events-none"></div>
                    {/* Bottom gradient */}
                    <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-stone-100/60 to-transparent pointer-events-none"></div>

                    <div className="max-w-xl relative z-10">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-stone-100 border border-stone-200 text-stone-600 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-10 animate-fade-in">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                            </span>
                            Africa's Premier Writing Platform
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-stone-900 leading-[1.1] mb-6 tracking-tight">
                            Where African
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600">
                                Creativity
                            </span>
                            <br />
                            Thrives.
                        </h1>

                        {/* Subheadline */}
                        <p className="text-base md:text-lg text-stone-600 mb-10 max-w-md leading-relaxed">
                            A borderless home for African stories. Join a global community of writers and readers celebrating the richness of our heritage.
                        </p>

                        {/* Buttons - Decreased size */}
                        <div className="flex flex-wrap gap-4 mb-16">
                            <Link
                                to="/home"
                                className="group relative inline-flex items-center gap-3 bg-yellow-400 text-stone-900 text-sm font-black px-8 py-4 rounded-xl hover:bg-yellow-300 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(250,204,21,0.3)] hover:shadow-[0_0_50px_-5px_rgba(250,204,21,0.4)] hover:-translate-y-1"
                            >
                                Start Reading
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </Link>
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="inline-flex items-center gap-3 bg-stone-100 border border-stone-200 text-stone-900 text-sm font-bold px-8 py-4 rounded-xl hover:bg-stone-200 transition-all duration-300"
                            >
                                Start Writing
                            </button>
                        </div>

                        {/* Community & Stats */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-8 border-t border-stone-200 pt-10">
                            {/* Avatar Stack */}
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3">
                                    {[10, 12, 15, 32].map((id) => (
                                        <img
                                            key={id}
                                            src={`https://i.pravatar.cc/150?u=${id}`}
                                            alt="User"
                                            className="w-10 h-10 rounded-full border-[3px] border-[#FDFCFB] object-cover"
                                        />
                                    ))}
                                    <div className="w-10 h-10 rounded-full border-[3px] border-[#FDFCFB] bg-yellow-400 flex items-center justify-center text-xs font-black text-stone-900">
                                        +
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-stone-500">
                                    Join <strong className="text-stone-900">10,000+</strong> writers
                                </div>
                            </div>

                            <div className="hidden sm:block w-px h-10 bg-stone-200"></div>

                            <div className="flex gap-10">
                                <div>
                                    <div className="text-2xl font-black text-stone-900">50K+</div>
                                    <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Stories</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-stone-900">1M+</div>
                                    <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Readers</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Image (shown first on mobile, right on desktop) */}
                <div className="flex-1 min-h-screen lg:min-h-0 lg:w-1/2 relative overflow-hidden order-first lg:order-none">
                    <img
                        src="/images/hero-illustration.png"
                        alt="African creativity"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1544535830-9df3f56fff6a?w=800&q=80'
                        }}
                    />
                    {/* Overlay Pattern */}
                    <div className="absolute inset-0 bg-gradient-to-r from-stone-900/20 to-transparent"></div>

                    {/* Floating Card - Minimalist Redesign (slightly higher on mobile) */}
                    <div className="absolute bottom-24 lg:bottom-12 left-6 lg:left-12 group">
                        <button
                            type="button"
                            onClick={() => navigate('/home')}
                            className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-4 pl-4 pr-12 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] flex items-center gap-6 transform hover:-translate-y-2 transition-all duration-500 cursor-pointer"
                        >
                            {/* Icon Container */}
                            <div className="relative">
                                <div className="w-14 h-14 bg-stone-900 rounded-[1.5rem] flex items-center justify-center transition-transform duration-500 group-hover:rotate-[10deg]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                </div>
                                {/* Status dot */}
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 border-[3px] border-white rounded-full"></div>
                            </div>

                            {/* Text Content */}
                            <div className="flex flex-col">
                                <span className="text-stone-900 font-extrabold text-sm uppercase tracking-tight">Start Your Journey</span>
                                <span className="text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Join the community</span>
                            </div>

                            {/* Subtle Arrow */}
                            <div className="absolute right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="#1C1917" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                            </div>
                        </button>
                    </div>
                </div>
            </section>







            {/* Auth Modal */}
            {showAuthModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm animate-fade-in"
                        onClick={() => setShowAuthModal(false)}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative w-full max-w-xl max-h-[90vh] bg-white rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 ease-out flex flex-col">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 transition-colors z-10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="px-8 pt-12 pb-8 sm:px-16 text-center overflow-y-auto">
                            {authView === 'signin' ? (
                                <>
                                    <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 mb-12">Welcome back.</h2>

                                    <div className="space-y-3">
                                        <AuthButton icon="google" label="Sign in with Google" />
                                        <AuthButton icon="facebook" label="Sign in with Facebook" />
                                        <AuthButton icon="apple" label="Sign in with Apple" />
                                        <AuthButton icon="x" label="Sign in with X" />
                                        <AuthButton icon="email" label="Sign in with email" onClick={() => setAuthView('signin-email')} />
                                    </div>

                                    <div className="mt-12 text-sm">
                                        <p className="text-stone-600 font-medium">
                                            No account? <button type="button" onClick={() => setAuthView('signup-email')} className="text-stone-900 font-bold hover:underline">Create one</button>
                                        </p>
                                        <p className="text-stone-600 font-medium mt-4">
                                            Forgot email or trouble signing in? <button type="button" className="text-stone-900 font-bold hover:underline">Get help.</button>
                                        </p>
                                    </div>

                                    <div className="mt-12 text-[10px] text-stone-400 leading-relaxed max-w-xs mx-auto">
                                        By clicking "Sign in", you accept Pennit's <button type="button" className="underline">Terms of Service</button> and <button type="button" className="underline">Privacy Policy</button>.
                                    </div>
                                </>
                            ) : authView === 'signin-email' ? (
                                <>
                                    <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-5">Sign in with email</h2>

                                    {signinError && (
                                        <p className="max-w-sm mx-auto mb-3 text-sm text-red-600 text-left">{signinError}</p>
                                    )}

                                    <form onSubmit={handleSigninSubmit} className="max-w-sm mx-auto text-left space-y-3">
                                        <div>
                                            <label htmlFor="signin-email" className="block text-sm font-medium text-stone-700 mb-1">Your email</label>
                                            <input
                                                id="signin-email"
                                                type="email"
                                                value={signinEmail}
                                                onChange={(e) => setSigninEmail(e.target.value)}
                                                placeholder="Enter your email address"
                                                className="w-full px-3 py-2 border border-stone-300 rounded-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all placeholder:text-stone-400 text-sm"
                                                autoComplete="email"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="signin-password" className="block text-sm font-medium text-stone-700 mb-1">Password</label>
                                            <div className="relative">
                                                <input
                                                    id="signin-password"
                                                    type={showSigninPassword ? 'text' : 'password'}
                                                    value={signinPassword}
                                                    onChange={(e) => setSigninPassword(e.target.value)}
                                                    placeholder="Enter your password"
                                                    className="w-full px-3 py-2 pr-10 border border-stone-300 rounded-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all placeholder:text-stone-400 text-sm"
                                                    autoComplete="current-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSigninPassword((v) => !v)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
                                                    aria-label={showSigninPassword ? 'Hide password' : 'Show password'}
                                                >
                                                    {showSigninPassword ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={signinLoading}
                                            className="w-full mt-4 bg-stone-900 text-white font-bold py-3 rounded-full hover:bg-stone-800 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {signinLoading ? 'Signing in…' : 'Sign in'}
                                        </button>
                                    </form>

                                    <div className="mt-6 space-y-2">
                                        <button type="button" onClick={() => { setAuthView('signin'); setSigninError(''); }} className="text-stone-600 font-medium hover:text-stone-900 transition-colors text-sm">
                                            Back to sign in options
                                        </button>
                                        <p className="text-stone-600 font-medium text-sm">
                                            No account? <button type="button" onClick={() => setAuthView('signup-email')} className="text-stone-900 font-bold hover:underline">Create one</button>
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Sign up with email view */}
                                    <div className="flex justify-center mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-stone-900">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                        </svg>
                                    </div>

                                    <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-5">Sign up with email</h2>

                                    {signupError && (
                                        <p className="max-w-sm mx-auto mb-3 text-sm text-red-600 text-left">{signupError}</p>
                                    )}

                                    <form onSubmit={handleSignupSubmit} className="max-w-sm mx-auto text-left space-y-3">
                                        <div>
                                            <label htmlFor="signup-email" className="block text-sm font-medium text-stone-700 mb-1">Your email</label>
                                            <input
                                                id="signup-email"
                                                type="email"
                                                value={signupEmail}
                                                onChange={(e) => setSignupEmail(e.target.value)}
                                                placeholder="Enter your email address"
                                                className="w-full px-3 py-2 border border-stone-300 rounded-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all placeholder:text-stone-400 text-sm"
                                                autoComplete="email"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="signup-name" className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                                            <input
                                                id="signup-name"
                                                type="text"
                                                value={signupName}
                                                onChange={(e) => setSignupName(e.target.value)}
                                                placeholder="Enter your full name"
                                                className="w-full px-3 py-2 border border-stone-300 rounded-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all placeholder:text-stone-400 text-sm"
                                                autoComplete="name"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="signup-phone" className="block text-sm font-medium text-stone-700 mb-1">Phone number</label>
                                            <input
                                                id="signup-phone"
                                                type="tel"
                                                value={signupPhone}
                                                onChange={(e) => setSignupPhone(e.target.value)}
                                                placeholder="Enter your phone number"
                                                className="w-full px-3 py-2 border border-stone-300 rounded-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all placeholder:text-stone-400 text-sm"
                                                autoComplete="tel"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="signup-password" className="block text-sm font-medium text-stone-700 mb-1">Password</label>
                                            <div className="relative">
                                                <input
                                                    id="signup-password"
                                                    type={showSignupPassword ? 'text' : 'password'}
                                                    value={signupPassword}
                                                    onChange={(e) => setSignupPassword(e.target.value)}
                                                    placeholder="Create a password (min. 6 characters)"
                                                    className="w-full px-3 py-2 pr-10 border border-stone-300 rounded-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all placeholder:text-stone-400 text-sm"
                                                    autoComplete="new-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSignupPassword((v) => !v)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
                                                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                                                >
                                                    {showSignupPassword ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <span className="block text-sm font-medium text-stone-700 mb-2">I am a</span>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="signup-role"
                                                        checked={signupRole === 'reader'}
                                                        onChange={() => setSignupRole('reader')}
                                                        className="text-stone-900 focus:ring-stone-900"
                                                    />
                                                    <span className="text-stone-700 text-sm">Reader</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="signup-role"
                                                        checked={signupRole === 'writer'}
                                                        onChange={() => setSignupRole('writer')}
                                                        className="text-stone-900 focus:ring-stone-900"
                                                    />
                                                    <span className="text-stone-700 text-sm">Writer</span>
                                                </label>
                                            </div>
                                        </div>

                                        {signupRole === 'writer' && (
                                            <div>
                                                <label htmlFor="signup-penname" className="block text-sm font-medium text-stone-700 mb-1">Pen name</label>
                                                <input
                                                    id="signup-penname"
                                                    type="text"
                                                    value={signupPenName}
                                                    onChange={(e) => setSignupPenName(e.target.value)}
                                                    placeholder="Your pen name"
                                                    className="w-full px-3 py-2 border border-stone-300 rounded-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all placeholder:text-stone-400 text-sm"
                                                />
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={signupLoading}
                                            className="w-full mt-4 bg-stone-900 text-white font-bold py-3 rounded-full hover:bg-stone-800 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {signupLoading ? 'Creating account…' : 'Create account'}
                                        </button>
                                    </form>

                                    <div className="mt-6 space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => setAuthView('signin')}
                                            className="text-stone-600 font-medium hover:text-stone-900 transition-colors"
                                        >
                                            Back to sign up options
                                        </button>

                                        <p className="text-stone-600 font-medium text-sm">
                                            Already have an account? <button onClick={() => setAuthView('signin')} className="text-stone-900 font-bold hover:underline">Sign in</button>
                                        </p>
                                    </div>

                                    <div className="mt-4 text-[10px] text-stone-400 leading-snug max-w-xs mx-auto">
                                        By clicking "Create Account", you accept Pennit's <button type="button" className="underline">Terms of Service</button> and <button type="button" className="underline">Privacy Policy</button>. reCAPTCHA applies.
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function AuthButton({ icon, label, onClick }) {
    const icons = {
        google: (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
        ),
        facebook: <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />,
        apple: <path d="M12.152 6.896c-.694 0-1.31.351-1.563.351-.253 0-.896-.351-1.446-.351-1.616 0-3.001 1.189-3.001 3.523 0 2.606 1.854 5.591 3.435 5.591.545 0 .808-.303 1.454-.303s.909.303 1.454.303c1.581 0 3.12-2.343 3.12-3.279 0-.053-.014-.074-.015-.075-.011-.021-1.206-.438-1.206-1.896 0-1.22 1.014-1.815 1.064-1.843.033-.019.039-.033.038-.049-.348-1.261-1.788-2.022-3.334-2.022zm-.251-1.12c.732-1.11 1.798-1.554 1.798-1.554l.03-.005.008.031c.002.008.035.129.035.267 0 1.026-.814 1.96-1.742 2.115-.815.132-1.716-.484-1.716-.484l-.042-.027.016-.048c.023-.07 1.047-1.184 1.613-1.691z" />,
        x: <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.487h2.039L6.486 3.236H4.297l13.312 17.404z" />,
        email: <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884zM18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    }

    return (
        <button type="button" onClick={onClick} className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-stone-200 rounded-none hover:bg-stone-50 transition-all duration-200 group">
            <span className="flex-shrink-0">
                {icon === 'google' ? icons.google : (
                    <svg className="w-5 h-5 fill-stone-900" viewBox="0 0 24 24">
                        {icons[icon]}
                    </svg>
                )}
            </span>
            <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900">{label}</span>
        </button>
    )
}
