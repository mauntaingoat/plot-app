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
