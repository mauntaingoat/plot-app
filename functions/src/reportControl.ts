/**
 * Cloud Function: submitReport
 *
 * Anonymous report submission for buyers + signed-in users to flag
 * fake listings, harassing agents, copyright violations, etc.
 *
 * What it does:
 *   1. Rate-limits per-IP + per-target so a single bad actor can't
 *      flood the moderation queue
 *   2. Writes the report to /reports/{id} (audit trail)
 *   3. Emails the report to the moderation address via Workspace SMTP
 *
 * Auth: optional — signed-in users get their UID logged on the doc.
 * Anonymous reporters still work (most buyers reporting fraud won't
 * have a Reelst account).
 *
 * Two rate-limit gates:
 *   - Per-IP: 5 reports / rolling hour
 *   - Per target: 10 reports / day (same target, regardless of who)
 *
 * Deploy:
 *   firebase deploy --only functions:submitReport
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import nodemailer from 'nodemailer'
import { renderReportEmail, type ReportEmailInput } from './email/reportEmail'

if (!admin.apps.length) admin.initializeApp()

const GMAIL_USER = defineSecret('GMAIL_USER')
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD')

// Moderation inbox. Swap to hello@reelst.co (or moderation@) once the
// DBA + Workspace mailbox on reelst.co are live. Until then, ship
// reports to the existing Avigage business mailbox.
const MODERATION_INBOX = 'mau@avigage.com'

// Three rate-limit gates layered for defense in depth:
//
//   1. PER_IP_LIMIT — broad "this IP is flooding" guard. Catches
//      botnet-style attacks where one actor cycles target IDs.
//   2. PER_TARGET_LIMIT — caps any single target from being mass-
//      reported from many IPs (raid-style harassment). The mod
//      inbox still gets 10 to triage; the 11th gets silently
//      dropped until tomorrow.
//   3. PER_REPORTER_TARGET_LIMIT — the strictest gate, and the
//      one the user explicitly asked for: a given person can
//      report the SAME target only ONCE PER DAY. Identifier is the
//      reporter UID when signed in, IP otherwise. Stops a single
//      person from re-submitting the same report repeatedly to
//      inflate moderation queue weight on a target they don't like.
const PER_IP_LIMIT = 5
const PER_IP_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const PER_TARGET_LIMIT = 10
const PER_TARGET_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
const PER_REPORTER_TARGET_LIMIT = 1
const PER_REPORTER_TARGET_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

const VALID_REASONS = new Set([
  'spam',
  'inappropriate',
  'fake_listing',
  'harassment',
  'copyright',
  'other',
])
const VALID_TARGET_TYPES = new Set(['pin', 'content', 'agent'])

interface SubmitReportData {
  targetType?: 'pin' | 'content' | 'agent'
  targetId?: string
  targetOwnerId?: string
  reason?: string
  detail?: string
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
        "You've already reported this. Our team will review it.",
      )
    }
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) })
  })
}

export const submitReport = onCall<SubmitReportData>(
  {
    cors: true,
    region: 'us-central1',
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD],
    maxInstances: 10,
  },
  async (req) => {
    const { targetType, targetId, targetOwnerId, reason, detail } = req.data || {}

    // Validate inputs.
    if (!targetType || !VALID_TARGET_TYPES.has(targetType)) {
      throw new HttpsError('invalid-argument', 'targetType must be pin, content, or agent')
    }
    if (!targetId || typeof targetId !== 'string' || targetId.length < 1 || targetId.length > 128) {
      throw new HttpsError('invalid-argument', 'targetId is required')
    }
    if (!targetOwnerId || typeof targetOwnerId !== 'string') {
      throw new HttpsError('invalid-argument', 'targetOwnerId is required')
    }
    if (!reason || typeof reason !== 'string' || !VALID_REASONS.has(reason)) {
      throw new HttpsError('invalid-argument', 'reason must be one of the documented reasons')
    }
    const cleanDetail = (detail || '').trim().slice(0, 2000)

    const ip = (req.rawRequest?.ip || 'unknown').replace(/[^a-zA-Z0-9.:_-]/g, '_')
    const reporterUid = req.auth?.uid || null
    const reporterEmail = req.auth?.token?.email || null

    // Identifier for the per-reporter gate: UID when signed in,
    // sanitized IP otherwise. Both map to a single namespaced key so
    // the gate works the same way regardless of auth state.
    const reporterKey = reporterUid ? `u_${reporterUid}` : `i_${ip}`

    // Rate limit BEFORE any writes. Strictest gate first so a repeat
    // reporter trips it before incrementing the broader counters.
    await checkRateLimit(
      `report_by_${reporterKey}_target_${targetType}_${targetId}`,
      PER_REPORTER_TARGET_LIMIT,
      PER_REPORTER_TARGET_WINDOW_MS,
    )
    await checkRateLimit(`report_ip_${ip}`, PER_IP_LIMIT, PER_IP_WINDOW_MS)
    await checkRateLimit(`report_target_${targetType}_${targetId}`, PER_TARGET_LIMIT, PER_TARGET_WINDOW_MS)

    // Resolve target owner display info for the email — best-effort.
    // Falls back to ID strings if the doc has been deleted between
    // report submit and our lookup here.
    const db = admin.firestore()
    let targetOwnerName: string | null = null
    let targetOwnerUsername: string | null = null
    try {
      const ownerSnap = await db.collection('users').doc(targetOwnerId).get()
      if (ownerSnap.exists) {
        const ownerData = ownerSnap.data() as { displayName?: string; username?: string }
        targetOwnerName = ownerData.displayName || null
        targetOwnerUsername = ownerData.username || null
      }
    } catch { /* tolerate the lookup miss */ }

    // Pull a snippet of the target for context (pin address, content
    // caption, etc.) so the moderator can act without leaving Gmail.
    let targetSnippet: string | null = null
    try {
      if (targetType === 'pin') {
        const pinSnap = await db.collection('pins').doc(targetId).get()
        if (pinSnap.exists) {
          const pinData = pinSnap.data() as { address?: string; type?: string }
          targetSnippet = `${pinData.type || 'pin'} @ ${pinData.address || '(no address)'}`
        }
      } else if (targetType === 'content') {
        // Content lives inside pin.content[] arrays — too expensive
        // to find without the parent pinId. Leave null; moderator
        // can find via Firestore Console using the targetId.
        targetSnippet = `content id ${targetId}`
      } else if (targetType === 'agent') {
        targetSnippet = targetOwnerUsername ? `@${targetOwnerUsername}` : `agent ${targetOwnerId}`
      }
    } catch { /* tolerate */ }

    // Write the report doc (audit trail). Status starts as 'pending'
    // so the future moderation queue UI can filter for new items.
    const reportRef = await db.collection('reports').add({
      reporterUid,
      reporterEmail,
      targetType,
      targetId,
      targetOwnerId,
      reason,
      detail: cleanDetail,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // Captured for abuse triage even though the rateLimit doc also
      // has it — having ip on the report doc lets a moderator block
      // a serial reporter without grepping rateLimits.
      ip,
    })

    // Email moderation inbox. Failure here doesn't unwind the
    // Firestore write — the doc is the source of truth, email is the
    // notification channel. Log + swallow.
    try {
      const fromAddress = GMAIL_USER.value()
      const appPassword = GMAIL_APP_PASSWORD.value()
      if (fromAddress && appPassword) {
        const emailInput: ReportEmailInput = {
          reportId: reportRef.id,
          targetType,
          targetId,
          targetOwnerId,
          targetOwnerName,
          targetOwnerUsername,
          targetSnippet,
          reason,
          detail: cleanDetail,
          reporterUid,
          reporterEmail,
          ip,
          submittedAt: new Date(),
        }
        const { subject, html, text } = renderReportEmail(emailInput)
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: fromAddress, pass: appPassword },
        })
        await transporter.sendMail({
          from: `Reelst Reports <${fromAddress}>`,
          to: MODERATION_INBOX,
          subject,
          html,
          text,
          replyTo: reporterEmail || fromAddress,
        })
      }
    } catch (err) {
      logger.warn('[submitReport] moderation email send failed', { err, reportId: reportRef.id })
    }

    return { ok: true, reportId: reportRef.id }
  },
)
