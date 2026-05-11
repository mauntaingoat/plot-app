/**
 * Cloud Function: submitShowingRequest
 *
 * Replaces direct client writes to /showing_requests so we can:
 *   1. Rate-limit anonymous showing-request creation (prevents inbox spam)
 *   2. Validate the pin exists + isn't archived + isn't a spotlight
 *   3. Strip / normalize submitted fields server-side
 *
 * Two rate-limit gates (mirror submitWave):
 *   - Per-IP: 10 requests / rolling hour
 *   - Per pinId+emailHash: 3 requests / day
 *
 * The Firestore rule on /showing_requests is tightened so client
 * creates are blocked — only the admin SDK (this function) can write.
 *
 * Deploy:
 *   firebase deploy --only functions:submitShowingRequest
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import * as crypto from 'crypto'

if (!admin.apps.length) admin.initializeApp()

const PER_IP_LIMIT = 10
const PER_IP_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const PER_PIN_EMAIL_LIMIT = 3
const PER_PIN_EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

interface SubmitShowingRequestData {
  pinId?: string
  visitorName?: string
  visitorEmail?: string
  visitorPhone?: string
  preferredDate?: string
  preferredTime?: string
  note?: string
}

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
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
        'Too many showing requests recently. Try again in a bit.',
      )
    }
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) })
  })
}

export const submitShowingRequest = onCall<SubmitShowingRequestData>(
  { region: 'us-central1', maxInstances: 20, timeoutSeconds: 30, cors: true },
  async (request) => {
    const {
      pinId,
      visitorName,
      visitorEmail,
      visitorPhone,
      preferredDate,
      preferredTime,
      note,
    } = request.data ?? {}

    // ── Validation ──
    if (!pinId || typeof pinId !== 'string') {
      throw new HttpsError('invalid-argument', 'pinId is required.')
    }
    const name = (visitorName || '').trim()
    const email = (visitorEmail || '').trim().toLowerCase()
    const phone = (visitorPhone || '').trim()
    const date = (preferredDate || '').trim()
    const time = (preferredTime || '').trim()
    const text = (note || '').trim()

    if (!name) throw new HttpsError('invalid-argument', 'Name is required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError('invalid-argument', 'Valid email is required.')
    }
    if (!phone) throw new HttpsError('invalid-argument', 'Phone is required.')
    // Date/time are optional in the form (buyer may not specify), but if
    // present they should look reasonable. Loose checks — exact format
    // is enforced client-side via input types.
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpsError('invalid-argument', 'Invalid preferred date.')
    }
    if (time && !/^\d{2}:\d{2}$/.test(time)) {
      throw new HttpsError('invalid-argument', 'Invalid preferred time.')
    }
    if (text.length > 1000) {
      throw new HttpsError('invalid-argument', 'Note is too long.')
    }

    // ── Rate limits (defense in depth) ──
    const ip = (request.rawRequest?.ip || 'unknown').replace(/[^a-zA-Z0-9.:_-]/g, '_')
    await checkRateLimit(`showing_ip_${ip}`, PER_IP_LIMIT, PER_IP_WINDOW_MS)
    await checkRateLimit(
      `showing_pin_${pinId}_email_${hashEmail(email)}`,
      PER_PIN_EMAIL_LIMIT,
      PER_PIN_EMAIL_WINDOW_MS,
    )

    // ── Resolve pin + agent context ──
    const pinSnap = await admin.firestore().collection('pins').doc(pinId).get()
    if (!pinSnap.exists) {
      throw new HttpsError('not-found', 'Listing does not exist.')
    }
    const pin = pinSnap.data() as { agentId?: string; address?: string; type?: string; status?: string }
    if (!pin.agentId) {
      throw new HttpsError('failed-precondition', 'Listing is missing agent.')
    }
    if (pin.type === 'spotlight') {
      throw new HttpsError('failed-precondition', 'Spotlights do not accept showing requests.')
    }
    if (pin.status === 'archived') {
      throw new HttpsError('failed-precondition', 'This listing is no longer accepting requests.')
    }

    // ── Write the showing-request doc via admin SDK ──
    // Shape matches the existing client-side write in lib/firestore.ts so
    // the dashboard inbox + onNewShowingRequest notification trigger keep
    // working unchanged.
    const ref = await admin
      .firestore()
      .collection('showing_requests')
      .add({
        agentId: pin.agentId,
        pinId,
        pinAddress: pin.address || '',
        visitorName: name,
        visitorEmail: email,
        visitorPhone: phone,
        preferredDate: date,
        preferredTime: time,
        note: text,
        status: 'new',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

    logger.info('[submitShowingRequest] created', {
      pinId,
      requestId: ref.id,
      agentId: pin.agentId,
      ip,
    })

    return { ok: true, requestId: ref.id }
  },
)
