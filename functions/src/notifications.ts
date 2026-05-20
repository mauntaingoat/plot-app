/**
 * Notification triggers — fire push messages and write persistent
 * notification docs on key Firestore events.
 *
 * Triggers:
 *   - onNewShowingRequest        : showing request created → notify agent
 *   - onNewDigestSubscription    : buyer hit "Save Agent" (= digest sub
 *                                  doc created) → notify agent
 *   - onDigestSubscriptionUpdated: buyer unsubscribed → notify agent
 *   - onNewWave                  : buyer waved at a listing → notify agent
 *
 * Each respects the user's notificationPrefs in their `users` doc.
 * "Save" and "Subscribe" are the same event in the data layer — when a
 * buyer hits "Save Agent" on a public profile they enter their email,
 * which writes a digestSubscriptions doc. The toggle in agent
 * settings is labeled "Profile Saves" since that's how agents think
 * of it; internally the pref key is `newSubscriber`.
 * Tokens that fail to deliver (unregistered, invalid) are pruned.
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import * as admin from 'firebase-admin'
import nodemailer from 'nodemailer'
import { renderNotificationEmail, type NotificationKind } from './email/notificationEmail'

if (!admin.apps.length) admin.initializeApp()

// Shared with sendAuthEmail + sendWeeklyDigest. Re-declaring the
// secret here (defineSecret is idempotent on the same name) so the
// triggers below can list them in their options array.
const GMAIL_USER = defineSecret('GMAIL_USER')
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD')

// Origin for the dashboard CTA + image refs inside notification
// emails. Canonical site URL post-DNS-flip.
const PUBLIC_BASE_URL = 'https://reel.st'

// Map the FCM/inbox preference key to the email template's kind enum.
// kinds are 1:1 with notificationPrefs buckets, but the strings differ
// (snake_case in the email layer, camelCase in the prefs schema).
const KIND_BY_PREF: Record<string, NotificationKind> = {
  showingRequest: 'showing_request',
  newSubscriber: 'new_subscriber',
  newWave: 'new_wave',
}

interface NotifPayload {
  title: string
  body: string
  /** In-app deep link used for FCM push + inbox doc. Always relative
   *  (e.g. '/dashboard?tab=inbox'); prepended with PUBLIC_BASE_URL
   *  when used in the email CTA. */
  url?: string
  /** OVERRIDE the email CTA destination (full URL, no base prepend).
   *  Used for wave + showing-request emails to swap the dashboard
   *  deep link for a `mailto:` link with the visitor's email
   *  pre-populated so the agent can reply with one tap. */
  emailActionUrl?: string
  tag?: string
  /** Extras surfaced inline in the email (visitor contact, question). */
  emailExtras?: {
    visitorEmail?: string | null
    visitorPhone?: string | null
    question?: string | null
  }
}

/** Builds a `mailto:` URL with subject + greeting prefilled. Used for
 *  wave + showing-request emails so the agent's "Reply now" CTA opens
 *  their default mail app with the conversation half-started. */
function buildReplyMailto(toEmail: string, visitorName: string, subject: string): string {
  const enc = encodeURIComponent
  const greeting = visitorName ? `Hi ${visitorName.split(' ')[0]},` : 'Hi,'
  return `mailto:${toEmail}?subject=${enc(subject)}&body=${enc(greeting + '\n\n')}`
}

async function sendNotificationEmail(
  recipientEmail: string,
  recipientName: string | null,
  kind: NotificationKind,
  payload: NotifPayload,
): Promise<void> {
  // Best-effort. We never want a mail failure to interrupt the
  // inbox-doc write or the FCM push — they're already done by the
  // time this runs. Logging is enough.
  try {
    const fromAddress = GMAIL_USER.value()
    const appPassword = GMAIL_APP_PASSWORD.value()
    if (!fromAddress || !appPassword) {
      logger.warn('[notifyUser] email skipped: GMAIL secrets not configured')
      return
    }

    const { subject, html, text } = renderNotificationEmail({
      kind,
      recipientName,
      title: payload.title,
      body: payload.body,
      // emailActionUrl overrides the in-app URL when present (e.g.
      // mailto: links for wave + showing-request replies).
      actionUrl: payload.emailActionUrl ?? `${PUBLIC_BASE_URL}${payload.url || '/dashboard'}`,
      baseUrl: PUBLIC_BASE_URL,
      fromAddress,
      extras: payload.emailExtras,
    })

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: fromAddress, pass: appPassword },
    })

    await transporter.sendMail({
      from: `Reelst <${fromAddress}>`,
      to: recipientEmail,
      subject,
      html,
      text,
      replyTo: fromAddress,
    })
  } catch (err) {
    logger.warn('[notifyUser] notification email send failed', { err, kind, to: recipientEmail })
  }
}

async function notifyUser(uid: string, prefKey: 'showingRequest' | 'newSubscriber' | 'newWave', payload: NotifPayload) {
  const db = admin.firestore()
  const userSnap = await db.collection('users').doc(uid).get()
  if (!userSnap.exists) return

  const user = userSnap.data() as {
    email?: string
    displayName?: string
    fcmTokens?: string[]
    notificationPrefs?: Record<string, boolean>
  }

  const prefs = user.notificationPrefs || {}
  const defaultsOn: Record<string, boolean> = {
    showingRequest: true,
    newSubscriber: true,
    newWave: true,
  }
  const enabled = prefs[prefKey] ?? defaultsOn[prefKey]
  if (!enabled) {
    logger.info(`notifyUser: ${prefKey} disabled for ${uid}`)
    return
  }

  // Per-event email — runs in parallel with FCM. Gated by the same
  // toggle: when notificationPrefs[prefKey] is on, the agent gets the
  // inbox doc (unconditional), an FCM push (if tokens), AND an email.
  // Inbox stays the source of truth; email is the optional reach.
  const emailKind = KIND_BY_PREF[prefKey]
  if (user.email && emailKind) {
    void sendNotificationEmail(user.email, user.displayName || null, emailKind, payload)
  }

  const tokens = user.fcmTokens || []
  if (tokens.length === 0) return

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      url: payload.url || '/dashboard',
      tag: payload.tag || 'reelst',
    },
    webpush: {
      fcmOptions: {
        link: payload.url || '/dashboard',
      },
    },
  }

  const result = await admin.messaging().sendEachForMulticast(message)
  logger.info(`notifyUser: ${prefKey} ${uid} success=${result.successCount} failure=${result.failureCount}`)

  if (result.failureCount > 0) {
    const dead: string[] = []
    result.responses.forEach((res, i) => {
      if (!res.success) {
        const code = res.error?.code || ''
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          dead.push(tokens[i])
        }
      }
    })
    if (dead.length > 0) {
      await db
        .collection('users')
        .doc(uid)
        .update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...dead),
        })
        .catch(() => {})
    }
  }
}

async function writeNotification(data: {
  agentId: string
  type: 'save' | 'showing_request' | 'subscriber' | 'unsubscriber' | 'wave'
  title: string
  body: string
  actorName?: string
  actorUid?: string
  pinId?: string
  pinAddress?: string
  refId?: string
  /** Wave-specific extras — captured at submitWave time. Stored on the
   *  notification doc itself so the inbox can render contact info +
   *  the question without an extra read against /pins/{pinId}/waves. */
  visitorEmail?: string
  visitorPhone?: string | null
  question?: string
}) {
  const db = admin.firestore()
  const today = new Date().toISOString().slice(0, 10)

  // Deduplicate: don't create another notification if the same actor
  // did the same action on the same target today
  if (data.actorUid) {
    const existing = await db.collection('notifications')
      .where('agentId', '==', data.agentId)
      .where('type', '==', data.type)
      .where('actorUid', '==', data.actorUid)
      .where('date', '==', today)
      .limit(1).get()
    if (!existing.empty) return
  }

  await db.collection('notifications').add({
    ...data,
    read: false,
    date: today,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

// ── Trigger: new showing request ──
// Showing requests live in their own `showing_requests` collection with
// their own status field — the dashboard Inbox reads them directly via
// listShowingRequests(). We don't mirror them into `notifications`
// because (a) the Inbox would never read those docs, and (b) it would
// double-count toward the unread tab badge (once from the showing
// request's status='new', once from the unread notification doc).
// We still fire the FCM push so the agent gets a real-time alert.
export const onNewShowingRequest = onDocumentCreated(
  { document: 'showing_requests/{reqId}', region: 'us-central1', secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] },
  async (event) => {
    const data = event.data?.data()
    if (!data?.agentId) return

    const visitor = (data.visitorName as string) || 'Someone'
    const visitorEmail = (data.visitorEmail as string) || ''
    const addressShort = ((data.pinAddress as string) || 'a listing').split(',')[0]
    const replyMailto = visitorEmail
      ? buildReplyMailto(visitorEmail, visitor, `Re: Showing request for ${addressShort}`)
      : undefined

    await notifyUser(data.agentId, 'showingRequest', {
      title: 'New showing request',
      body: `${visitor} wants to tour ${addressShort}.`,
      url: '/dashboard?tab=inbox',
      emailActionUrl: replyMailto,
      tag: `req_${event.params.reqId}`,
      emailExtras: {
        visitorEmail: visitorEmail || null,
        visitorPhone: (data.visitorPhone as string | undefined) ?? null,
      },
    })
  },
)

// ── Trigger: new digest subscription (Save Agent) ──
// Fires when a buyer captures their email via the public agent
// profile's "Save Maya" CTA. Inbox notif + FCM push to the agent.
// Re-subscriptions (status flipping back to 'active') do NOT retrigger
// this — the trigger only fires on doc create.
export const onNewDigestSubscription = onDocumentCreated(
  { document: 'digestSubscriptions/{subId}', region: 'us-central1', secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] },
  async (event) => {
    const data = event.data?.data()
    if (!data?.agentId || !data?.email) return

    await notifyUser(data.agentId, 'newSubscriber', {
      title: 'New subscriber',
      body: data.email as string,
      url: '/dashboard?tab=inbox',
      tag: `sub_${event.params.subId}`,
    })

    await writeNotification({
      agentId: data.agentId,
      type: 'subscriber',
      title: 'New subscriber',
      body: data.email as string,
      actorName: data.email as string,
      refId: event.params.subId,
    })
  },
)

// ── Trigger: digest subscription status flipped to 'unsubscribed' ──
// Fires the agent's inbox notification + FCM push when a subscriber
// uses the /u/:token unsub page (Phase 3). Only the active→unsubscribed
// transition counts; reactivations and other patches are no-ops here.
// The agent's subscriber count auto-decrements via the existing
// dailySubscriberSnapshot logic — we don't touch counts here.
export const onDigestSubscriptionUpdated = onDocumentUpdated(
  { document: 'digestSubscriptions/{subId}', region: 'us-central1', secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] },
  async (event) => {
    const before = event.data?.before?.data()
    const after = event.data?.after?.data()
    if (!before || !after) return
    if (before.status === 'active' && after.status === 'unsubscribed') {
      const email = (after.email as string) || ''
      const agentId = after.agentId as string
      if (!agentId) return

      // Reuse the 'newSubscriber' pref bucket — subscribe and
      // unsubscribe are bookend signals; an agent who wants one
      // wants the other. Saves us a separate notification pref toggle.
      await notifyUser(agentId, 'newSubscriber', {
        title: 'Subscriber unsubscribed',
        body: email,
        url: '/dashboard?tab=inbox',
        tag: `unsub_${event.params.subId}`,
      })

      await writeNotification({
        agentId,
        type: 'unsubscriber',
        title: 'Subscriber unsubscribed',
        body: email,
        actorName: email,
        refId: event.params.subId,
      })
    }
  },
)

// ── Trigger: new wave (buyer question on a listing) ──
export const onNewWave = onDocumentCreated(
  { document: 'pins/{pinId}/waves/{waveId}', region: 'us-central1', secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] },
  async (event) => {
    const data = event.data?.data()
    if (!data?.agentId) return

    const visitor = (data.visitorName as string) || 'Someone'
    const addressShort = ((data.pinAddress as string) || '').split(',')[0] || 'a listing'

    const visitorEmail = (data.visitorEmail as string) || ''
    const replyMailto = visitorEmail
      ? buildReplyMailto(visitorEmail, visitor, `Re: Your question about ${addressShort}`)
      : undefined

    await notifyUser(data.agentId, 'newWave', {
      title: 'New wave 👋',
      body: `${visitor} has a question about ${addressShort}`,
      url: '/dashboard?tab=inbox',
      emailActionUrl: replyMailto,
      tag: `wave_${event.params.waveId}`,
      emailExtras: {
        visitorEmail: visitorEmail || null,
        visitorPhone: (data.visitorPhone as string | undefined) ?? null,
        question: (data.question as string | undefined) ?? null,
      },
    })

    await writeNotification({
      agentId: data.agentId,
      type: 'wave',
      title: 'New wave 👋',
      body: `${visitor} has a question about ${addressShort}`,
      actorName: visitor,
      pinId: event.params.pinId,
      pinAddress: data.pinAddress as string,
      refId: event.params.waveId,
      visitorEmail: data.visitorEmail as string | undefined,
      visitorPhone: (data.visitorPhone as string | null | undefined) ?? null,
      question: data.question as string | undefined,
    })

    // Pin-level wave counter — used by the dashboard's "Top Pins by
    // Waves" insight. Profile-level waves (no pinId) skip this since
    // the synthetic agent_profile_${id} bucket isn't a real pin doc.
    if (event.params.pinId && !event.params.pinId.startsWith('agent_profile_')) {
      await admin.firestore()
        .collection('pins')
        .doc(event.params.pinId)
        .update({ waves: admin.firestore.FieldValue.increment(1) })
        .catch(() => {})
    }
  },
)

