/**
 * Cloud Function: setPinEnabled
 *
 * Server-side gate on the per-tier active-pin cap. Clients can no
 * longer set `pin.enabled = true` directly — the Firestore rule blocks
 * that write — they must call this function. We:
 *   1. Verify the caller owns the pin
 *   2. If activating, count the user's currently-active pins and
 *      compare against their tier's maxActivePins
 *   3. Either flip `enabled` on the pin doc, or throw a permission
 *      error the client surfaces as the paywall sheet
 *
 * Disabling (enabled: false) is allowed via direct client write — we
 * never need to gate "stop showing this pin." Only activation is
 * tier-controlled.
 *
 * Deploy:
 *   firebase deploy --only functions:setPinEnabled
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

// Mirror of /src/lib/tiers.ts. Kept inline here to avoid pulling the
// React app's TS into the functions build.
type Tier = 'free' | 'pro' | 'studio'

const ACTIVE_PIN_CAP: Record<Tier, number> = {
  free: 3,
  pro: 9999,
  studio: 9999,
}

const ADMIN_UIDS = new Set<string>([
  // Mirror of /src/lib/admin.ts admin uids — admins effectively get the
  // 'studio' cap. Keep in sync if the admin list changes.
])

interface UserDocLite {
  tier?: Tier
  giftTier?: Tier | null
  giftExpiry?: admin.firestore.Timestamp | number | null
}

function resolveTier(uid: string, userDoc: UserDocLite | undefined): Tier {
  if (ADMIN_UIDS.has(uid)) return 'studio'
  const gift = userDoc?.giftTier
  const expiry = userDoc?.giftExpiry
  if (gift && expiry) {
    const expiryMs =
      typeof (expiry as any)?.toMillis === 'function'
        ? (expiry as any).toMillis()
        : (expiry as number)
    if (expiryMs > Date.now()) return gift
  }
  return userDoc?.tier ?? 'free'
}

interface SetPinEnabledData {
  pinId?: string
  enabled?: boolean
}

export const setPinEnabled = onCall<SetPinEnabledData>(
  { region: 'us-central1' },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in.')

    const { pinId, enabled } = req.data ?? {}
    if (!pinId || typeof pinId !== 'string') {
      throw new HttpsError('invalid-argument', 'pinId is required.')
    }
    if (typeof enabled !== 'boolean') {
      throw new HttpsError('invalid-argument', 'enabled must be a boolean.')
    }

    const db = admin.firestore()
    const pinRef = db.collection('pins').doc(pinId)
    const pinSnap = await pinRef.get()
    if (!pinSnap.exists) throw new HttpsError('not-found', 'Pin does not exist.')
    const pin = pinSnap.data() as { agentId?: string; status?: string; enabled?: boolean }
    if (pin.agentId !== uid) {
      throw new HttpsError('permission-denied', 'Not your pin.')
    }
    if (pin.status === 'archived') {
      throw new HttpsError('failed-precondition', 'Pin is archived.')
    }

    // No-op if state already matches.
    if (pin.enabled === enabled) {
      return { ok: true, enabled }
    }

    // Disabling is always permitted; only activation is gated.
    if (enabled) {
      const userSnap = await db.collection('users').doc(uid).get()
      const tier = resolveTier(uid, userSnap.exists ? (userSnap.data() as UserDocLite) : undefined)
      const cap = ACTIVE_PIN_CAP[tier]

      if (cap < 9999) {
        // Count this agent's currently-active pins. Mirrors the
        // client-side isPinActive(): enabled=true AND status!='archived'
        // AND content.length > 0. We can't filter on content.length in
        // a query, so we count enabled+non-archived in the query and
        // then filter content in-memory.
        const activeSnap = await db
          .collection('pins')
          .where('agentId', '==', uid)
          .where('enabled', '==', true)
          .get()
        const activeCount = activeSnap.docs.filter((d) => {
          const data = d.data() as { status?: string; content?: unknown[] }
          return data.status !== 'archived' && Array.isArray(data.content) && data.content.length > 0
        }).length

        if (activeCount >= cap) {
          throw new HttpsError(
            'resource-exhausted',
            `You've reached the ${cap} active pin limit on the ${tier} plan. Upgrade or archive an active pin to continue.`,
            { upgradeTo: 'pro', activeCount, cap, tier },
          )
        }
      }
    }

    await pinRef.update({
      enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    logger.info('setPinEnabled', { uid, pinId, enabled })
    return { ok: true, enabled }
  },
)
