/**
 * useStripe — frontend wrapper around the Stripe callable functions.
 *
 * Two flows:
 *   - upgradeToPro(): mints a Checkout Session and redirects the
 *     browser to it. After successful payment the user lands back
 *     at /dashboard?checkout=success and the webhook flips their
 *     tier to 'pro' (eventually consistent; the redirect happens
 *     before the webhook fires, so the dashboard might briefly
 *     show 'Free' on the success return — refresh resolves it).
 *   - openBillingPortal(): mints a Billing Portal session and
 *     redirects to Stripe-hosted UI for card / cancel / invoices.
 *
 * Both functions throw on failure with a user-friendly message in
 * `error` state. Callers should disable their button while
 * `loading` is true to prevent double-submit (which Stripe
 * idempotency would handle, but UX-wise we don't want).
 */
import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/config/firebase'

interface UseStripeResult {
  loading: boolean
  error: string | null
  upgradeToPro: () => Promise<void>
  openBillingPortal: () => Promise<void>
}

export function useStripe(): UseStripeResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upgradeToPro = async () => {
    setLoading(true)
    setError(null)
    try {
      const fn = httpsCallable<unknown, { ok: boolean; url: string }>(
        getFunctions(app ?? undefined),
        'createCheckoutSession'
      )
      const res = await fn({})
      if (!res.data?.url) throw new Error('No checkout URL returned.')
      // Hard redirect — Stripe Checkout is a separate origin.
      window.location.assign(res.data.url)
    } catch (e) {
      const err = e as { message?: string; details?: { message?: string } }
      setError(err?.details?.message || err?.message || 'Could not start checkout.')
      setLoading(false)
    }
    // Note: we intentionally don't set loading=false on success —
    // the page is about to unload anyway. Avoids a flicker.
  }

  const openBillingPortal = async () => {
    setLoading(true)
    setError(null)
    try {
      const fn = httpsCallable<unknown, { ok: boolean; url: string }>(
        getFunctions(app ?? undefined),
        'createBillingPortalSession'
      )
      const res = await fn({})
      if (!res.data?.url) throw new Error('No portal URL returned.')
      window.location.assign(res.data.url)
    } catch (e) {
      const err = e as { message?: string; details?: { message?: string } }
      setError(err?.details?.message || err?.message || 'Could not open billing portal.')
      setLoading(false)
    }
  }

  return { loading, error, upgradeToPro, openBillingPortal }
}
