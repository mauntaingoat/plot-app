import { onCall, onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

// ── Event logging helper ──
async function logEvent(data: {
  type: 'view' | 'tap' | 'save' | 'unsave' | 'follow' | 'unfollow'
  agentId: string
  pinId?: string
  contentId?: string
  actorUid?: string
  dedupeId?: string
  city?: string
  region?: string
  country?: string
}) {
  const db = admin.firestore()
  await db.collection('events').add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    hour: new Date().getHours(),
    date: new Date().toISOString().slice(0, 10),
  })
}

// Simple IP → city lookup via ip-api.com (free, no key needed, 45 req/min)
async function geolocateIp(ip: string): Promise<{ city: string; region: string; country: string } | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.city) return { city: data.city, region: data.regionName || '', country: data.country || '' }
  } catch { /* ignore */ }
  return null
}

function getClientIp(request: any): string {
  return request.rawRequest?.ip
    || request.rawRequest?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || ''
}

// ── Track View ──
export const trackView = onCall<{ pinId: string; contentId?: string }>(
  { cors: true, maxInstances: 20 },
  async (request) => {
    const { pinId, contentId } = request.data
    if (!pinId) return

    const db = admin.firestore()
    const pinRef = db.collection('pins').doc(pinId)
    const pinSnap = await pinRef.get()
    if (!pinSnap.exists) return
    const agentId = pinSnap.get('agentId') as string

    if (request.auth?.uid === agentId) return

    // Check for unique view (deduplicate by user + content)
    const viewerId = request.auth?.uid || 'anon'
    const dedupeId = contentId ? `${viewerId}_${pinId}_${contentId}` : `${viewerId}_${pinId}`
    const existingView = await db.collection('events')
      .where('dedupeId', '==', dedupeId).where('type', '==', 'view').limit(1).get()
    const isUnique = existingView.empty

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
          views: admin.firestore.FieldValue.increment(1),
          content,
        })
      })
    } else {
      await pinRef.update({ views: admin.firestore.FieldValue.increment(1) })
    }

    const ip = getClientIp(request)
    const geo = await geolocateIp(ip)
    await logEvent({
      type: 'view',
      agentId,
      pinId,
      contentId,
      actorUid: request.auth?.uid,
      dedupeId,
      ...(geo || {}),
    })
  },
)

// ── Track Engagement (tap, save, unsave) ──
export const trackEngagement = onCall<{ pinId: string; action: 'tap' | 'save' | 'unsave'; contentId?: string }>(
  { cors: true, maxInstances: 20 },
  async (request) => {
    const { pinId, action, contentId } = request.data
    if (!pinId || !action) return

    const db = admin.firestore()
    const pinRef = db.collection('pins').doc(pinId)
    const pinSnap = await pinRef.get()
    if (!pinSnap.exists) return
    const agentId = pinSnap.get('agentId') as string

    if (request.auth?.uid === agentId) return

    if (action === 'tap') {
      await pinRef.update({ taps: admin.firestore.FieldValue.increment(1) }).catch(() => {})
    } else if (action === 'save') {
      await pinRef.update({ saves: admin.firestore.FieldValue.increment(1) }).catch(() => {})
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
      const snap = await pinRef.get()
      if (snap.exists && (snap.data()?.saves || 0) > 0) {
        await pinRef.update({ saves: admin.firestore.FieldValue.increment(-1) }).catch(() => {})
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
    })
  },
)

// ── Daily follower snapshot (runs at midnight UTC) ──
export const dailyFollowerSnapshot = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'UTC', region: 'us-central1' },
  async () => {
    const db = admin.firestore()
    const today = new Date().toISOString().slice(0, 10)

    const agentsSnap = await db.collection('users').where('role', '==', 'agent').get()
    const batch = db.batch()
    let count = 0

    for (const doc of agentsSnap.docs) {
      const data = doc.data()
      batch.set(
        db.collection('follower_snapshots').doc(`${doc.id}_${today}`),
        {
          agentId: doc.id,
          date: today,
          count: data.followerCount || 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      )
      count++
      if (count % 400 === 0) {
        await batch.commit()
      }
    }
    if (count % 400 !== 0) await batch.commit()
    logger.info(`[analytics] daily follower snapshot: ${count} agents`)
  },
)
