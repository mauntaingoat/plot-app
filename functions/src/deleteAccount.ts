/**
 * Cloud Function: deleteSelfAccount
 *
 * Client cannot delete their own data because Firestore rules
 * intentionally block delete on `users/{uid}`, `usernames/{x}`, and
 * `notifications/{x}`. This callable runs with Admin SDK so it
 * bypasses rules. It removes:
 *   - users/{uid}
 *   - usernames/{username}  (frees the handle)
 *   - pins where agentId == uid
 *   - content where agentId == uid
 *   - notifications where agentId == uid
 *   - showing_requests where agentId == uid
 *   - saves where userId == uid
 *   - the Firebase Auth user record (so the email isn't locked)
 *
 * The cleanupArchivedAssets scheduled function handles Mux + Storage
 * cleanup of any pin docs we just deleted (it walks doc-less Mux
 * assets / Storage paths older than 7 days).
 *
 * Deploy:
 *   firebase deploy --only functions:deleteSelfAccount
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

/** Delete every doc returned by `query` in batches of 400 (under the
 *  500-write batch cap). Returns the count deleted. */
async function deleteByQuery(
  query: admin.firestore.Query,
): Promise<number> {
  const db = admin.firestore()
  let total = 0
  // Loop in pages of 400 so we never blow the batch limit on agents
  // with many pins / events / saves.
  while (true) {
    const snap = await query.limit(400).get()
    if (snap.empty) break
    const batch = db.batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    total += snap.size
    if (snap.size < 400) break
  }
  return total
}

export const deleteSelfAccount = onCall(
  { region: 'us-central1' },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in.')

    const db = admin.firestore()
    const counts: Record<string, number> = {}

    // 1. Read user doc to grab username (need it to drop the claim).
    const userRef = db.collection('users').doc(uid)
    const userSnap = await userRef.get()
    const username = userSnap.exists
      ? (userSnap.data() as { username?: string | null })?.username
      : null

    // 2. Drop username claim (frees the handle for re-use).
    if (username) {
      try {
        await db.collection('usernames').doc(username.toLowerCase()).delete()
        counts.username = 1
      } catch (err) {
        logger.warn('deleteSelfAccount: username delete failed', { uid, username, err })
      }
    }

    // 3. Owned collections — paginated batched deletes.
    const ownedAgentColls = [
      'pins',
      'content',
      'notifications',
      'showing_requests',
      'waves',
    ]
    for (const name of ownedAgentColls) {
      try {
        counts[name] = await deleteByQuery(
          db.collection(name).where('agentId', '==', uid),
        )
      } catch (err) {
        logger.warn(`deleteSelfAccount: ${name} delete failed`, { uid, err })
      }
    }

    // 4. Saves use `userId` (consumer-side).
    try {
      counts.saves = await deleteByQuery(
        db.collection('saves').where('userId', '==', uid),
      )
    } catch (err) {
      logger.warn('deleteSelfAccount: saves delete failed', { uid, err })
    }

    // 5. Digest subscriptions tied to this agent.
    try {
      counts.digest_subscriptions = await deleteByQuery(
        db.collection('digest_subscriptions').where('agentId', '==', uid),
      )
    } catch (err) {
      logger.warn('deleteSelfAccount: digest_subscriptions delete failed', { uid, err })
    }

    // 6. User doc itself.
    try {
      await userRef.delete()
      counts.userDoc = 1
    } catch (err) {
      logger.warn('deleteSelfAccount: userDoc delete failed', { uid, err })
    }

    // 7. Firebase Auth record — frees the email so they can sign up
    //    fresh. Failures here are non-fatal: the data is gone, the
    //    user can request manual cleanup or wait for token expiry.
    try {
      await admin.auth().deleteUser(uid)
      counts.authUser = 1
    } catch (err) {
      logger.warn('deleteSelfAccount: auth user delete failed', { uid, err })
    }

    logger.info('deleteSelfAccount complete', { uid, counts })
    return { ok: true, counts }
  },
)
