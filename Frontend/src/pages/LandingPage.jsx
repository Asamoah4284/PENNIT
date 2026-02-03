import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mockWorks, mockAuthors } from '../data/mock'

export default function LandingPage() {
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [authView, setAuthView] = useState('signin') // 'signin', 'signup-email'

    const featuredWorks = mockWorks.slice(0, 3)
    const getAuthor = (authorId) => mockAuthors.find(a => a.id === authorId)

    const formatReads = (count) => {
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
        return count.toString()
    }

    return (
        <div className="min-h-screen bg-[#0C0C0C]">
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
                            className="hidden sm:flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                            Write
                        </button>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="text-sm font-black bg-yellow-400 text-stone-900 px-6 py-2.5 rounded-full hover:bg-yellow-300 transition-colors"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative min-h-screen flex">
                {/* Left Side - Dark */}
                <div className="w-full lg:w-1/2 bg-[#0C0C0C] flex flex-col justify-center px-6 lg:px-20 py-32 lg:py-20 relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-yellow-400/10 blur-[120px] rounded-full"></div>
                    <div className="absolute top-1/2 -right-24 w-64 h-64 bg-yellow-400/5 blur-[100px] rounded-full"></div>

                    <div className="max-w-xl relative z-10">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md text-yellow-400/90 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-10 animate-fade-in">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
                            </span>
                            Africa's Premier Writing Platform
                        </div>

                        {/* Headline - Decreased size */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6 tracking-tight">
                            Where African
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500">
                                Creativity
                            </span>
                            <br />
                            Thrives.
                        </h1>

                        {/* Subheadline - Decreased size */}
                        <p className="text-base md:text-lg text-stone-400 mb-10 max-w-md leading-relaxed">
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
                                className="inline-flex items-center gap-3 bg-white/5 border border-white/10 text-white text-sm font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                            >
                                Start Writing
                            </button>
                        </div>

                        {/* Stats - Decreased size */}
                        <div className="grid grid-cols-3 gap-6 border-t border-white/5 pt-10">
                            <div className="group">
                                <div className="text-2xl font-black text-white group-hover:text-yellow-400 transition-colors">10K+</div>
                                <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mt-1">Writers</div>
                            </div>
                            <div className="group">
                                <div className="text-2xl font-black text-white group-hover:text-yellow-400 transition-colors">50K+</div>
                                <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mt-1">Stories</div>
                            </div>
                            <div className="group">
                                <div className="text-2xl font-black text-white group-hover:text-yellow-400 transition-colors">1M+</div>
                                <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mt-1">Readers</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Image */}
                <div className="hidden lg:block w-1/2 relative overflow-hidden">
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

                    {/* Floating Card - Minimalist Redesign */}
                    <div className="absolute bottom-12 left-12 group">
                        <div className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-4 pl-4 pr-12 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] flex items-center gap-6 transform hover:-translate-y-2 transition-all duration-500 cursor-default">
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
                        </div>
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
                    <div className="relative w-full max-w-xl bg-white rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 ease-out">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-6 right-6 p-2 text-stone-400 hover:text-stone-900 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="px-8 pt-16 pb-12 sm:px-16 text-center">
                            {authView === 'signin' ? (
                                <>
                                    <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 mb-12">Welcome back.</h2>

                                    <div className="space-y-3">
                                        <AuthButton icon="google" label="Sign in with Google" />
                                        <AuthButton icon="facebook" label="Sign in with Facebook" />
                                        <AuthButton icon="apple" label="Sign in with Apple" />
                                        <AuthButton icon="x" label="Sign in with X" />
                                        <AuthButton icon="email" label="Sign in with email" />
                                    </div>

                                    <div className="mt-12 text-sm">
                                        <p className="text-stone-600 font-medium">
                                            No account? <button onClick={() => setAuthView('signup-email')} className="text-stone-900 font-bold hover:underline">Create one</button>
                                        </p>
                                        <p className="text-stone-600 font-medium mt-4">
                                            Forgot email or trouble signing in? <button className="text-stone-900 font-bold hover:underline">Get help.</button>
                                        </p>
                                    </div>

                                    <div className="mt-12 text-[10px] text-stone-400 leading-relaxed max-w-xs mx-auto">
                                        By clicking "Sign in", you accept Pennit's <button className="underline">Terms of Service</button> and <button className="underline">Privacy Policy</button>.
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Sign up with email view */}
                                    <div className="flex justify-center mb-8">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-stone-900">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                        </svg>
                                    </div>

                                    <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 mb-12">Sign up with email</h2>

                                    <div className="max-w-sm mx-auto text-left">
                                        <label className="block text-sm font-medium text-stone-700 mb-2">Your email</label>
                                        <input
                                            type="email"
                                            placeholder="Enter your email address"
                                            className="w-full px-4 py-3 border border-stone-300 rounded-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all placeholder:text-stone-400"
                                        />

                                        <button className="w-full mt-8 bg-stone-900 text-white font-bold py-4 rounded-full hover:bg-stone-800 transition-all">
                                            Create account
                                        </button>
                                    </div>

                                    <div className="mt-12 space-y-4">
                                        <button
                                            onClick={() => setAuthView('signin')}
                                            className="text-stone-600 font-medium hover:text-stone-900 transition-colors"
                                        >
                                            Back to sign up options
                                        </button>

                                        <p className="text-stone-600 font-medium">
                                            Already have an account? <button onClick={() => setAuthView('signin')} className="text-stone-900 font-bold hover:underline">Sign in</button>
                                        </p>
                                    </div>

                                    <div className="mt-12 text-[10px] text-stone-400 leading-relaxed max-w-xs mx-auto">
                                        By clicking "Create Account", you accept Pennit's <button className="underline">Terms of Service</button> and <button className="underline">Privacy Policy</button>.
                                        <br />
                                        This site uses reCAPTCHA and the Google <button className="underline">Privacy Policy</button> and <button className="underline">Terms of Service</button> apply.
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

function AuthButton({ icon, label }) {
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
        <button className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-stone-200 rounded-none hover:bg-stone-50 transition-all duration-200 group">
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
