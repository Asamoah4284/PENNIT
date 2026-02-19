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

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Subscribe</h1>
      <p className="text-stone-600 mb-8">Monthly subscription in Ghana Cedis (GHC). Full access to all content.</p>

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
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="p-6 rounded-2xl border border-stone-200 bg-white shadow-sm"
          >
            <h2 className="text-lg font-semibold text-stone-900">{plan.name}</h2>
            <p className="mt-2 text-2xl font-bold text-stone-900">GH₵ {Number(plan.amountGhc).toFixed(2)}<span className="text-base font-normal text-stone-500">/month</span></p>
            <p className="mt-2 text-sm text-stone-500">Full access to all stories, poems, and novels.</p>
            {!subscription && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubscribe(plan.id)}
                className="mt-6 w-full py-3 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50"
              >
                {submitting ? 'Redirecting…' : 'Subscribe'}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-stone-500">
        <Link to="/reader" className="text-yellow-600 hover:underline">← Back to Discover</Link>
      </p>
    </div>
  )
}
