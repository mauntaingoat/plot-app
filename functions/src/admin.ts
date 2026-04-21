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

      case 'gift':
        if (!giftTier || !giftExpiry) throw new HttpsError('invalid-argument', 'giftTier and giftExpiry required')
        await userRef.update({ giftTier, giftExpiry: admin.firestore.Timestamp.fromMillis(giftExpiry) })
        logger.info('[admin] gifted tier', { targetUid, giftTier, by: request.auth.uid })
        return { success: true }

      case 'revokeGift':
        await userRef.update({ giftTier: admin.firestore.FieldValue.delete(), giftExpiry: admin.firestore.FieldValue.delete() })
        logger.info('[admin] revoked gift', { targetUid, by: request.auth.uid })
        return { success: true }

      default:
        throw new HttpsError('invalid-argument', 'Unknown action')
    }
  },
)
