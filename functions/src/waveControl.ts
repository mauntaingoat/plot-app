/**
 * Cloud Function: submitWave
 *
 * Replaces direct client writes to /pins/{pinId}/waves so we can:
 *   1. Rate-limit anonymous wave creation (preventing inbox spam)
 *   2. Validate the pin actually exists + is owned by the claimed agent
 *   3. Strip / normalize submitted fields server-side
 *
 * Two rate-limit gates:
 *   - Per-IP: 10 waves / rolling hour (prevents one bad actor)
 *   - Per pinId+emailHash: 3 waves / day (prevents one buyer
 *     repeatedly waving at the same listing)
 *
 * The Firestore rule on /pins/{pinId}/waves is tightened so client
 * creates are blocked — only the admin SDK (this function) can write.
 *
 * Deploy:
 *   firebase deploy --only functions:submitWave
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

interface SubmitWaveData {
  pinId?: string
  visitorName?: string
  visitorEmail?: string
  visitorPhone?: string | null
  question?: string
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
        'Too many waves recently. Try again in a bit.',
      )
    }
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) })
  })
}

export const submitWave = onCall<SubmitWaveData>(
  { region: 'us-central1', maxInstances: 20, timeoutSeconds: 30 },
  async (request) => {
    const { pinId, visitorName, visitorEmail, visitorPhone, question } = request.data ?? {}

    // ── Validation ──
    if (!pinId || typeof pinId !== 'string') {
      throw new HttpsError('invalid-argument', 'pinId is required.')
    }
    const name = (visitorName || '').trim()
    const email = (visitorEmail || '').trim().toLowerCase()
    const text = (question || '').trim()
    if (!name) throw new HttpsError('invalid-argument', 'Name is required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError('invalid-argument', 'Valid email is required.')
    }
    if (text.length < 4) throw new HttpsError('invalid-argument', 'Question is too short.')
    if (text.length > 1000) throw new HttpsError('invalid-argument', 'Question is too long.')

    // ── Rate limits (defense in depth) ──
    const ip = (request.rawRequest?.ip || 'unknown').replace(/[^a-zA-Z0-9.:_-]/g, '_')
    await checkRateLimit(`wave_ip_${ip}`, PER_IP_LIMIT, PER_IP_WINDOW_MS)

    const emailHash = hashEmail(email)
    await checkRateLimit(
      `wave_pin_${pinId}_email_${emailHash}`,
      PER_PIN_EMAIL_LIMIT,
      PER_PIN_EMAIL_WINDOW_MS,
    )

    // ── Fetch the pin to get agentId + canonical address ──
    const pinSnap = await admin.firestore().collection('pins').doc(pinId).get()
    if (!pinSnap.exists) {
      throw new HttpsError('not-found', 'Pin does not exist.')
    }
    const pin = pinSnap.data() as { agentId?: string; address?: string; status?: string; unit?: string | null }
    if (!pin.agentId) {
      throw new HttpsError('failed-precondition', 'Pin is missing agent.')
    }
    if (pin.status === 'archived') {
      throw new HttpsError('failed-precondition', 'This listing is no longer accepting waves.')
    }

    // ── Write the wave doc via admin SDK (bypasses client-blocking rule) ──
    const ref = await admin
      .firestore()
      .collection('pins')
      .doc(pinId)
      .collection('waves')
      .add({
        pinId,
        agentId: pin.agentId,
        pinAddress: pin.address || '',
        visitorName: name,
        visitorEmail: email,
        visitorPhone: (visitorPhone || '').trim() || null,
        question: text,
        read: false,
        status: 'new',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

    logger.info('[submitWave] created', {
      pinId,
      waveId: ref.id,
      agentId: pin.agentId,
      ip,
    })

    return { ok: true, waveId: ref.id }
  },
)
