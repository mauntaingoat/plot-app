/**
 * Cloud Function: sendWeeklyDigest
 *
 * Weekly Sunday 9am ET cron that sends one branded digest email per
 * unique recipient (grouped across all the agents that recipient has
 * saved). For each saved agent, finds updates since that subscription's
 * `lastSentAt`:
 *
 *   - new pin created (for_sale | sold | spotlight)
 *   - existing pin gained an open house
 *   - existing pin gained new content
 *
 * Detection uses three indexed Pin fields the dashboard bumps:
 *   - createdAt           (set by createPin)
 *   - openHouseUpdatedAt  (bumped by handleSaveOpenHouse)
 *   - contentLastAddedAt  (bumped by publishPinAssets + reassign)
 *
 * Dedupe rule: if a pin is "new this week," only emit ONE update for
 * it (the new-pin one). Don't double-count its content/open-house.
 *
 * Three render cases handled by `renderDigestEmail`:
 *   - has updates                → per-agent cards
 *   - no updates + new blog      → "quiet week" + blog teaser
 *   - no updates + no new blog   → roster of saved agents
 *
 * Send fan-out uses Workspace SMTP via nodemailer (same transport as
 * sendAuthEmail). Daily Workspace cap = 2,000; we'll get well below
 * that for a long time, but the cron is page-able + idempotent so
 * partial failures recover next week.
 *
 * Secrets:
 *   - GMAIL_USER          (e.g. mau@avigage.com)
 *   - GMAIL_APP_PASSWORD  (16-char Workspace app password)
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import nodemailer from 'nodemailer'
import {
  renderDigestEmail,
  type DigestAgent,
  type DigestUpdate,
  type DigestBlogPost,
} from './email/digestTemplate'

if (!admin.apps.length) admin.initializeApp()

const GMAIL_USER = defineSecret('GMAIL_USER')
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD')

const FROM_DISPLAY = 'Reelst'
// Swap to 'https://reel.st' once the custom domain is live.
const SITE_BASE_URL = 'https://plot-fe990.web.app'
const FALLBACK_DIFF_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

// Volume caps. Without these a recipient who follows 50 agents OR
// one agent who posts 100 things in a week would get a wall-of-email
// digest. Beyond the caps we render an overflow strip + per-agent
// "+ N more updates" link that points them to the full profile.
const MAX_UPDATES_PER_AGENT = 3
const MAX_AGENTS_WITH_UPDATES_PER_EMAIL = 10

const BLOG_CATEGORY_LABELS: Record<string, string> = {
  'state-of-reel-estate': 'State of Reel Estate',
  playbook: 'Playbook',
  spotlight: 'Spotlight',
  data: 'Data',
  announcements: 'Product',
}

interface SubData {
  agentId: string
  email: string
  emailHash: string
  status: 'active' | 'unsubscribed'
  unsubToken: string
  lastSentAt: admin.firestore.Timestamp | null
  createdAt: admin.firestore.Timestamp
}

export const sendWeeklyDigest = onSchedule(
  {
    schedule: '0 9 * * 0',
    timeZone: 'America/New_York',
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD],
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    const db = admin.firestore()

    // 1) Page through active subscriptions, group by emailHash.
    const subsByEmail = new Map<
      string,
      { ref: admin.firestore.DocumentReference; data: SubData }[]
    >()
    let cursor: admin.firestore.QueryDocumentSnapshot | undefined
    const PAGE = 500
    while (true) {
      let q = db
        .collection('digestSubscriptions')
        .where('status', '==', 'active')
        .orderBy('emailHash')
        .limit(PAGE)
      if (cursor) q = q.startAfter(cursor)
      const snap = await q.get()
      if (snap.empty) break
      for (const d of snap.docs) {
        const data = d.data() as SubData
        if (!data.emailHash || !data.email || !data.agentId) continue
        const arr = subsByEmail.get(data.emailHash) || []
        arr.push({ ref: d.ref, data })
        subsByEmail.set(data.emailHash, arr)
      }
      if (snap.size < PAGE) break
      cursor = snap.docs[snap.docs.length - 1]
    }

    if (subsByEmail.size === 0) {
      logger.info('[sendWeeklyDigest] no active subscriptions, exiting')
      return
    }

    // 2) Load latest published blog post once (shared across recipients).
    const blogSnap = await db
      .collection('posts')
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .limit(1)
      .get()
    const latestBlogDoc = blogSnap.docs[0]
    const latestBlogPublishedAtMs =
      (latestBlogDoc?.data()?.publishedAt as admin.firestore.Timestamp | undefined)?.toMillis?.() ?? 0

    // 3) Open SMTP transport once.
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() },
    })

    let sent = 0
    let failed = 0

    // 4) For each recipient (email group), build + send one digest.
    for (const [emailHash, subs] of subsByEmail.entries()) {
      try {
        const recipientEmail = subs[0].data.email
        const unsubToken = subs[0].data.unsubToken
        const unsubUrl = `${SITE_BASE_URL}/u/${unsubToken}`

        // Per-agent diff windows + agent doc fetches in parallel.
        const agentDocs = await Promise.all(
          subs.map((s) => db.collection('users').doc(s.data.agentId).get()),
        )

        const agents: DigestAgent[] = []
        for (let i = 0; i < subs.length; i++) {
          const sub = subs[i]
          const agentDoc = agentDocs[i]
          if (!agentDoc.exists) continue
          const agent = agentDoc.data() as Record<string, unknown>
          if (agent.role !== 'agent' || !agent.username) continue
          if (agent.verificationStatus && agent.verificationStatus !== 'verified') continue

          const sinceMs =
            sub.data.lastSentAt?.toMillis?.() ??
            Math.max(
              sub.data.createdAt?.toMillis?.() ?? 0,
              Date.now() - FALLBACK_DIFF_WINDOW_MS,
            )
          const sinceTs = admin.firestore.Timestamp.fromMillis(sinceMs)

          const updates = await collectAgentUpdates({
            db,
            agentId: sub.data.agentId,
            agentUsername: agent.username as string,
            sinceTs,
          })

          agents.push({
            username: agent.username as string,
            displayName: (agent.displayName as string) || (agent.username as string),
            photoURL: (agent.photoURL as string | null) || null,
            updates,
          })
        }

        // Apply per-agent + per-email caps. Order matters:
        // 1. Trim each agent's updates to the per-agent cap, stashing
        //    the dropped count on `moreUpdatesCount` so the template
        //    can render a "+ N more updates from X" footer.
        // 2. Sort agents by total updates desc (most-active first).
        // 3. Split into in-email vs overflow by the per-email cap.
        //    Overflow only includes agents who actually had updates —
        //    quiet-agent roster handling further down is unaffected.
        for (const a of agents) {
          if (a.updates.length > MAX_UPDATES_PER_AGENT) {
            a.moreUpdatesCount = a.updates.length - MAX_UPDATES_PER_AGENT
            a.updates = a.updates.slice(0, MAX_UPDATES_PER_AGENT)
          }
        }
        const withUpdates = agents.filter((a) => a.updates.length > 0)
        const quiet = agents.filter((a) => a.updates.length === 0)
        withUpdates.sort((a, b) => b.updates.length - a.updates.length)
        const featured = withUpdates.slice(0, MAX_AGENTS_WITH_UPDATES_PER_EMAIL)
        const overflowAgents = withUpdates.slice(MAX_AGENTS_WITH_UPDATES_PER_EMAIL)
        const cappedAgents = [...featured, ...quiet]

        // Blog teaser eligibility: post is newer than the OLDEST
        // lastSentAt across the recipient's group (so an agent they
        // just saved doesn't suppress the blog they haven't seen).
        let blogPost: DigestBlogPost | null = null
        if (latestBlogDoc && latestBlogPublishedAtMs > 0) {
          const oldestSentMs = Math.min(
            ...subs.map((s) => s.data.lastSentAt?.toMillis?.() ?? 0),
          )
          if (latestBlogPublishedAtMs > oldestSentMs) {
            const blog = latestBlogDoc.data()
            blogPost = {
              slug: blog.slug,
              title: blog.title,
              excerpt: blog.excerpt,
              coverImage: blog.coverImage || null,
              category: BLOG_CATEGORY_LABELS[blog.category] || String(blog.category || 'Blog'),
              readTime: blog.readTime || 5,
            }
          }
        }

        const { subject, html, text } = renderDigestEmail({
          agents: cappedAgents,
          blogPost,
          recipientName: null,
          fromAddress: GMAIL_USER.value(),
          baseUrl: SITE_BASE_URL,
          unsubUrl,
          overflowAgents,
        })

        await transporter.sendMail({
          from: `${FROM_DISPLAY} <${GMAIL_USER.value()}>`,
          to: recipientEmail,
          subject,
          html,
          text,
          replyTo: GMAIL_USER.value(),
          headers: {
            // RFC 8058 one-click + standard list-unsubscribe — Gmail
            // surfaces a native "Unsubscribe" button in the inbox UI
            // and the deliverability boost is real.
            'List-Unsubscribe': `<${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })

        // Stamp lastSentAt on every sub in the group.
        const batch = db.batch()
        for (const s of subs) {
          batch.update(s.ref, {
            lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        }
        await batch.commit()

        sent++
      } catch (err) {
        failed++
        logger.error('[sendWeeklyDigest] send failed for emailHash', {
          emailHash,
          err: (err as Error)?.message,
        })
      }
    }

    logger.info('[sendWeeklyDigest] done', {
      recipients: subsByEmail.size,
      sent,
      failed,
    })
  },
)

/* ─────────────── Per-agent update collection ─────────────── */

async function collectAgentUpdates(args: {
  db: admin.firestore.Firestore
  agentId: string
  agentUsername: string
  sinceTs: admin.firestore.Timestamp
}): Promise<DigestUpdate[]> {
  const { db, agentId, agentUsername, sinceTs } = args

  // Three queries in parallel. Each uses a single inequality so the
  // composite index stays minimal: (agentId asc, <field> asc).
  const [newPinsSnap, openHouseSnap, contentSnap] = await Promise.all([
    db
      .collection('pins')
      .where('agentId', '==', agentId)
      .where('createdAt', '>', sinceTs)
      .get(),
    db
      .collection('pins')
      .where('agentId', '==', agentId)
      .where('openHouseUpdatedAt', '>', sinceTs)
      .get(),
    db
      .collection('pins')
      .where('agentId', '==', agentId)
      .where('contentLastAddedAt', '>', sinceTs)
      .get(),
  ])

  // Filter active+enabled in code (avoids inflating the composite
  // index with two more equality fields).
  const active = (data: any) => data.status !== 'archived' && data.enabled !== false

  // Dedupe rule: if a pin is in newPinsSnap (truly new), DON'T also
  // emit content/open-house updates for it. The pin announcement
  // already covers it.
  const updateByPin = new Map<string, DigestUpdate>()

  for (const d of newPinsSnap.docs) {
    const pin = d.data()
    if (!active(pin)) continue
    const u = pinToNewUpdate(pin, agentUsername)
    if (u) updateByPin.set(d.id, u)
  }
  for (const d of openHouseSnap.docs) {
    if (updateByPin.has(d.id)) continue
    const pin = d.data()
    if (!active(pin)) continue
    const u = openHouseToUpdate(pin, agentUsername)
    if (u) updateByPin.set(d.id, u)
  }
  for (const d of contentSnap.docs) {
    if (updateByPin.has(d.id)) continue
    const pin = d.data()
    if (!active(pin)) continue
    const u = contentToUpdate(pin, agentUsername, sinceTs)
    if (u) updateByPin.set(d.id, u)
  }

  // Sort: open-houses first (most time-sensitive), then new listings,
  // then content. Within a kind, newest first.
  const kindOrder: Record<DigestUpdate['kind'], number> = {
    new_open_house: 0,
    new_listing: 1,
    new_sold: 2,
    new_spotlight: 3,
    new_content: 4,
  }
  return Array.from(updateByPin.values()).sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind])
}

/* ─────────────── Pin → DigestUpdate mappers ─────────────── */

function pinToNewUpdate(pin: any, agentUsername: string): DigestUpdate | null {
  const href = `${SITE_BASE_URL}/${agentUsername}`
  const thumbnail =
    pin.heroPhotoUrl ||
    pin.photos?.[0] ||
    pin.content?.[0]?.thumbnailUrl ||
    null

  if (pin.type === 'for_sale') {
    return {
      kind: 'new_listing',
      primary: pin.address || 'New listing',
      secondary: formatListingSecondary(pin),
      thumbnail,
      href,
    }
  }
  if (pin.type === 'sold') {
    return {
      kind: 'new_sold',
      primary: pin.address || 'Just sold',
      secondary: pin.soldPrice ? `Sold ${formatMoney(pin.soldPrice)}` : 'Just sold',
      thumbnail,
      href,
    }
  }
  if (pin.type === 'spotlight') {
    return {
      kind: 'new_spotlight',
      primary: pin.name || pin.neighborhoodId || 'Neighborhood spotlight',
      secondary: 'New spotlight pin',
      thumbnail,
      href,
    }
  }
  return null
}

function openHouseToUpdate(pin: any, agentUsername: string): DigestUpdate | null {
  const sessions: { date: string; startTime: string; endTime: string }[] =
    pin.openHouse?.sessions || []
  if (sessions.length === 0) return null

  const now = Date.now()
  const future = sessions
    .map((s) => ({ ...s, startMs: parseSessionStart(s.date, s.startTime) }))
    .filter((s) => Number.isFinite(s.startMs) && s.startMs > now)
    .sort((a, b) => a.startMs - b.startMs)

  const next = future[0] || sessions[0]

  return {
    kind: 'new_open_house',
    primary: pin.address || 'Open house',
    secondary: formatSessionLabel(next),
    thumbnail: pin.heroPhotoUrl || pin.photos?.[0] || null,
    href: `${SITE_BASE_URL}/${agentUsername}`,
  }
}

function contentToUpdate(pin: any, agentUsername: string, sinceTs: admin.firestore.Timestamp): DigestUpdate | null {
  const content = (pin.content || []) as any[]
  if (content.length === 0) return null
  const sinceMs = sinceTs.toMillis()
  const recent = content.filter((c) => {
    const ms = c.createdAt?.toMillis?.()
      ?? (typeof c.createdAt?._seconds === 'number' ? c.createdAt._seconds * 1000 : 0)
    return ms > sinceMs
  })
  if (recent.length === 0) return null

  const reels = recent.filter((c) => c.type === 'reel').length
  const photoItems = recent.filter((c) => c.type === 'photo')
  const photoCount = photoItems.reduce(
    (n, c) => n + (Array.isArray(c.mediaUrls) ? c.mediaUrls.length : 1),
    0,
  )

  let secondary: string
  if (reels > 0 && photoItems.length > 0) {
    secondary = `${reels} new reel${reels > 1 ? 's' : ''} + ${photoCount} new photo${photoCount > 1 ? 's' : ''}`
  } else if (reels > 0) {
    secondary = reels === 1 ? 'New reel' : `${reels} new reels`
  } else if (photoItems.length > 0) {
    secondary = photoCount === 1 ? 'New photo' : `${photoCount} new photos`
  } else {
    secondary = 'New post'
  }

  const thumbnail = recent[0].thumbnailUrl || pin.heroPhotoUrl || null
  return {
    kind: 'new_content',
    primary: pin.address || pin.name || 'New post',
    secondary,
    thumbnail,
    href: `${SITE_BASE_URL}/${agentUsername}`,
  }
}

/* ─────────────── Formatters ─────────────── */

function formatMoney(n: number): string {
  if (!n || n <= 0) return ''
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `$${m.toFixed(m < 10 ? 2 : 1).replace(/\.?0+$/, '')}M`
  }
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`
  return `$${n.toLocaleString()}`
}

function formatListingSecondary(pin: any): string {
  const parts: string[] = []
  const price = formatMoney(pin.price || 0)
  if (price) parts.push(price)
  if (pin.beds) parts.push(`${pin.beds} bd`)
  if (pin.baths) parts.push(`${pin.baths} ba`)
  if (pin.sqft) parts.push(`${Number(pin.sqft).toLocaleString()} sqft`)
  return parts.join(' · ') || 'New listing'
}

function parseSessionStart(date: string, time: string): number {
  if (!date || !time) return NaN
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).getTime()
}

function formatSessionLabel(s: { date: string; startTime: string; endTime: string }): string {
  if (!s.date || !s.startTime || !s.endTime) return 'Open house this week'
  const d = new Date(`${s.date}T00:00:00`)
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${dayLabel} · ${formatTime(s.startTime)}–${formatTime(s.endTime)}`
}

function formatTime(t: string): string {
  const [hh, mm] = t.split(':').map(Number)
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  const suffix = hh < 12 ? 'am' : 'pm'
  return mm === 0 ? `${h12}${suffix}` : `${h12}:${String(mm).padStart(2, '0')}${suffix}`
}
