/**
 * Cloud Functions: lookupDigestSubscriptions + updateDigestSubscription
 *
 * Power the public /u/:token unsubscribe page. The token in the
 * email is per-subscription; given any one of a recipient's tokens
 * we resolve their emailHash and surface ALL their active+inactive
 * subscriptions so they can toggle each on/off.
 *
 * Auth model: token-as-bearer. No login required (the recipient
 * doesn't have a Reelst account — they're a subscriber). The token
 * proves "I have access to this email's inbox," which is enough for
 * an unsub flow. Standard email-link security model.
 *
 * Both callables are anonymous-friendly. They each look up the
 * sub by `unsubToken` and verify the target sub shares the same
 * emailHash before doing anything destructive.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

// Per-IP rate limits — the unsub token is the only auth, so without
// these a bot could brute-force the search space to enumerate which
// emails are subscribed to which agents. Lookup is read-heavy
// (slightly tighter); update is the actual interaction (more
// generous so a legit user can toggle many subscriptions in one
// session). Same transactional Firestore pattern used elsewhere.
const LOOKUP_PER_HOUR = 20
const UPDATE_PER_HOUR = 60
const RATE_WINDOW_MS = 60 * 60 * 1000

interface RateLimitDoc {
  count: number
  windowStart: admin.firestore.Timestamp
}

async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  const ref = admin.firestore().collection('rateLimits').doc(key)
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const now = admin.firestore.Timestamp.now()
    if (!snap.exists) {
      tx.set(ref, { count: 1, windowStart: now } as RateLimitDoc)
      return
    }
    const data = snap.data() as RateLimitDoc
    const elapsed = now.toMillis() - data.windowStart.toMillis()
    if (elapsed >= windowMs) {
      tx.set(ref, { count: 1, windowStart: now } as RateLimitDoc)
      return
    }
    if (data.count >= limit) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many requests. Try again in a bit.',
      )
    }
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) })
  })
}

function ipKey(req: { rawRequest?: { ip?: string } }): string {
  return (req.rawRequest?.ip || 'unknown').replace(/[^a-zA-Z0-9.:_-]/g, '_')
}

interface AgentSummary {
  /** Firestore doc id of the digestSubscriptions doc — the page
   *  passes this back when toggling that specific sub. */
  subId: string
  agentId: string
  username: string
  displayName: string
  photoURL: string | null
  status: 'active' | 'unsubscribed'
  /** Millis epoch — page uses for "subscribed since" copy. */
  createdAt: number
  /** Where the recipient saved this agent (profile/listing/reels) —
   *  small contextual hint we already capture on the sub doc. */
  source: 'profile' | 'listing' | 'reels'
}

interface LookupResponse {
  /** Recipient email — shown in UI as a partial "saved as ma***@avigage.com"
   *  to confirm context without leaking the full address in shared screens. */
  email: string
  agents: AgentSummary[]
}

export const lookupDigestSubscriptions = onCall<{ token?: string }>(
  { region: 'us-central1', cors: true, maxInstances: 10, timeoutSeconds: 20 },
  async (req): Promise<LookupResponse> => {
    const token = (req.data?.token || '').trim()
    if (!token || token.length < 32) {
      throw new HttpsError('invalid-argument', 'Invalid token')
    }
    await checkRateLimit(`unsubLookup_ip_${ipKey(req)}`, LOOKUP_PER_HOUR, RATE_WINDOW_MS)
    const db = admin.firestore()

    const anchorSnap = await db
      .collection('digestSubscriptions')
      .where('unsubToken', '==', token)
      .limit(1)
      .get()
    if (anchorSnap.empty) {
      throw new HttpsError('not-found', 'Subscription not found')
    }
    const anchor = anchorSnap.docs[0].data()
    const emailHash = anchor.emailHash as string
    const email = anchor.email as string

    const allSnap = await db
      .collection('digestSubscriptions')
      .where('emailHash', '==', emailHash)
      .get()

    const agentIds = Array.from(new Set(allSnap.docs.map((d) => d.data().agentId as string)))
    const agentDocs = await Promise.all(
      agentIds.map((id) => db.collection('users').doc(id).get()),
    )
    const agentMap = new Map<string, FirebaseFirestore.DocumentData>()
    for (const d of agentDocs) {
      if (d.exists) agentMap.set(d.id, d.data() as FirebaseFirestore.DocumentData)
    }

    const agents: AgentSummary[] = []
    for (const d of allSnap.docs) {
      const sub = d.data()
      const agent = agentMap.get(sub.agentId)
      if (!agent) continue
      // Skip agents who lost verification or hide their public profile —
      // they shouldn't appear in the unsub list either.
      if (agent.role !== 'agent' || !agent.username) continue
      agents.push({
        subId: d.id,
        agentId: sub.agentId,
        username: agent.username,
        displayName: agent.displayName || agent.username,
        photoURL: agent.photoURL || null,
        status: (sub.status as AgentSummary['status']) || 'active',
        createdAt: sub.createdAt?.toMillis?.() ?? 0,
        source: (sub.source as AgentSummary['source']) || 'profile',
      })
    }

    // Active first, then by recency.
    agents.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      return b.createdAt - a.createdAt
    })

    return { email, agents }
  },
)

export const updateDigestSubscription = onCall<{
  token?: string
  subId?: string
  status?: 'active' | 'unsubscribed'
}>(
  { region: 'us-central1', cors: true, maxInstances: 20, timeoutSeconds: 15 },
  async (req): Promise<{ ok: true }> => {
    const { token, subId, status } = req.data || {}
    if (!token || !subId) {
      throw new HttpsError('invalid-argument', 'Missing fields')
    }
    if (status !== 'active' && status !== 'unsubscribed') {
      throw new HttpsError('invalid-argument', 'Invalid status')
    }
    await checkRateLimit(`unsubUpdate_ip_${ipKey(req)}`, UPDATE_PER_HOUR, RATE_WINDOW_MS)
    const db = admin.firestore()

    // Resolve token → emailHash anchor
    const anchorSnap = await db
      .collection('digestSubscriptions')
      .where('unsubToken', '==', token)
      .limit(1)
      .get()
    if (anchorSnap.empty) {
      throw new HttpsError('not-found', 'Token not found')
    }
    const anchorEmailHash = anchorSnap.docs[0].data().emailHash as string

    // Verify target sub shares the same emailHash (prevents using
    // alice's token to unsubscribe bob).
    const targetRef = db.collection('digestSubscriptions').doc(subId)
    const targetSnap = await targetRef.get()
    if (!targetSnap.exists) {
      throw new HttpsError('not-found', 'Subscription not found')
    }
    if (targetSnap.data()?.emailHash !== anchorEmailHash) {
      throw new HttpsError('permission-denied', 'Token does not match this subscription')
    }

    const patch: Record<string, unknown> = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    if (status === 'unsubscribed') {
      patch.unsubscribedAt = admin.firestore.FieldValue.serverTimestamp()
    }
    await targetRef.update(patch)

    logger.info('[updateDigestSubscription] ok', { subId, status })
    return { ok: true }
  },
)
