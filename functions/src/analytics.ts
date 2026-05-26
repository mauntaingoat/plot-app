import { onCall, onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

// ── Event logging helper ──
async function logEvent(data: {
  type: 'view' | 'tap' | 'save' | 'unsave' | 'profile_visit' | 'wave' | 'link_tap'
  agentId: string
  pinId?: string
  contentId?: string
  actorUid?: string
  visitorId?: string
  dedupeId?: string
  localHour?: number
}) {
  const db = admin.firestore()
  // Firestore Admin SDK rejects writes with undefined-valued fields by
  // default. The biggest blast radius: anonymous visitors arriving via
  // an incognito tab — `actorUid` comes through as undefined and the
  // entire event-row write throws, while the parallel `profileVisits`
  // increment (no undefined fields) succeeds anyway. Result: counter
  // ticks up but TimeOfDay / 7-day chart all stay empty.
  // Strip undefineds defensively so any caller stays safe.
  const payload: Record<string, unknown> = {
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    hour: data.localHour ?? new Date().getHours(),
    date: new Date().toISOString().slice(0, 10),
  }
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) payload[k] = v
  }
  await db.collection('events').add(payload)
}

// ── Sharded counter writes ──
// Firestore caps sustained writes at ~1/sec/doc, which throttles
// the views/taps/saves counters on viral pins. Spread each increment
// across 10 random shards (taps_0..taps_9) so the effective write
// capacity is 10x. Read side sums all shards back together — see
// `sumShards` in src/lib/firestore.ts.
const COUNTER_SHARDS = 10
function counterShardField(field: 'taps' | 'views' | 'saves'): string {
  return `${field}_${Math.floor(Math.random() * COUNTER_SHARDS)}`
}

// Sum all shards back into a single number for read-side guard checks
// (e.g. "don't decrement saves below zero"). Includes the legacy
// single-field value so pins written before sharding still total
// correctly.
function sumShardsFromSnap(
  snap: admin.firestore.DocumentSnapshot,
  field: 'taps' | 'views' | 'saves',
): number {
  const data = snap.data() ?? {}
  let sum = Number((data as Record<string, unknown>)[field]) || 0
  for (let i = 0; i < COUNTER_SHARDS; i++) {
    sum += Number((data as Record<string, unknown>)[`${field}_${i}`]) || 0
  }
  return sum
}

function getClientIp(request: any): string {
  return request.rawRequest?.ip
    || request.rawRequest?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || ''
}

// ── Tracker rate limit ──
// 200 events / hour / IP across each tracker. Generous enough that
// real users (who typically fire 1-30 events per session) never hit
// it, but tight enough to suffocate scripts trying to inflate
// pin.views / pin.taps / agent.profileVisits or blow up the events
// collection for cost-griefing. Returns true if the request should
// proceed; false to silently drop. Fails CLOSED on transaction
// errors — losing a few legit events during transient Firestore
// contention is preferable to handing an attacker a free-pass when
// they cause contention to slip past the limit.
const TRACKER_PER_HOUR = 200
const TRACKER_WINDOW_MS = 60 * 60 * 1000

interface RateLimitDoc {
  count: number
  windowStart: admin.firestore.Timestamp
}

async function allowTrackerCall(ipKey: string): Promise<boolean> {
  // Anonymous viewers may have empty IP (local dev, some proxy
  // configs). Don't gate them — too easy to over-block legit traffic.
  if (!ipKey) return true
  const ref = admin.firestore().collection('rateLimits').doc(ipKey)
  try {
    return await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const now = admin.firestore.Timestamp.now()
      if (!snap.exists) {
        tx.set(ref, { count: 1, windowStart: now } as RateLimitDoc)
        return true
      }
      const data = snap.data() as RateLimitDoc
      const elapsed = now.toMillis() - data.windowStart.toMillis()
      if (elapsed >= TRACKER_WINDOW_MS) {
        tx.set(ref, { count: 1, windowStart: now } as RateLimitDoc)
        return true
      }
      if (data.count >= TRACKER_PER_HOUR) {
        return false
      }
      tx.update(ref, { count: admin.firestore.FieldValue.increment(1) })
      return true
    })
  } catch (err) {
    logger.warn('[analytics] rate limit txn failed; dropping event', { ipKey, err: String(err) })
    return false
  }
}

// ── Track View ──
export const trackView = onCall<{ pinId: string; contentId?: string; localHour?: number; visitorId?: string }>(
  { cors: true, maxInstances: 20 },
  async (request) => {
    const { pinId, contentId, visitorId } = request.data
    if (!pinId) return

    const ipRaw = getClientIp(request)
    const ipKey = ipRaw.replace(/[^a-zA-Z0-9.:_-]/g, '_')
    if (!(await allowTrackerCall(`tracker_view_ip_${ipKey}`))) return

    const db = admin.firestore()
    const pinRef = db.collection('pins').doc(pinId)
    const pinSnap = await pinRef.get()
    if (!pinSnap.exists) return
    const agentId = pinSnap.get('agentId') as string

    if (request.auth?.uid === agentId) return

    // Prefer a stable per-device visitorId for dedup so two anonymous
    // visitors on the same network don't collapse to one "anon" key.
    // Falls back to auth uid (signed-in) then 'anon' for legacy clients
    // that don't yet send a visitorId.
    const viewerId = visitorId || request.auth?.uid || 'anon'
    const dedupeId = contentId ? `${viewerId}_${pinId}_${contentId}` : `${viewerId}_${pinId}`
    let isUnique = true
    try {
      const existingView = await db.collection('events')
        .where('dedupeId', '==', dedupeId).where('type', '==', 'view').limit(1).get()
      isUnique = existingView.empty
    } catch {
      // Index might not exist — treat as unique to not block view tracking
      isUnique = true
    }

    if (contentId) {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(pinRef)
        if (!snap.exists) return
        const content: any[] = snap.get('content') ?? []
        const idx = content.findIndex((c) => c.id === contentId)
        if (idx !== -1) {
          content[idx] = {
            ...content[idx],
            views: (content[idx].views || 0) + 1,
            ...(isUnique ? { uniqueViews: (content[idx].uniqueViews || 0) + 1 } : {}),
          }
        }
        tx.update(pinRef, {
          [counterShardField('views')]: admin.firestore.FieldValue.increment(1),
          content,
        })
      })
    } else {
      await pinRef.update({ [counterShardField('views')]: admin.firestore.FieldValue.increment(1) })
    }

    await logEvent({
      type: 'view',
      agentId,
      pinId,
      contentId,
      actorUid: request.auth?.uid,
      visitorId,
      dedupeId,
      localHour: request.data.localHour,
    })
  },
)

// ── Track Engagement (tap, save, unsave) ──
export const trackEngagement = onCall<{ pinId: string; action: 'tap' | 'save' | 'unsave'; contentId?: string; localHour?: number; visitorId?: string }>(
  { cors: true, maxInstances: 20 },
  async (request) => {
    const { pinId, action, contentId, visitorId } = request.data
    if (!pinId || !action) return

    const ipKey = getClientIp(request).replace(/[^a-zA-Z0-9.:_-]/g, '_')
    if (!(await allowTrackerCall(`tracker_engage_ip_${ipKey}`))) return

    const db = admin.firestore()
    const pinRef = db.collection('pins').doc(pinId)
    const pinSnap = await pinRef.get()
    if (!pinSnap.exists) return
    const agentId = pinSnap.get('agentId') as string

    if (request.auth?.uid === agentId) return

    if (action === 'tap') {
      await pinRef.update({ [counterShardField('taps')]: admin.firestore.FieldValue.increment(1) }).catch(() => {})
    } else if (action === 'save') {
      await pinRef.update({ [counterShardField('saves')]: admin.firestore.FieldValue.increment(1) }).catch(() => {})
      if (contentId) {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(pinRef)
          if (!snap.exists) return
          const content: any[] = snap.get('content') ?? []
          const idx = content.findIndex((c) => c.id === contentId)
          if (idx !== -1) {
            content[idx] = { ...content[idx], saves: (content[idx].saves || 0) + 1 }
            tx.update(pinRef, { content })
          }
        }).catch(() => {})
      }
    } else if (action === 'unsave') {
      // Reuse the snap fetched above (line ~170) for the floor-check.
      // Decrement only if the summed saves total is positive so we
      // don't end up with a negative displayed count after the sum.
      if (sumShardsFromSnap(pinSnap, 'saves') > 0) {
        await pinRef.update({ [counterShardField('saves')]: admin.firestore.FieldValue.increment(-1) }).catch(() => {})
      }
      if (contentId) {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(pinRef)
          if (!snap.exists) return
          const content: any[] = snap.get('content') ?? []
          const idx = content.findIndex((c) => c.id === contentId)
          if (idx !== -1) {
            content[idx] = { ...content[idx], saves: Math.max(0, (content[idx].saves || 0) - 1) }
            tx.update(pinRef, { content })
          }
        }).catch(() => {})
      }
    }

    await logEvent({
      type: action,
      agentId,
      pinId,
      contentId,
      actorUid: request.auth?.uid,
      visitorId,
      localHour: request.data.localHour,
    })
  },
)

// ── Track Profile Visit ──
// Fires when a buyer lands on /:username (the public agent profile).
// De-duped per session client-side via sessionStorage so a refresh
// doesn't double-count. `localHour` is the visitor's local hour
// (0–23) so the dashboard's "When viewers are active" chart buckets
// by visitor wall-clock time, not server UTC.
export const trackProfileVisit = onCall<{ agentId: string; localHour?: number; visitorId?: string }>(
  { cors: true, maxInstances: 20 },
  async (request) => {
    const { agentId, localHour, visitorId } = request.data
    if (!agentId) return

    // Skip self-views — agents previewing their own profile shouldn't
    // pollute their own analytics.
    if (request.auth?.uid === agentId) return

    const ipRaw = getClientIp(request)
    const ipKey = ipRaw.replace(/[^a-zA-Z0-9.:_-]/g, '_')
    if (!(await allowTrackerCall(`tracker_visit_ip_${ipKey}`))) return

    await Promise.all([
      logEvent({
        type: 'profile_visit',
        agentId,
        actorUid: request.auth?.uid,
        visitorId,
        localHour,
      }),
      // Lifetime counter on the user doc — drives the dashboard's
      // "Visits" stat card without scanning the events collection.
      admin.firestore()
        .collection('users')
        .doc(agentId)
        .update({ profileVisits: admin.firestore.FieldValue.increment(1) })
        .catch(() => {}),
    ])
  },
)

// ── Custom links — public-profile link tap ──
// Fires from CustomLinksStack.onClick on the public profile. Writes
// one `events` row per accepted tap with type='link_tap' so the
// dashboard can later surface top-clicked links per agent. Reuses
// `contentId` to store the linkId — avoids growing the events
// schema for a feature that fits the same shape.
export const trackLinkTap = onCall<{ agentId: string; linkId: string; localHour?: number; visitorId?: string }>(
  { cors: true, maxInstances: 20 },
  async (request) => {
    const { agentId, linkId, localHour, visitorId } = request.data
    if (!agentId || !linkId) return

    // Skip self-clicks — agents previewing their own profile shouldn't
    // pollute their own analytics.
    if (request.auth?.uid === agentId) return

    const ipRaw = getClientIp(request)
    const ipKey = ipRaw.replace(/[^a-zA-Z0-9.:_-]/g, '_')
    if (!(await allowTrackerCall(`tracker_link_ip_${ipKey}`))) return

    await logEvent({
      type: 'link_tap',
      agentId,
      contentId: linkId,
      actorUid: request.auth?.uid,
      visitorId,
      localHour,
    })
  },
)

// ── Daily subscriber snapshot (runs at 00:30 UTC) ──
// Counts active digestSubscriptions per agent and writes one
// subscriber_snapshots doc per (agent, date). Powers the dashboard
// "Subscriber Growth" chart in the Insights tab.
export const dailySubscriberSnapshot = onSchedule(
  { schedule: '30 0 * * *', timeZone: 'UTC', region: 'us-central1' },
  async () => {
    const db = admin.firestore()
    const today = new Date().toISOString().slice(0, 10)

    // Bulk-fetch all active subscriptions, then bucket by agentId.
    // For Reelst's current scale this fits comfortably in memory; if
    // we cross ~50k subscribers we can switch to per-agent streaming.
    const subsSnap = await db
      .collection('digestSubscriptions')
      .where('status', '==', 'active')
      .get()

    const counts = new Map<string, number>()
    for (const sub of subsSnap.docs) {
      const agentId = (sub.data() as { agentId?: string }).agentId
      if (!agentId) continue
      counts.set(agentId, (counts.get(agentId) || 0) + 1)
    }

    // Write a snapshot for every agent (even those at 0) so the
    // chart line is continuous instead of dropping out on quiet
    // days. This means we walk the users collection to enumerate.
    const agentsSnap = await db.collection('users').where('role', '==', 'agent').get()
    let batch = db.batch()
    let pending = 0
    let total = 0

    for (const agentDoc of agentsSnap.docs) {
      const agentId = agentDoc.id
      const count = counts.get(agentId) || 0
      batch.set(db.collection('subscriber_snapshots').doc(`${agentId}_${today}`), {
        agentId,
        date: today,
        count,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      pending++
      total++
      if (pending >= 400) {
        await batch.commit()
        batch = db.batch()
        pending = 0
      }
    }
    if (pending > 0) await batch.commit()
    logger.info(`[analytics] daily subscriber snapshot: ${total} agents, total subs=${subsSnap.size}`)
  },
)
