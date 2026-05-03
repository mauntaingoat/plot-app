import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const ADMIN_UIDS = ['nEiT2aIp0QPhzPoPJkeSNwPb6i33']

export const adminAction = onCall<{
  action: 'verify' | 'reject' | 'gift' | 'revokeGift'
  targetUid: string
  giftTier?: string
  giftExpiry?: number
}>(
  { cors: true, maxInstances: 5 },
  async (request) => {
    if (!request.auth || !ADMIN_UIDS.includes(request.auth.uid)) {
      throw new HttpsError('permission-denied', 'Admin access required.')
    }

    const { action, targetUid, giftTier, giftExpiry } = request.data
    if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid required')

    const db = admin.firestore()
    const userRef = db.collection('users').doc(targetUid)
    const snap = await userRef.get()
    if (!snap.exists) throw new HttpsError('not-found', 'User not found')

    switch (action) {
      case 'verify':
        await userRef.update({ verificationStatus: 'verified' })
        logger.info('[admin] verified user', { targetUid, by: request.auth.uid })
        return { success: true }

      case 'reject':
        await userRef.update({ verificationStatus: 'rejected' })
        logger.info('[admin] rejected user', { targetUid, by: request.auth.uid })
        return { success: true }

      case 'gift': {
        if (!giftTier || !giftExpiry) throw new HttpsError('invalid-argument', 'giftTier and giftExpiry required')
        await userRef.update({ giftTier, giftExpiry: admin.firestore.Timestamp.fromMillis(giftExpiry) })

        // Drop a notification into the gifted user's inbox so they
        // see it the next time they open the dashboard. The 10-year
        // expiry sentinel (~315M ms past now) is treated as "forever"
        // in the body copy.
        const tierName = String(giftTier).charAt(0).toUpperCase() + String(giftTier).slice(1)
        const expiryDate = new Date(giftExpiry)
        const isForever = giftExpiry - Date.now() > 365 * 5 * 86400000
        const expiryStr = isForever
          ? 'unlimited time'
          : `until ${expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        await db.collection('notifications').add({
          agentId: targetUid,
          type: 'gift',
          title: `${tierName} unlocked`,
          body: `You've been gifted ${tierName} for ${expiryStr}.`,
          read: false,
          date: new Date().toISOString().slice(0, 10),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        logger.info('[admin] gifted tier', { targetUid, giftTier, by: request.auth.uid })
        return { success: true }
      }

      case 'revokeGift':
        await userRef.update({ giftTier: admin.firestore.FieldValue.delete(), giftExpiry: admin.firestore.FieldValue.delete() })
        logger.info('[admin] revoked gift', { targetUid, by: request.auth.uid })
        return { success: true }

      default:
        throw new HttpsError('invalid-argument', 'Unknown action')
    }
  },
)
