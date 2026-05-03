/**
 * Cloud Function: submitDigestSubscription
 *
 * Replaces direct client writes to /digestSubscriptions so anonymous
 * buyers don't need read or update permission on subscription docs.
 * Mirrors the submitWave pattern:
 *   - Per-IP rate limit (prevents one bad actor)
 *   - Per agent+email rate limit (prevents accidental spam)
 *   - Server-side upsert via admin SDK (deterministic doc id reuses)
 *
 * Deploy:
 *   firebase deploy --only functions:submitDigestSubscription
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import * as crypto from 'crypto'

if (!admin.apps.length) admin.initializeApp()

const PER_IP_LIMIT = 20
const PER_IP_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const PER_AGENT_EMAIL_LIMIT = 5
const PER_AGENT_EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

interface SubmitDigestData {
  agentId?: string
  email?: string
  source?: 'profile' | 'listing' | 'reels'
}

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

function makeUnsubToken(): string {
  return crypto.randomBytes(24).toString('hex')
}

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
        'Too many subscription attempts. Try again later.',
      )
    }
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) })
  })
}

export const submitDigestSubscription = onCall<SubmitDigestData>(
  { region: 'us-central1', maxInstances: 20, timeoutSeconds: 30, cors: true },
  async (request) => {
    const { agentId, email, source } = request.data ?? {}

    // ── Validation ──
    if (!agentId || typeof agentId !== 'string') {
      throw new HttpsError('invalid-argument', 'agentId is required.')
    }
    const cleanEmail = (email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new HttpsError('invalid-argument', 'Valid email is required.')
    }
    const cleanSource = source === 'listing' || source === 'reels' ? source : 'profile'

    // ── Verify the agent exists (don't subscribe to ghosts) ──
    const agentSnap = await admin.firestore().collection('users').doc(agentId).get()
    if (!agentSnap.exists) {
      throw new HttpsError('not-found', 'Agent does not exist.')
    }

    // ── Rate limits ──
    const ip = (request.rawRequest?.ip || 'unknown').replace(/[^a-zA-Z0-9.:_-]/g, '_')
    await checkRateLimit(`digest_ip_${ip}`, PER_IP_LIMIT, PER_IP_WINDOW_MS)

    const emailHash = hashEmail(cleanEmail)
    await checkRateLimit(
      `digest_agent_${agentId}_email_${emailHash}`,
      PER_AGENT_EMAIL_LIMIT,
      PER_AGENT_EMAIL_WINDOW_MS,
    )

    // ── Upsert via admin SDK ──
    const dedupId = `${agentId}_${emailHash}`
    const ref = admin.firestore().collection('digestSubscriptions').doc(dedupId)
    const existing = await ref.get()

    if (existing.exists) {
      const data = existing.data() as { status?: string }
      // Re-activate if previously unsubscribed; otherwise just touch updatedAt.
      const patch: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
      if (data.status === 'unsubscribed') {
        patch.status = 'active'
      }
      await ref.update(patch)
      logger.info('[submitDigestSubscription] re-touch', {
        agentId,
        emailHash,
        reactivated: data.status === 'unsubscribed',
      })
      return { ok: true, subId: dedupId, alreadyExisted: true }
    }

    await ref.set({
      agentId,
      email: cleanEmail,
      emailHash,
      source: cleanSource,
      status: 'active',
      unsubToken: makeUnsubToken(),
      newListings: true,
      newReels: true,
      statusChanges: true,
      lastSentAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    logger.info('[submitDigestSubscription] created', { agentId, emailHash, ip })

    return { ok: true, subId: dedupId, alreadyExisted: false }
  },
)
