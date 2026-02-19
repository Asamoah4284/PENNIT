/**
 * Payment provider abstraction for GHC subscriptions and payouts.
 * Implement createSubscription, cancelSubscription, handleWebhook; payouts in Phase 7.
 * Replace with Paystack/Flutterwave adapter when ready.
 */

/**
 * Create a subscription checkout session.
 * @param {Object} opts - { userId, planId, amountGhc, returnUrl, cancelUrl }
 * @returns {Promise<{ checkoutUrl: string, externalSubscriptionId?: string }>}
 */
export async function createSubscription(opts) {
  // Stub: no real provider. When MONETIZATION_ENABLED and provider configured, redirect to provider URL.
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  return {
    checkoutUrl: `${baseUrl}/pricing?checkout=pending`,
    externalSubscriptionId: `stub_${Date.now()}`,
  }
}

/**
 * Cancel a subscription by external ID.
 * @param {string} externalSubscriptionId
 * @returns {Promise<{ canceled: boolean }>}
 */
export async function cancelSubscription(externalSubscriptionId) {
  return { canceled: true }
}

/**
 * Verify and process webhook payload from payment provider.
 * @param {import('express').Request} req - Raw body may be needed for signature verification
 * @returns {Promise<{ handled: boolean, subscriptionId?: string, paymentId?: string, status?: string }>}
 */
export async function handleWebhook(req) {
  // Stub: no real webhook. When provider is configured, verify signature and update Subscription + SubscriptionPayment.
  return { handled: false }
}

/**
 * Transfer payout to writer (bank or mobile money).
 * @param {Object} opts - { authorId, amountGhc, payoutMethod: { type, bankCode?, accountNumber?, accountName?, mobileMoneyNumber?, mobileMoneyProvider? } }
 * @returns {Promise<{ success: boolean, reference?: string, failureReason?: string }>}
 */
export async function transferPayout(opts) {
  // Stub: no real transfer. When provider is configured, call Paystack/Flutterwave transfer API.
  return {
    success: true,
    reference: `payout_${Date.now()}`,
  }
}
