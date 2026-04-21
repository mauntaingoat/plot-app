import { onCall } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

export const trackView = onCall<{ pinId: string; contentId?: string }>(
  { cors: true, maxInstances: 20 },
  async (request) => {
    const { pinId, contentId } = request.data
    if (!pinId) return

    const db = admin.firestore()
    const pinRef = db.collection('pins').doc(pinId)

    if (contentId) {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(pinRef)
        if (!snap.exists) return
        const content: any[] = snap.get('content') ?? []
        const idx = content.findIndex((c) => c.id === contentId)
        if (idx !== -1) {
          content[idx] = { ...content[idx], views: (content[idx].views || 0) + 1 }
        }
        tx.update(pinRef, {
          views: admin.firestore.FieldValue.increment(1),
          content,
        })
      })
    } else {
      await pinRef.update({ views: admin.firestore.FieldValue.increment(1) })
    }
  },
)

export const trackEngagement = onCall<{ pinId: string; action: 'tap' | 'save' | 'unsave'; contentId?: string }>(
  { cors: true, maxInstances: 20 },
  async (request) => {
    const { pinId, action, contentId } = request.data
    if (!pinId || !action) return

    const db = admin.firestore()
    const pinRef = db.collection('pins').doc(pinId)

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
      await pinRef.update({ saves: admin.firestore.FieldValue.increment(-1) }).catch(() => {})
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
  },
)
