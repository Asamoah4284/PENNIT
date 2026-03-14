import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useConfig } from '../contexts/ConfigContext'
import { getUser } from '../lib/auth'
import { getSubscriptionPlans, getMySubscription, createSubscriptionCheckout } from '../lib/api'

export default function PricingPage() {
  const { monetizationEnabled } = useConfig()
  const user = getUser()
  const [plans, setPlans] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getSubscriptionPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setSubscription(null)
      return
    }
    getMySubscription(user.id)
      .then((data) => setSubscription(data.subscription))
      .catch(() => setSubscription(null))
  }, [user?.id])

  const handleSubscribe = async (planId) => {
    if (!user?.id) {
      setError('Please sign in to subscribe.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { checkoutUrl } = await createSubscriptionCheckout(user.id, { planId })
      if (checkoutUrl) window.location.href = checkoutUrl
    } catch (e) {
      setError(e.message || 'Could not start checkout.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!monetizationEnabled) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-stone-900 mb-4">Subscription</h1>
        <p className="text-stone-600 mb-6">
          Reader subscriptions will be available after launch. You’ll be able to subscribe monthly in Ghana Cedis (GHC) for full access to all content.
        </p>
        <Link to="/reader" className="text-yellow-600 font-medium hover:underline">
          ← Back to Discover
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 flex justify-center">
        <span className="text-stone-500">Loading plans…</span>
      </div>
    )
  }

  const readerPlan = plans.find((p) => p.planType === 'reader') || plans[0]
  const writerPlan = plans.find((p) => p.planType === 'writer') || plans[1]

  const benefits = [
    { label: 'Full access to all stories and featured content', highlight: true },
    { label: 'Unlock Editor’s Picks and early-access pieces', highlight: true },
    { label: 'Save your favourite pieces and revisit anytime' },
    { label: 'Create playlists to organise stories, poems & novels' },
    { label: '14-day free trial — no charge until you choose a plan' },
    { label: 'Subscriber badge on your profile and comments' },
    { label: 'Tip writers (Reader plan) to support the creators you love' },
  ]

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Subscribe</h1>
      <p className="text-stone-600 mb-2">Monthly plans in Ghana Cedis (GHC). New accounts get a 14-day free trial of subscriber features.</p>
      <p className="text-stone-500 text-sm mb-8">After the trial, choose a plan to keep full access, save pieces, use playlists, and (Reader only) tip writers.</p>

      {/* Subscriber benefits — treasure-style gold highlight */}
      <div className="mb-10 p-6 rounded-2xl bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200/80 border-2 border-amber-400/60 shadow-lg shadow-amber-200/40 relative overflow-hidden">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-300/10 to-transparent pointer-events-none" aria-hidden />
        <div className="relative">
          <h2 className="text-lg font-bold text-amber-900 mb-1">What you get as a subscriber</h2>
          <p className="text-sm text-amber-800/90 mb-4">One subscription unlocks everything below — your treasure.</p>
          <ul className="space-y-3">
            {benefits.map((item, i) => (
              <li key={i} className={`flex items-start gap-3 text-sm ${item.highlight ? 'text-amber-900 font-semibold' : 'text-amber-800/90'}`}>
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center mt-0.5 shadow-sm" aria-hidden>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-800 text-sm">
          {error}
        </div>
      )}

      {subscription && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-green-800 text-sm">
          You have an active subscription until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {readerPlan && (
          <div className="p-6 rounded-2xl border-2 border-stone-900 bg-white shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Reader</h2>
            <p className="mt-2 text-2xl font-bold text-stone-900">GH₵ {Number(readerPlan.amountGhc).toFixed(2)}<span className="text-base font-normal text-stone-500">/month</span></p>
            <p className="mt-1 text-xs text-stone-500">All subscriber benefits + tip writers</p>
            <ul className="mt-3 text-sm text-stone-600 space-y-2">
              <li className="flex items-center gap-2"><span className="text-yellow-500">✓</span> Full access to all stories & featured pieces</li>
              <li className="flex items-center gap-2"><span className="text-yellow-500">✓</span> Save pieces & create playlists</li>
              <li className="flex items-center gap-2"><span className="text-yellow-500">✓</span> Tip writers (GH₵0.01–9.99)</li>
              <li className="flex items-center gap-2"><span className="text-yellow-500">✓</span> Subscriber badge on profile & comments</li>
            </ul>
            {!subscription && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubscribe(readerPlan.id)}
                className="mt-6 w-full py-3 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50"
              >
                {submitting ? 'Redirecting…' : 'Subscribe as Reader'}
              </button>
            )}
          </div>
        )}
        {writerPlan && (
          <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Writer</h2>
            <p className="mt-2 text-2xl font-bold text-stone-900">GH₵ {Number(writerPlan.amountGhc).toFixed(2)}<span className="text-base font-normal text-stone-500">/month</span></p>
            <p className="mt-1 text-xs text-stone-500">All subscriber benefits for writers</p>
            <ul className="mt-3 text-sm text-stone-600 space-y-2">
              <li className="flex items-center gap-2"><span className="text-yellow-500">✓</span> Read featured & Editor's Pick pieces</li>
              <li className="flex items-center gap-2"><span className="text-yellow-500">✓</span> Save pieces & create playlists</li>
              <li className="flex items-center gap-2"><span className="text-yellow-500">✓</span> Subscriber badge</li>
              <li className="flex items-center gap-2"><span className="text-stone-400">—</span> Tip writers (Reader plan only)</li>
            </ul>
            {!subscription && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubscribe(writerPlan.id)}
                className="mt-6 w-full py-3 rounded-lg border-2 border-stone-900 text-stone-900 font-medium hover:bg-stone-50 disabled:opacity-50"
              >
                {submitting ? 'Redirecting…' : 'Subscribe as Writer'}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-8 text-sm text-stone-500">
        <Link to="/reader" className="text-yellow-600 hover:underline">← Back to Discover</Link>
      </p>
    </div>
  )
}
