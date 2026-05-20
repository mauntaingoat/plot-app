/**
 * Cloud Function: submitFeedback
 *
 * Captures the "Provide feedback" form in dashboard settings.
 * Sign-in required (it's an agent-facing surface), rate-limited per
 * UID, persists to /feedback for the audit trail, and emails the
 * note + agent context to the moderation inbox via Workspace SMTP.
 *
 * Deploy:
 *   firebase deploy --only functions:submitFeedback
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import nodemailer from 'nodemailer'

if (!admin.apps.length) admin.initializeApp()

const GMAIL_USER = defineSecret('GMAIL_USER')
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD')

// Same inbox as reports. Swap to hello@reelst.co (or feedback@) once
// the DBA + Workspace mailbox on reelst.co are live.
const FEEDBACK_INBOX = 'mau@avigage.com'

// One feedback submission per agent per 24 hours. Prevents an agent
// who hits a frustrating bug from blowing up the moderation inbox
// with repeat sends in the same session — they get one shot per day
// to write a thoughtful note. Bug repros / urgent issues can go via
// the usual channels (email, support, etc.).
const PER_UID_LIMIT = 1
const PER_UID_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

interface SubmitFeedbackData {
  message?: string
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
        "You've already sent feedback today. Try again tomorrow.",
      )
    }
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) })
  })
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const submitFeedback = onCall<SubmitFeedbackData>(
  {
    cors: true,
    region: 'us-central1',
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD],
    maxInstances: 5,
  },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to send feedback.')
    }

    const uid = req.auth.uid
    const cleanMessage = (req.data?.message || '').trim().slice(0, 5000)
    if (!cleanMessage || cleanMessage.length < 4) {
      throw new HttpsError('invalid-argument', 'Feedback message is too short.')
    }

    await checkRateLimit(`feedback_uid_${uid}`, PER_UID_LIMIT, PER_UID_WINDOW_MS)

    // Resolve sender context for the email — display name + username
    // help us recognize the agent without grepping uids.
    const db = admin.firestore()
    let senderName: string | null = null
    let senderUsername: string | null = null
    let senderEmail: string | null = req.auth.token?.email || null
    let senderTier: string | null = null
    try {
      const userSnap = await db.collection('users').doc(uid).get()
      if (userSnap.exists) {
        const u = userSnap.data() as { displayName?: string; username?: string; email?: string; tier?: string }
        senderName = u.displayName || null
        senderUsername = u.username || null
        senderEmail = senderEmail || u.email || null
        senderTier = u.tier || null
      }
    } catch { /* tolerate */ }

    const feedbackRef = await db.collection('feedback').add({
      uid,
      message: cleanMessage,
      senderEmail,
      senderTier,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'new',
    })

    // Email moderation inbox.
    try {
      const fromAddress = GMAIL_USER.value()
      const appPassword = GMAIL_APP_PASSWORD.value()
      if (fromAddress && appPassword) {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: fromAddress, pass: appPassword },
        })

        const senderLabel = senderName
          ? `${senderName}${senderUsername ? ` (@${senderUsername})` : ''}`
          : senderUsername
            ? `@${senderUsername}`
            : `uid:${uid}`
        const subject = `[Reelst Feedback] ${senderLabel}`
        const profileUrl = senderUsername ? `https://reel.st/${senderUsername}` : null

        const profileRow = profileUrl
          ? `<tr><td style="padding:8px 0;width:110px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Profile</td><td style="padding:8px 0;font-size:14px;"><a href="${profileUrl}" style="color:#D94A1F;">${profileUrl}</a></td></tr>`
          : ''

        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#F4F5F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;">
        <tr><td style="padding:20px 24px 8px;">
          <p style="margin:0 0 4px;color:#D94A1F;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Feedback</p>
          <h1 style="margin:0;font-size:18px;font-weight:700;line-height:1.3;letter-spacing:-0.012em;">${escapeHtml(senderLabel)}</h1>
        </td></tr>
        <tr><td style="padding:0 24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${profileRow}
            <tr><td style="padding:8px 0;width:110px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Email</td><td style="padding:8px 0;font-size:14px;">${escapeHtml(senderEmail || '(none)')}</td></tr>
            <tr><td style="padding:8px 0;width:110px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Tier</td><td style="padding:8px 0;font-size:14px;">${escapeHtml(senderTier || 'free')}</td></tr>
            <tr><td style="padding:8px 0;width:110px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">UID</td><td style="padding:8px 0;font-size:14px;font-family:'SF Mono','Menlo','Consolas',monospace;">${escapeHtml(uid)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 24px 24px;">
          <div style="background:#F8F5F0;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(cleanMessage)}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

        const text = [
          `[Reelst Feedback] ${senderLabel}`,
          '',
          profileUrl ? `Profile: ${profileUrl}` : '',
          `Email:   ${senderEmail || '(none)'}`,
          `Tier:    ${senderTier || 'free'}`,
          `UID:     ${uid}`,
          '',
          'Message:',
          cleanMessage,
        ].filter(Boolean).join('\n')

        await transporter.sendMail({
          from: `Reelst Feedback <${fromAddress}>`,
          to: FEEDBACK_INBOX,
          subject,
          html,
          text,
          replyTo: senderEmail || fromAddress,
        })
      }
    } catch (err) {
      logger.warn('[submitFeedback] email send failed', { err, feedbackId: feedbackRef.id })
    }

    return { ok: true, feedbackId: feedbackRef.id }
  },
)
