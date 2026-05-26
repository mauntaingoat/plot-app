/**
 * Stripe integration — individual Pro subscription only (no team
 * billing wired yet; org plan will plug in here later by reusing
 * the same customer+subscription primitives keyed on org id
 * instead of user uid).
 *
 * Three functions:
 *   - createCheckoutSession (callable): mints a Stripe Checkout URL
 *     for the signed-in user to upgrade to Pro. Reuses the user's
 *     existing stripeCustomerId or creates a fresh customer.
 *   - createBillingPortalSession (callable): mints a Stripe Billing
 *     Portal URL so Pro users can update card / cancel / view
 *     invoices without leaving the brand. Stripe-hosted.
 *   - stripeWebhook (HTTP, raw body): the source of truth for
 *     tier sync. Verifies signature, handles checkout completion,
 *     subscription updates, and cancellations, and writes
 *     user.tier + user.stripeSubscriptionId + user.subscriptionStatus
 *     atomically so the rest of the app sees a single coherent state.
 *
 * Tier-sync rules:
 *   - tier flips to 'pro' when subscription becomes active/trialing
 *   - tier flips to 'free' when subscription transitions to
 *     canceled / unpaid / incomplete_expired
 *   - past_due / incomplete are GRACE states — tier stays pro until
 *     Stripe finalizes the cancel
 *   - Users without a stripeSubscriptionId are NEVER touched by the
 *     webhook, so admin-granted Pro stays safe
 *
 * Type note: the Stripe v22 CJS package exposes types in a way that
 * doesn't play well with our tsconfig (module: commonjs + esModuleInterop).
 * We use the SDK as a value and cast event payloads as needed —
 * runtime shapes are stable, and the webhook signature verification
 * already guarantees we're working with real Stripe payloads.
 *
 * Setup (post-deploy, see commit message for full walkthrough):
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 *   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 *   firebase functions:params:set STRIPE_PRO_PRICE_ID "price_xxx"
 */
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require('stripe')

if (!admin.apps.length) admin.initializeApp()

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')
const STRIPE_PRO_PRICE_ID = defineString('STRIPE_PRO_PRICE_ID', {
  description: 'Stripe Price ID for the individual Pro subscription ($29.99/mo).',
})

// Canonical app origin used for Stripe return URLs. www subdomain
// is canonical (see project memory) and works reliably; apex still
// has an open HTTP/3 ALPN issue at the Fastly edge.
const PUBLIC_ORIGIN = 'https://www.reel.st'

// Lazy-init Stripe client — defineSecret().value() can only be
// called from inside a function execution.
type StripeClient = {
  customers: {
    create: (params: Record<string, unknown>) => Promise<{ id: string }>
    retrieve: (id: string) => Promise<{ id: string; deleted?: boolean; metadata?: Record<string, string> }>
  }
  checkout: {
    sessions: {
      create: (params: Record<string, unknown>) => Promise<{ id: string; url: string | null }>
    }
  }
  billingPortal: {
    sessions: {
      create: (params: Record<string, unknown>) => Promise<{ url: string }>
    }
  }
  webhooks: {
    constructEvent: (payload: Buffer, sig: string, secret: string) => StripeEvent
  }
}

interface StripeEvent {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

let _stripe: StripeClient | null = null
function getStripe(): StripeClient {
  if (!_stripe) {
    _stripe = new Stripe(STRIPE_SECRET_KEY.value(), {
      // Pin API version so a Stripe-side API rev doesn't silently
      // change request/response shapes between deploys.
      apiVersion: '2024-06-20',
      typescript: true,
      appInfo: { name: 'Reelst', version: '1.0.0' },
    }) as StripeClient
  }
  return _stripe
}

// ──────────────────────────────────────────────────────────────────
// createCheckoutSession — caller upgrades to Pro
// ──────────────────────────────────────────────────────────────────
export const createCheckoutSession = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required.')
    const uid = req.auth.uid
    const userRef = admin.firestore().doc(`users/${uid}`)
    const userSnap = await userRef.get()
    if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.')
    const user = userSnap.data() as {
      email: string
      displayName?: string
      tier?: string
      stripeCustomerId?: string
      stripeSubscriptionId?: string
    }
    if (user.tier === 'pro' && user.stripeSubscriptionId) {
      throw new HttpsError('failed-precondition', 'You already have an active Pro subscription.')
    }
    if (!user.email) {
      throw new HttpsError('failed-precondition', 'No email on file — verify your email first.')
    }

    const stripe = getStripe()

    // Reuse customer if we've created one before. Validate the
    // customer wasn't deleted out-of-band from the Stripe dashboard.
    let customerId = user.stripeCustomerId
    if (customerId) {
      try {
        const c = await stripe.customers.retrieve(customerId)
        if (c.deleted) customerId = undefined
      } catch {
        customerId = undefined
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName,
        // firebaseUid is the bridge — checkout completion AND future
        // subscription events look this up to find the user doc.
        metadata: { firebaseUid: uid },
      })
      customerId = customer.id
      await userRef.update({ stripeCustomerId: customerId })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: STRIPE_PRO_PRICE_ID.value(),
          quantity: 1,
        },
      ],
      // ?checkout=success/canceled query params let the dashboard
      // show a toast after the return without a dedicated route.
      success_url: `${PUBLIC_ORIGIN}/dashboard?checkout=success`,
      cancel_url: `${PUBLIC_ORIGIN}/dashboard?checkout=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: { firebaseUid: uid },
      },
      client_reference_id: uid,
    })

    if (!session.url) {
      throw new HttpsError('internal', 'Checkout session created but no URL returned.')
    }
    return { ok: true, url: session.url }
  }
)

// ──────────────────────────────────────────────────────────────────
// createBillingPortalSession — Pro users manage their sub
// ──────────────────────────────────────────────────────────────────
export const createBillingPortalSession = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required.')
    const uid = req.auth.uid
    const userSnap = await admin.firestore().doc(`users/${uid}`).get()
    if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.')
    const user = userSnap.data() as { stripeCustomerId?: string }
    if (!user.stripeCustomerId) {
      throw new HttpsError('failed-precondition', 'No Stripe customer on file. You may not have an active subscription.')
    }

    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${PUBLIC_ORIGIN}/dashboard?tab=settings`,
    })
    return { ok: true, url: session.url }
  }
)

// ──────────────────────────────────────────────────────────────────
// stripeWebhook — source of truth for tier sync
//
// HTTP function (NOT callable) because Stripe needs the raw request
// body to verify the HMAC signature. Firebase Functions v2 exposes
// req.rawBody on onRequest handlers.
// ──────────────────────────────────────────────────────────────────
export const stripeWebhook = onRequest(
  {
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
    timeoutSeconds: 30,
  },
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    if (!sig || typeof sig !== 'string') {
      res.status(400).send('Missing stripe-signature header')
      return
    }

    const stripe = getStripe()
    let event: StripeEvent
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value()
      )
    } catch (err) {
      const message = (err as Error).message
      logger.error('Stripe webhook signature verification failed', { message })
      res.status(400).send(`Webhook Error: ${message}`)
      return
    }

    try {
      await handleStripeEvent(event)
      res.status(200).send('ok')
    } catch (err) {
      logger.error('Stripe webhook handler error', { type: event.type, error: err })
      // 500 makes Stripe retry — desirable for transient Firestore
      // failures, dangerous if our handler logic is buggy in a way
      // that fails every attempt. Monitor the dashboard.
      res.status(500).send('Internal error')
    }
  }
)

async function handleStripeEvent(event: StripeEvent): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as {
        id: string
        customer: string | null
        subscription: string | null
        client_reference_id: string | null
        metadata?: Record<string, string>
      }
      const uid = await resolveUidFromSession(session)
      if (!uid) {
        logger.warn('checkout.session.completed: no uid resolvable', { sessionId: session.id })
        return
      }
      const updates: Record<string, unknown> = {
        tier: 'pro',
        stripeCustomerId: session.customer,
        subscriptionStatus: 'active',
      }
      if (session.subscription) updates.stripeSubscriptionId = session.subscription
      await admin.firestore().doc(`users/${uid}`).update(updates)
      logger.info('Pro activated', { uid, customer: session.customer, subscription: session.subscription })
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as {
        id: string
        customer: string
        status: string
        metadata?: Record<string, string>
      }
      const uid = await resolveUidFromSubscription(sub)
      if (!uid) {
        logger.warn('subscription event: no uid resolvable', { subId: sub.id, type: event.type })
        return
      }
      const updates = subscriptionStatusUpdates(sub.status)
      if (event.type === 'customer.subscription.deleted') {
        updates.tier = 'free'
        updates.subscriptionStatus = 'canceled'
        updates.stripeSubscriptionId = admin.firestore.FieldValue.delete()
      }
      await admin.firestore().doc(`users/${uid}`).update(updates)
      logger.info('Subscription synced', { uid, status: sub.status, type: event.type })
      break
    }

    case 'invoice.payment_failed': {
      // Grace state — don't flip tier here. Stripe will fire
      // customer.subscription.updated once it decides whether to
      // retry or cancel.
      logger.info('invoice.payment_failed observed (no-op)')
      break
    }

    default:
      // We don't care about most Stripe events. Logging the type
      // helps confirm webhook delivery is healthy during initial
      // setup; remove the log if it gets noisy.
      logger.debug('Unhandled Stripe event type', { type: event.type })
  }
}

function subscriptionStatusUpdates(status: string): Record<string, unknown> {
  const updates: Record<string, unknown> = { subscriptionStatus: status }
  if (status === 'active' || status === 'trialing') {
    updates.tier = 'pro'
  } else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
    updates.tier = 'free'
    updates.stripeSubscriptionId = admin.firestore.FieldValue.delete()
  }
  // 'past_due' / 'incomplete' fall through — tier stays whatever it was.
  return updates
}

async function resolveUidFromSession(session: {
  customer: string | null
  client_reference_id: string | null
  metadata?: Record<string, string>
}): Promise<string | null> {
  // Preferred: client_reference_id (set to uid at session creation).
  if (session.client_reference_id) return session.client_reference_id
  if (session.metadata?.firebaseUid) return session.metadata.firebaseUid
  // Fallback: pull customer and read its metadata.
  if (session.customer) {
    const stripe = getStripe()
    const customer = await stripe.customers.retrieve(session.customer)
    if (!customer.deleted) return customer.metadata?.firebaseUid || null
  }
  return null
}

async function resolveUidFromSubscription(sub: {
  id: string
  customer: string
  metadata?: Record<string, string>
}): Promise<string | null> {
  // Preferred: subscription metadata (set at checkout).
  if (sub.metadata?.firebaseUid) return sub.metadata.firebaseUid
  // Fallback: query users by stripeSubscriptionId.
  const q = await admin.firestore()
    .collection('users')
    .where('stripeSubscriptionId', '==', sub.id)
    .limit(1)
    .get()
  if (!q.empty) return q.docs[0].id
  // Last resort: customer metadata.
  if (sub.customer) {
    const stripe = getStripe()
    const customer = await stripe.customers.retrieve(sub.customer)
    if (!customer.deleted) return customer.metadata?.firebaseUid || null
  }
  return null
}
