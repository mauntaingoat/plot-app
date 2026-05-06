/**
 * Cloud Function: hourly cleanup of unverified accounts.
 *
 * Signups create a user with `emailVerified: false` and an `expiresAt`
 * 6 hours out. If the user verifies in time, their `/verify` page
 * client-side mirror writes `emailVerified: true` and clears
 * `expiresAt`. If they don't, this scheduled job deletes:
 *   - the Firebase Auth user (so the email can be re-registered)
 *   - the `users/{uid}` doc
 *   - the `usernames/{username}` doc (releases the @handle)
 *   - the `licenses/{state_number}` doc (releases the license claim)
 *
 * Runs every hour. Each invocation processes up to BATCH_LIMIT users.
 *
 * Deploy:
 *   firebase deploy --only functions:cleanupUnverifiedAccounts
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const BATCH_LIMIT = 200

/** Mirror of src/hooks/useLicense.ts → licenseDocId. Kept inline here
 *  so the function has no client-import dependency. */
function licenseDocId(licenseNumber: string, licenseState: string): string {
  const num = licenseNumber.replace(/\s+/g, '').toUpperCase()
  const state = licenseState.trim().toUpperCase()
  if (!num || !state) return ''
  return `${state}_${num}`
}

interface MinimalUserDoc {
  username?: string | null
  licenseNumber?: string | null
  licenseState?: string | null
}

export const cleanupUnverifiedAccounts = onSchedule(
  { schedule: '0 * * * *', timeZone: 'UTC', region: 'us-central1' },
  async () => {
    const db = admin.firestore()
    const now = admin.firestore.Timestamp.now()

    const snap = await db
      .collection('users')
      .where('emailVerified', '==', false)
      .where('expiresAt', '<=', now)
      .limit(BATCH_LIMIT)
      .get()

    if (snap.empty) {
      logger.info('[cleanupUnverified] no expired unverified accounts')
      return
    }

    let deletedAuth = 0
    let deletedDocs = 0
    let releasedUsernames = 0
    let releasedLicenses = 0

    for (const userSnap of snap.docs) {
      const uid = userSnap.id
      const data = userSnap.data() as MinimalUserDoc

      // Release username
      if (data.username) {
        try {
          await db.collection('usernames').doc(data.username.toLowerCase()).delete()
          releasedUsernames++
        } catch (err) {
          logger.warn('[cleanupUnverified] usernames delete failed', { uid, err: String(err) })
        }
      }

      // Release license
      if (data.licenseNumber && data.licenseState) {
        const licenseId = licenseDocId(data.licenseNumber, data.licenseState)
        if (licenseId) {
          try {
            await db.collection('licenses').doc(licenseId).delete()
            releasedLicenses++
          } catch (err) {
            logger.warn('[cleanupUnverified] license delete failed', { uid, licenseId, err: String(err) })
          }
        }
      }

      // Delete auth account so the email is reusable. Swallow
      // not-found — the user may have already nuked themselves via
      // /deleteSelfAccount, in which case we just keep cleaning.
      try {
        await admin.auth().deleteUser(uid)
        deletedAuth++
      } catch (err) {
        const code = (err as { code?: string }).code
        if (code !== 'auth/user-not-found') {
          logger.warn('[cleanupUnverified] auth delete failed', { uid, err: String(err) })
        }
      }

      // Delete the user doc last so a transient failure leaves a
      // recoverable state instead of orphaning auth/username/license.
      try {
        await userSnap.ref.delete()
        deletedDocs++
      } catch (err) {
        logger.warn('[cleanupUnverified] user doc delete failed', { uid, err: String(err) })
      }
    }

    logger.info('[cleanupUnverified] done', {
      scanned: snap.size,
      deletedAuth,
      deletedDocs,
      releasedUsernames,
      releasedLicenses,
    })
  },
)
