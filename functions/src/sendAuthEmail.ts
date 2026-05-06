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
import { renderAuthEmail, type AuthEmailKind } from './email/template'

if (!admin.apps.length) admin.initializeApp()

const GMAIL_USER = defineSecret('GMAIL_USER')
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD')

const FROM_DISPLAY = 'Reelst'

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

    const { subject, html, text } = renderAuthEmail({
      kind,
      actionUrl,
      recipientName: displayName,
      fromAddress,
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
