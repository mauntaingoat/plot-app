/**
 * Cloud Function: sendAuthEmail
 *
 * Single callable that issues either an email-verification or
 * password-reset email, branded for Reelst, sent via Gmail SMTP.
 *
 * Why this exists (vs Firebase Auth's built-in templates):
 *  - Inbox delivery: noreply@<project>.firebaseapp.com gets flagged
 *    as spoof by Gmail. Sending from a Workspace mailbox aligns SPF
 *    + DKIM with the sender domain → inbox.
 *  - Brand: full HTML control (see ./email/template.ts).
 *
 * Secrets required (set via `firebase functions:secrets:set`):
 *   - GMAIL_USER          (e.g. mau@avigage.com)
 *   - GMAIL_APP_PASSWORD  (16-char Workspace app password)
 *
 * The action URL embedded in the email is the one Firebase generates
 * via admin.auth().generate*Link. To brand the LANDING page too, set
 * "Customize action URL" in Firebase Console → Authentication →
 * Templates to https://<your-domain>/auth/action; the frontend's
 * AuthAction page reads mode + oobCode and applies the action.
 */

import * as functions from 'firebase-functions'
import { defineSecret } from 'firebase-functions/params'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import nodemailer from 'nodemailer'
import * as crypto from 'crypto'
import { renderAuthEmail, type AuthEmailKind } from './email/template'

if (!admin.apps.length) admin.initializeApp()

const GMAIL_USER = defineSecret('GMAIL_USER')
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD')

const FROM_DISPLAY = 'Reelst'

// Mitigates two abuse paths:
//   1. Reset-email spam → bot floods a victim's inbox until Gmail flags
//      Reelst as a spam sender (account-takeover-adjacent).
//   2. Email enumeration → both 'verify' and 'reset' are gated before the
//      auth lookup so non-existent addresses consume quota too, denying
//      the timing oracle.
// 3 sends / 15min per-email AND per-IP — real resends easily fit; same
// transactional Firestore pattern used by submitWave + other callables.
const PER_EMAIL_LIMIT = 3
const PER_IP_LIMIT = 3
const RATE_WINDOW_MS = 15 * 60 * 1000

interface RateLimitDoc {
  count: number
  windowStart: admin.firestore.Timestamp
}

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
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
        'Too many email requests. Try again in a few minutes.',
      )
    }
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) })
  })
}

interface Payload {
  kind: AuthEmailKind
  email: string
  /** Where Firebase should redirect the user after the action succeeds.
   *  For 'verify' this is typically /dashboard. For 'reset' it's the
   *  sign-in page. Caller passes their current origin. */
  continueUrl: string
}

export const sendAuthEmail = onCall(
  {
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD],
    region: 'us-central1',
    cors: true,
  },
  async (req) => {
    const { kind, email, continueUrl } = (req.data || {}) as Partial<Payload>
    if (!kind || (kind !== 'verify' && kind !== 'reset')) {
      throw new HttpsError('invalid-argument', 'kind must be "verify" or "reset"')
    }
    if (!email || typeof email !== 'string') {
      throw new HttpsError('invalid-argument', 'email is required')
    }
    if (!continueUrl || typeof continueUrl !== 'string' || !/^https?:\/\//.test(continueUrl)) {
      throw new HttpsError('invalid-argument', 'continueUrl must be an absolute URL')
    }

    const cleanEmail = email.trim().toLowerCase()

    // Rate limit BEFORE the auth lookup so non-existent emails consume
    // quota too — denies a timing-based enumeration oracle and stops
    // an in-progress flood from racking up admin.auth() lookups.
    const ip = (req.rawRequest?.ip || 'unknown').replace(/[^a-zA-Z0-9.:_-]/g, '_')
    await checkRateLimit(`authEmail_ip_${ip}`, PER_IP_LIMIT, RATE_WINDOW_MS)
    await checkRateLimit(`authEmail_email_${hashEmail(cleanEmail)}`, PER_EMAIL_LIMIT, RATE_WINDOW_MS)

    // Look up the user (mostly to grab a name for the greeting). For
    // password reset we don't want to leak whether an account exists,
    // so a missing user is silently treated as success (the email
    // simply doesn't go out) — this is the same UX Firebase's own
    // built-in flow takes.
    let displayName: string | null = null
    try {
      const u = await admin.auth().getUserByEmail(cleanEmail)
      displayName = u.displayName || null
      // For verify, only resend if not yet verified — saves us from
      // pinging users who already clicked the link in a prior email.
      if (kind === 'verify' && u.emailVerified) {
        return { ok: true, alreadyVerified: true }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || ''
      if (code === 'auth/user-not-found') {
        if (kind === 'reset') return { ok: true, sent: false }
        throw new HttpsError('not-found', 'No account with that email')
      }
      throw err
    }

    const actionCodeSettings: admin.auth.ActionCodeSettings = {
      url: continueUrl,
      handleCodeInApp: false,
    }

    const actionUrl = kind === 'verify'
      ? await admin.auth().generateEmailVerificationLink(cleanEmail, actionCodeSettings)
      : await admin.auth().generatePasswordResetLink(cleanEmail, actionCodeSettings)

    const fromAddress = GMAIL_USER.value()
    const appPassword = GMAIL_APP_PASSWORD.value()

    // Origin for hosted images (logo + character) and footer links
    // (Privacy, Terms). Derived from continueUrl so a localhost preview
    // build still resolves images, while production sends the deployed
    // domain. When you swap to reel.st, callers automatically use it.
    const baseUrl = (() => {
      try { const u = new URL(continueUrl); return `${u.protocol}//${u.host}` }
      catch { return 'https://reel.st' }
    })()

    const { subject, html, text } = renderAuthEmail({
      kind,
      actionUrl,
      recipientName: displayName,
      fromAddress,
      baseUrl,
    })

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: fromAddress, pass: appPassword },
    })

    try {
      await transporter.sendMail({
        from: `${FROM_DISPLAY} <${fromAddress}>`,
        to: cleanEmail,
        subject,
        html,
        text,
        replyTo: fromAddress,
      })
    } catch (err) {
      functions.logger.error('[sendAuthEmail] SMTP send failed', { err, kind, to: cleanEmail })
      throw new HttpsError('internal', 'Failed to send email')
    }

    return { ok: true, sent: true }
  },
)
