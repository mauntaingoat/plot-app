import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, addDoc,
  collection, collectionGroup, query, where, getDocs, orderBy, limit,
  serverTimestamp, increment, onSnapshot, writeBatch,
  type DocumentData, type Unsubscribe,
} from 'firebase/firestore'
import { db, firebaseConfigured } from '@/config/firebase'
import type { UserDoc, Pin, ForSalePin, SoldPin, SpotlightPin, ContentItem, ContentDoc, Coordinates, PinType, ShowingRequest, ContentReport, ReportReason, LicenseDispute, DmcaRequest, PendingPinChange } from '@/lib/types'
import { TYPE_SPECIFIC_FIELDS } from '@/lib/types'

// ══════════════════════════════════════════
// USERS
// ══════════════════════════════════════════

export async function getUserByUsername(username: string): Promise<UserDoc | null> {
  if (!db) return null
  // Primary path: look up the usernames collection (fast, indexed).
  const usernameSnap = await getDoc(doc(db, 'usernames', username.toLowerCase()))
  if (usernameSnap.exists()) {
    const { uid } = usernameSnap.data()
    const userSnap = await getDoc(doc(db, 'users', uid))
    if (userSnap.exists()) return { uid: userSnap.id, ...userSnap.data() } as UserDoc
  }
  // Fallback: the usernames doc may not exist if sign-up partially
  // failed or the claim write was skipped. Query users collection
  // directly by the username field.
  const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  // Backfill the missing usernames doc so future lookups are fast.
  setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: d.id, createdAt: serverTimestamp() }).catch(() => {})
  return { uid: d.id, ...d.data() } as UserDoc
}

export async function getUserById(uid: string): Promise<UserDoc | null> {
  if (!db) return null
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() } as UserDoc
}

export async function createUserDoc(uid: string, data: Partial<UserDoc>) {
  if (!db) return
  await setDoc(doc(db, 'users', uid), {
    uid,
    email: '',
    role: 'consumer',
    createdAt: serverTimestamp(),
    username: null,
    displayName: '',
    photoURL: null,
    bio: '',
    brokerage: null,
    licenseNumber: null,
    licenseState: null,
    licenseName: null,
    verificationStatus: 'unverified',
    fairHousingAccepted: false,
    dataSecurityAccepted: false,
    emailVerified: false,
    tier: 'free',
    brandColor: null,
    platforms: [],
    followerCount: 0,
    followingCount: 0,
    onboardingComplete: false,
    onboardingStep: 0,
    setupPercent: 0,
    ...data,
  })
}

export async function updateUserDoc(uid: string, data: Partial<UserDoc>) {
  if (!db) return
  await updateDoc(doc(db, 'users', uid), data as DocumentData)
}

// ══════════════════════════════════════════
// PINS (Listings + Neighborhoods)
// ══════════════════════════════════════════

// Pins are created in DRAFT state (enabled: false). Activation goes
// through the setPinEnabled callable which checks the agent's
// per-tier active-pin cap. The Firestore rule enforces this default
// — a client write that sets enabled=true on create will be rejected.
export async function createPin(data: Record<string, unknown>): Promise<string> {
  if (!db) return `local-${Date.now()}`
  const ref = await addDoc(collection(db, 'pins'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    views: 0,
    taps: 0,
    saves: 0,
    enabled: false,
    status: 'active',
    content: data.content || [],
  })
  return ref.id
}

// Wrap the setPinEnabled callable with a friendly client API. Returns
// { ok: true } on success or throws an Error with the cap reason for
// the caller to surface (paywall sheet, toast, etc.).
export async function setPinEnabled(pinId: string, enabled: boolean): Promise<void> {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const { app } = await import('@/config/firebase')
  const functions = getFunctions(app ?? undefined)
  const fn = httpsCallable<{ pinId: string; enabled: boolean }, { ok: boolean }>(functions, 'setPinEnabled')
  await fn({ pinId, enabled })
}

// ══════════════════════════════════════════
// PENDING PIN CHANGES (Rentcast sync diffs)
// ══════════════════════════════════════════

/**
 * Subscribe to all pending property-data changes for an agent. Pushes
 * an empty array if the agent has nothing pending. The Cloud Function
 * (syncPropertyData) is the only producer; only the agent can delete.
 */
export function subscribeToAgentPendingChanges(
  agentId: string,
  cb: (changes: PendingPinChange[]) => void,
): Unsubscribe | null {
  if (!db) return null
  try {
    const q = query(
      collectionGroup(db, 'pendingChanges'),
      where('agentId', '==', agentId),
    )
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => d.data() as PendingPinChange))
    }, (err) => {
      console.warn('[firestore] pendingChanges subscription error:', err.message)
      cb([])
    })
  } catch {
    return null
  }
}

/**
 * Approve a pending change — apply the diff to the pin doc and delete
 * the pendingChanges record. Type transitions route through
 * updatePinType so type-specific fields get cleaned up.
 */
export async function approvePendingChange(change: PendingPinChange): Promise<void> {
  if (!db) return
  const pinRef = doc(db, 'pins', change.pinId)
  const pendingRef = doc(db, 'pins', change.pinId, 'pendingChanges', 'latest')

  if (change.typeChange) {
    // Type transition — for_sale ↔ sold. Build the new-shape data and
    // route through updatePinType so old-type-only fields disappear.
    const newType = change.typeChange.to
    const newData: Record<string, unknown> = {}
    if (change.priceChange) {
      newData[newType === 'sold' ? 'soldPrice' : 'price'] = change.priceChange.to
      if (newType === 'sold') {
        newData.originalPrice = change.priceChange.from
      }
    }
    if (newType === 'sold' && change.soldDate) {
      // Firestore is strict about timestamps; the date string from
      // Rentcast is ISO so we store it as-is — UI parses on read.
      newData.soldDate = change.soldDate
    }
    if (change.mlsNumber !== undefined) newData.mlsNumber = change.mlsNumber
    await updatePinType(change.pinId, change.typeChange.from, newType, newData)
  } else if (change.priceChange) {
    // Price-only change. Apply to the field corresponding to the pin's
    // current type — the diff was computed against that field.
    const pinSnap = await getDoc(pinRef)
    const currentType = (pinSnap.data() as { type?: PinType } | undefined)?.type
    const priceField = currentType === 'sold' ? 'soldPrice' : 'price'
    const updates: Record<string, unknown> = {
      [priceField]: change.priceChange.to,
      updatedAt: serverTimestamp(),
    }
    if (change.mlsNumber !== undefined) updates.mlsNumber = change.mlsNumber
    await updateDoc(pinRef, updates as DocumentData)
  }

  await deleteDoc(pendingRef)
}

/**
 * Reject a pending change — write the rejected values to the pin's
 * `rejectedSnapshot` field so the next sync skips re-suggesting the
 * same change, and delete the pendingChanges record.
 */
export async function rejectPendingChange(change: PendingPinChange): Promise<void> {
  if (!db) return
  const pinRef = doc(db, 'pins', change.pinId)
  const pendingRef = doc(db, 'pins', change.pinId, 'pendingChanges', 'latest')

  const rejected: Record<string, unknown> = {}
  if (change.priceChange) rejected.price = change.priceChange.to
  if (change.typeChange) rejected.type = change.typeChange.to

  await updateDoc(pinRef, {
    rejectedSnapshot: rejected,
    updatedAt: serverTimestamp(),
  } as DocumentData)
  await deleteDoc(pendingRef)
}

/** Accepts any partial pin fields — including subtype-specific ones
 *  (ForSalePin's openHouse, SoldPin's soldPrice, etc.) so callers
 *  don't need `as any` casts. Firestore is schema-less; the TS
 *  union type Pin = ForSalePin | SoldPin | SpotlightPin makes
 *  Partial<Pin> too narrow for cross-subtype writes. */
export async function updatePin(pinId: string, data: Partial<ForSalePin> | Partial<SoldPin> | Partial<SpotlightPin> | Record<string, unknown>) {
  if (!db) return
  await updateDoc(doc(db, 'pins', pinId), {
    ...data,
    updatedAt: serverTimestamp(),
  } as DocumentData)
}

/**
 * Atomic pin-type transition with cleanup of stale type-specific fields.
 *
 * When a pin's type changes (for_sale ↔ sold ↔ spotlight), the fields
 * that were specific to the old type but not the new type get bloat-y
 * — they linger in Firestore as orphan data. This helper computes the
 * field-level diff from TYPE_SPECIFIC_FIELDS and writes deleteField()
 * sentinels for everything that should go, alongside the new fields,
 * in a single update call.
 *
 * If `oldType === newType` this is just a regular updatePin.
 */
export async function updatePinType(
  pinId: string,
  oldType: PinType,
  newType: PinType,
  newData: Record<string, unknown>,
): Promise<void> {
  if (!db) return
  const writes: Record<string, unknown> = {
    ...newData,
    type: newType,
    updatedAt: serverTimestamp(),
  }
  if (oldType !== newType) {
    const oldFields = new Set(TYPE_SPECIFIC_FIELDS[oldType] ?? [])
    const newFields = new Set(TYPE_SPECIFIC_FIELDS[newType] ?? [])
    const incomingKeys = new Set(Object.keys(newData))
    for (const f of oldFields) {
      // Drop fields that belong to the old type but not the new one,
      // unless the caller is explicitly setting them as part of the
      // transition (rare but legal — e.g., 'description' is shared).
      if (!newFields.has(f) && !incomingKeys.has(f)) {
        writes[f] = deleteField()
      }
    }
  }
  await updateDoc(doc(db, 'pins', pinId), writes as DocumentData)
}

// Soft delete — archive instead of destroy. Data persists for 7 days
// before the cleanupArchivedAssets scheduled Cloud Function deletes the
// pin's Storage + Mux assets and hard-deletes the doc. archivedAt is
// the cutoff anchor.
export async function archivePin(pinId: string) {
  if (!db) return
  await updateDoc(doc(db, 'pins', pinId), {
    status: 'archived',
    enabled: false,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// ── License duplicate check ──

export async function checkLicenseDuplicate(licenseNumber: string, licenseState: string): Promise<{ exists: boolean; uid?: string; username?: string }> {
  if (!db) return { exists: false }
  const q = query(
    collection(db, 'users'),
    where('licenseNumber', '==', licenseNumber),
    where('licenseState', '==', licenseState),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return { exists: false }
  const existing = snap.docs[0].data() as UserDoc
  return { exists: true, uid: existing.uid, username: existing.username || undefined }
}

export async function addContentToPin(pinId: string, content: ContentItem) {
  if (!db) return
  const pinRef = doc(db, 'pins', pinId)
  const snap = await getDoc(pinRef)
  if (!snap.exists()) return
  const existing = snap.data().content || []
  await updateDoc(pinRef, {
    content: [...existing, content],
    updatedAt: serverTimestamp(),
  })
}

export async function removeContentFromPin(pinId: string, contentId: string) {
  if (!db) return
  const pinRef = doc(db, 'pins', pinId)
  const snap = await getDoc(pinRef)
  if (!snap.exists()) return
  const existing = (snap.data().content || []) as ContentItem[]
  await updateDoc(pinRef, {
    content: existing.filter((c) => c.id !== contentId),
    updatedAt: serverTimestamp(),
  })
}

export async function getAgentPins(agentId: string): Promise<Pin[]> {
  if (!db) return []
  const notArchived = (d: { data: () => Record<string, unknown> }) => d.data().status !== 'archived'
  try {
    const q = query(
      collection(db, 'pins'),
      where('agentId', '==', agentId),
      where('enabled', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1000)
    )
    const snap = await getDocs(q)
    return snap.docs.filter(notArchived).map((d) => ({ id: d.id, ...d.data() }) as Pin)
  } catch (err) {
    console.warn('[firestore] getAgentPins falling back (no index?):', (err as Error).message)
    const fallbackQ = query(
      collection(db, 'pins'),
      where('agentId', '==', agentId),
      limit(1000)
    )
    const snap = await getDocs(fallbackQ)
    return snap.docs
      .filter((d) => d.data().enabled !== false && d.data().status !== 'archived')
      .map((d) => ({ id: d.id, ...d.data() }) as Pin)
  }
}

export async function getExplorePins(): Promise<Pin[]> {
  if (!db) return []
  try {
    const q = query(collection(db, 'pins'), where('enabled', '==', true), orderBy('createdAt', 'desc'), limit(1000))
    const snap = await getDocs(q)
    return snap.docs.filter((d) => d.data().status !== 'archived').map((d) => ({ id: d.id, ...d.data() } as Pin))
  } catch {
    const q = query(collection(db, 'pins'), where('enabled', '==', true), limit(1000))
    const snap = await getDocs(q)
    return snap.docs.filter((d) => d.data().status !== 'archived').map((d) => ({ id: d.id, ...d.data() } as Pin))
  }
}

export async function getPinsByAgentIds(agentIds: string[]): Promise<Pin[]> {
  if (!db || agentIds.length === 0) return []
  const results: Pin[] = []
  const chunks = []
  for (let i = 0; i < agentIds.length; i += 10) chunks.push(agentIds.slice(i, i + 10))
  for (const chunk of chunks) {
    const q = query(collection(db, 'pins'), where('agentId', 'in', chunk), where('enabled', '==', true), limit(1000))
    const snap = await getDocs(q)
    results.push(...snap.docs.filter((d) => d.data().status !== 'archived').map((d) => ({ id: d.id, ...d.data() } as Pin)))
  }
  return results
}

export async function getPinsByIds(pinIds: string[]): Promise<Pin[]> {
  if (!db || pinIds.length === 0) return []
  const results: Pin[] = []
  const chunks = []
  for (let i = 0; i < pinIds.length; i += 10) chunks.push(pinIds.slice(i, i + 10))
  for (const chunk of chunks) {
    const { documentId } = await import('firebase/firestore')
    const q = query(collection(db!, 'pins'), where(documentId(), 'in', chunk))
    const snap = await getDocs(q)
    results.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pin)))
  }
  return results
}

export function subscribeToAgentPins(agentId: string, callback: (pins: Pin[]) => void): Unsubscribe | null {
  if (!db) return null
  const notArchived = (d: { data: () => Record<string, unknown> }) => d.data().status !== 'archived'
  const q = query(
    collection(db, 'pins'),
    where('agentId', '==', agentId),
    where('enabled', '==', true),
    orderBy('createdAt', 'desc'),
    limit(1000)
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.filter(notArchived).map((d) => ({ id: d.id, ...d.data() }) as Pin))
    },
    (err) => {
      console.warn('[firestore] subscribeToAgentPins fallback:', err.message)
      const fallbackQ = query(collection(db!, 'pins'), where('agentId', '==', agentId), limit(1000))
      getDocs(fallbackQ).then((snap) => {
        callback(snap.docs.filter((d) => d.data().enabled !== false && d.data().status !== 'archived').map((d) => ({ id: d.id, ...d.data() }) as Pin))
      }).catch(() => callback([]))
    },
  )
}

/** Dashboard variant — returns agent pins (enabled + disabled) but
 *  excludes archived pins. Falls back to a simpler query (no orderBy)
 *  if the composite index doesn't exist yet. */
export function subscribeToAllAgentPins(agentId: string, callback: (pins: Pin[]) => void): Unsubscribe | null {
  if (!db) return null
  const filterArchived = (docs: typeof import('firebase/firestore').QuerySnapshot.prototype.docs) =>
    docs.filter((d) => d.data().status !== 'archived').map((d) => ({ id: d.id, ...d.data() }) as Pin)
  const q = query(
    collection(db, 'pins'),
    where('agentId', '==', agentId),
    orderBy('createdAt', 'desc'),
    limit(1000)
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(filterArchived(snap.docs))
    },
    (err) => {
      console.warn('[firestore] subscribeToAllAgentPins error (trying fallback):', err.message)
      const fallbackQ = query(
        collection(db!, 'pins'),
        where('agentId', '==', agentId),
        limit(1000)
      )
      getDocs(fallbackQ).then((snap) => callback(filterArchived(snap.docs))).catch(() => callback([]))
    },
  )
}

// ══════════════════════════════════════════
// FOLLOWS
// ══════════════════════════════════════════

export async function followAgent(followerUid: string, agentUid: string) {
  if (!db) return
  const followId = `${followerUid}_${agentUid}`
  await setDoc(doc(db, 'follows', followId), {
    followerUid,
    followedUid: agentUid,
    createdAt: serverTimestamp(),
  })
  // Counter increments handled server-side by onNewFollower Cloud Function
}

export async function unfollowAgent(followerUid: string, agentUid: string) {
  if (!db) return
  const followId = `${followerUid}_${agentUid}`
  await deleteDoc(doc(db, 'follows', followId))
  // Counter decrements handled server-side by onUnfollow Cloud Function
}

export async function isFollowing(followerUid: string, agentUid: string): Promise<boolean> {
  if (!db) return false
  const followId = `${followerUid}_${agentUid}`
  const snap = await getDoc(doc(db, 'follows', followId))
  return snap.exists()
}

export async function getFollowers(agentUid: string): Promise<string[]> {
  if (!db) return []
  const q = query(collection(db, 'follows'), where('followedUid', '==', agentUid), limit(500))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data().followerUid)
}

// ══════════════════════════════════════════
// SAVES
// ══════════════════════════════════════════

export async function savePin(userId: string, pinId: string, contentId?: string) {
  if (!db) return
  const saveId = contentId ? `${userId}_${pinId}_${contentId}` : `${userId}_${pinId}`
  await setDoc(doc(db, 'saves', saveId), {
    userId,
    pinId,
    contentId: contentId || null,
    createdAt: serverTimestamp(),
  })
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const { app } = await import('@/config/firebase')
  httpsCallable(getFunctions(app ?? undefined), 'trackEngagement')({ pinId, action: 'save', contentId, localHour: new Date().getHours() }).catch(() => {})
}

export async function unsavePin(userId: string, pinId: string, contentId?: string) {
  if (!db) return
  const saveId = contentId ? `${userId}_${pinId}_${contentId}` : `${userId}_${pinId}`
  await deleteDoc(doc(db, 'saves', saveId))
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const { app } = await import('@/config/firebase')
  httpsCallable(getFunctions(app ?? undefined), 'trackEngagement')({ pinId, action: 'unsave', contentId, localHour: new Date().getHours() }).catch(() => {})
}

export async function getUserSaves(userId: string): Promise<{ pinId: string; contentId?: string }[]> {
  if (!db) return []
  const q = query(collection(db, 'saves'), where('userId', '==', userId), limit(1000))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ pinId: d.data().pinId, contentId: d.data().contentId }))
}

// ── Shared saved maps ──

export async function createSharedMap(userId: string, displayName: string, pinIds: string[]): Promise<string> {
  // Generate a short share ID (8 chars)
  const shareId = Math.random().toString(36).substring(2, 10)
  if (!db) return shareId
  await setDoc(doc(db, 'shared_maps', shareId), {
    shareId,
    userId,
    displayName,
    pinIds,
    createdAt: serverTimestamp(),
  })
  return shareId
}

export async function getSharedMap(shareId: string): Promise<{ shareId: string; userId: string; displayName: string; pinIds: string[] } | null> {
  if (!db) return null
  const snap = await getDoc(doc(db, 'shared_maps', shareId))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    shareId: data.shareId,
    userId: data.userId,
    displayName: data.displayName,
    pinIds: data.pinIds || [],
  }
}

// ══════════════════════════════════════════
// SHOWING REQUESTS (lead capture)
// ══════════════════════════════════════════

export async function createShowingRequest(
  data: Omit<ShowingRequest, 'id' | 'createdAt' | 'status'>,
): Promise<string> {
  if (!db) {
    // Demo fallback — store in localStorage so the agent inbox demo still works
    const id = `req_${Date.now()}`
    const list = JSON.parse(localStorage.getItem('reelst_showing_requests') || '[]')
    list.push({ ...data, id, status: 'new', createdAt: { toMillis: () => Date.now() } })
    localStorage.setItem('reelst_showing_requests', JSON.stringify(list))
    return id
  }
  const ref = await addDoc(collection(db, 'showing_requests'), {
    ...data,
    status: 'new',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function listShowingRequests(agentId: string): Promise<ShowingRequest[]> {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_showing_requests') || '[]')
    return list.filter((r: ShowingRequest) => r.agentId === agentId)
  }
  const q = query(
    collection(db, 'showing_requests'),
    where('agentId', '==', agentId),
    orderBy('createdAt', 'desc'),
    limit(1000),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShowingRequest))
}

export function subscribeToShowingRequests(
  agentId: string,
  cb: (reqs: ShowingRequest[]) => void,
): Unsubscribe | null {
  if (!db) return null
  try {
    const q = query(
      collection(db, 'showing_requests'),
      where('agentId', '==', agentId),
      orderBy('createdAt', 'desc'),
      limit(1000),
    )
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShowingRequest)))
    }, (err) => {
      console.warn('[firestore] showing_requests subscription error, falling back:', err.message)
      const fallbackQ = query(
        collection(db!, 'showing_requests'),
        where('agentId', '==', agentId),
        limit(1000),
      )
      onSnapshot(fallbackQ, (snap) => {
        const reqs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShowingRequest))
        reqs.sort((a, b) => {
          const aMs = typeof (a as any).createdAt?.toMillis === 'function' ? (a as any).createdAt.toMillis() : 0
          const bMs = typeof (b as any).createdAt?.toMillis === 'function' ? (b as any).createdAt.toMillis() : 0
          return bMs - aMs
        })
        cb(reqs)
      }, () => cb([]))
    })
  } catch {
    return null
  }
}

export async function updateShowingRequestStatus(
  requestId: string,
  status: ShowingRequest['status'],
) {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_showing_requests') || '[]')
    const updated = list.map((r: ShowingRequest) => (r.id === requestId ? { ...r, status } : r))
    localStorage.setItem('reelst_showing_requests', JSON.stringify(updated))
    return
  }
  await updateDoc(doc(db, 'showing_requests', requestId), { status })
}

// ══════════════════════════════════════════
// PIN VIEWS (increment on tap)
// ══════════════════════════════════════════

export async function incrementPinTap(pinId: string) {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const { app } = await import('@/config/firebase')
  const fn = httpsCallable(getFunctions(app ?? undefined), 'trackEngagement')
  fn({ pinId, action: 'tap', localHour: new Date().getHours() }).catch(() => {})
}

// ══════════════════════════════════════════
// FEATURED AGENTS (for explore page)
// ══════════════════════════════════════════

export async function getFeaturedAgents(max = 10): Promise<UserDoc[]> {
  if (!db) return []
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'agent'),
    where('onboardingComplete', '==', true),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }) as UserDoc)
    .sort((a, b) => b.followerCount - a.followerCount)
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

export function formatPrice(price: number): string {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`
  return `$${price}`
}

export function getBounds(coords: Coordinates[]): [[number, number], [number, number]] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  for (const c of coords) {
    if (c.lng < minLng) minLng = c.lng
    if (c.lat < minLat) minLat = c.lat
    if (c.lng > maxLng) maxLng = c.lng
    if (c.lat > maxLat) maxLat = c.lat
  }
  const pad = 0.01
  return [[minLng - pad, minLat - pad], [maxLng + pad, maxLat + pad]]
}

export function calculateSetupPercent(user: Partial<UserDoc>, pinCount: number): number {
  let percent = 0
  if (user.username) percent += 10
  if (user.photoURL) percent += 15
  if (user.bio && user.bio.length > 0) percent += 10
  if (user.platforms && user.platforms.length > 0) percent += 15
  if (user.licenseNumber) percent += 10
  if (pinCount >= 1) percent += 20
  if (user.displayName && user.displayName.length > 0) percent += 10
  if (pinCount >= 3) percent += 10
  return percent
}

// ══════════════════════════════════════════
// CONTENT REPORTS (moderation)
// ══════════════════════════════════════════

export async function createReport(
  data: Omit<ContentReport, 'id' | 'createdAt' | 'status'>,
): Promise<string> {
  if (!db) {
    const id = `report_${Date.now()}`
    const list = JSON.parse(localStorage.getItem('reelst_reports') || '[]')
    list.push({ ...data, id, status: 'pending', createdAt: { toMillis: () => Date.now() } })
    localStorage.setItem('reelst_reports', JSON.stringify(list))
    return id
  }
  const ref = await addDoc(collection(db, 'reports'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function listReports(status?: string): Promise<ContentReport[]> {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_reports') || '[]')
    return status ? list.filter((r: ContentReport) => r.status === status) : list
  }
  const q = status
    ? query(collection(db, 'reports'), where('status', '==', status), orderBy('createdAt', 'desc'), limit(1000))
    : query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(1000))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContentReport))
}

export async function updateReportStatus(reportId: string, status: ContentReport['status']) {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_reports') || '[]')
    const updated = list.map((r: ContentReport) => (r.id === reportId ? { ...r, status } : r))
    localStorage.setItem('reelst_reports', JSON.stringify(updated))
    return
  }
  await updateDoc(doc(db, 'reports', reportId), { status })
}

// ══════════════════════════════════════════
// LICENSE DISPUTES
// ══════════════════════════════════════════

export async function createDispute(
  data: Omit<LicenseDispute, 'id' | 'createdAt' | 'status'>,
): Promise<string> {
  if (!db) {
    const id = `dispute_${Date.now()}`
    const list = JSON.parse(localStorage.getItem('reelst_disputes') || '[]')
    list.push({ ...data, id, status: 'pending', createdAt: { toMillis: () => Date.now() } })
    localStorage.setItem('reelst_disputes', JSON.stringify(list))
    return id
  }
  const ref = await addDoc(collection(db, 'disputes'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ══════════════════════════════════════════
// GEO-SCOPED PIN LISTENERS
// ══════════════════════════════════════════

/**
 * Subscribe to pins within a geohash range (viewport-scoped).
 * Uses geohash prefix queries for efficient reads.
 * Returns unsubscribe function.
 */
export function subscribeToGeoPins(
  geohashPrefix: string,
  callback: (pins: Pin[]) => void,
): Unsubscribe | null {
  if (!db) return null
  const q = query(
    collection(db, 'pins'),
    where('geohash', '>=', geohashPrefix),
    where('geohash', '<=', geohashPrefix + '\uf8ff'),
    where('enabled', '==', true),
    limit(1000),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pin)))
  }, (err) => { console.warn('[firestore] geohash subscription error:', err.message) })
}

export async function listDisputes(): Promise<LicenseDispute[]> {
  if (!db) {
    return JSON.parse(localStorage.getItem('reelst_disputes') || '[]')
  }
  const q = query(collection(db, 'disputes'), orderBy('createdAt', 'desc'), limit(50))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LicenseDispute))
}

// ══════════════════════════════════════════
// DMCA TAKEDOWN REQUESTS
// ══════════════════════════════════════════

export async function createDmcaRequest(
  data: Omit<DmcaRequest, 'id' | 'createdAt' | 'status'>,
): Promise<string> {
  if (!db) {
    const id = `dmca_${Date.now()}`
    const list = JSON.parse(localStorage.getItem('reelst_dmca') || '[]')
    list.push({ ...data, id, status: 'pending', createdAt: { toMillis: () => Date.now() } })
    localStorage.setItem('reelst_dmca', JSON.stringify(list))
    return id
  }
  const ref = await addDoc(collection(db, 'dmca_requests'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ══════════════════════════════════════════
// CONTENT LIBRARY (standalone content collection)
// ══════════════════════════════════════════

export async function createContent(data: Omit<ContentDoc, 'id' | 'createdAt' | 'views' | 'saves'>): Promise<string> {
  if (!db) {
    const id = `content_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const list = JSON.parse(localStorage.getItem('reelst_content') || '[]')
    list.push({ ...data, id, views: 0, saves: 0, createdAt: { toMillis: () => Date.now() } })
    localStorage.setItem('reelst_content', JSON.stringify(list))
    return id
  }
  const ref = await addDoc(collection(db, 'content'), {
    ...data,
    views: 0,
    saves: 0,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function upsertContent(contentId: string, data: Partial<ContentDoc>) {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_content') || '[]')
    const idx = list.findIndex((c: ContentDoc) => c.id === contentId)
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data }
    } else {
      list.push({ ...data, id: contentId, views: 0, saves: 0, createdAt: { toMillis: () => Date.now() } })
    }
    localStorage.setItem('reelst_content', JSON.stringify(list))
    return
  }
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  )
  await setDoc(doc(db, 'content', contentId), {
    ...clean,
    views: (data as any).views ?? 0,
    saves: (data as any).saves ?? 0,
    createdAt: serverTimestamp(),
  }, { merge: true })
}

export async function getAgentContent(agentId: string): Promise<ContentDoc[]> {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_content') || '[]')
    return list.filter((c: ContentDoc) => c.agentId === agentId)
  }
  // Archived items linger for 7 days awaiting Mux/Storage cleanup —
  // hide them from list views so the agent doesn't see ghost content.
  const stripArchived = (docs: ContentDoc[]) => docs.filter((c) => !c.archivedAt)
  try {
    const q = query(
      collection(db, 'content'),
      where('agentId', '==', agentId),
      orderBy('createdAt', 'desc'),
      limit(1000),
    )
    const snap = await getDocs(q)
    return stripArchived(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContentDoc)))
  } catch (err) {
    console.warn('[firestore] getAgentContent fallback:', (err as Error).message)
    const fallbackQ = query(
      collection(db, 'content'),
      where('agentId', '==', agentId),
      limit(1000),
    )
    const snap = await getDocs(fallbackQ)
    return stripArchived(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContentDoc)))
  }
}

export async function updateContent(contentId: string, data: Partial<ContentDoc>) {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_content') || '[]')
    const updated = list.map((c: ContentDoc) => c.id === contentId ? { ...c, ...data } : c)
    localStorage.setItem('reelst_content', JSON.stringify(updated))
    return
  }
  // Strip undefined values — Firestore rejects them.
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  )
  await updateDoc(doc(db, 'content', contentId), clean as any)
}

export async function linkContentToPin(contentId: string, pinId: string | null) {
  return updateContent(contentId, { pinId })
}

// Soft delete — keep the doc for 7 days so cleanupArchivedAssets can
// tear down the associated Mux asset alongside the doc. Stamp
// archivedAt to anchor the 7-day window. Demo / no-DB mode keeps the
// hard-delete since localStorage has no orphan-cleanup concerns.
export async function archiveContent(contentId: string) {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_content') || '[]')
    localStorage.setItem('reelst_content', JSON.stringify(list.filter((c: ContentDoc) => c.id !== contentId)))
    return
  }
  await updateDoc(doc(db, 'content', contentId), {
    archivedAt: serverTimestamp(),
  })
}

// ══════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════

export interface NotificationDoc {
  id: string
  agentId: string
  type: 'follow' | 'save' | 'showing_request'
  title: string
  body: string
  read: boolean
  createdAt: import('firebase/firestore').Timestamp
  actorName?: string
  actorUid?: string
  pinId?: string
  pinAddress?: string
  refId?: string
}

export async function getNotifications(agentId: string): Promise<NotificationDoc[]> {
  if (!db) return []
  try {
    const q = query(
      collection(db, 'notifications'),
      where('agentId', '==', agentId),
      orderBy('createdAt', 'desc'),
      limit(200),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationDoc))
  } catch (err) {
    console.warn('[firestore] getNotifications ordered query failed, trying fallback:', (err as Error).message)
    try {
      const fallbackQ = query(collection(db, 'notifications'), where('agentId', '==', agentId), limit(200))
      const snap = await getDocs(fallbackQ)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationDoc))
    } catch (err2) {
      console.error('[firestore] getNotifications fallback also failed:', (err2 as Error).message)
      return []
    }
  }
}

export function subscribeToNotifications(agentId: string, cb: (docs: NotificationDoc[]) => void): Unsubscribe | null {
  if (!db) return null
  try {
    const q = query(
      collection(db, 'notifications'),
      where('agentId', '==', agentId),
      orderBy('createdAt', 'desc'),
      limit(1000),
    )
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationDoc)))
    }, (err) => {
      console.warn('[firestore] notifications subscription error, trying fallback:', err.message)
      const fallbackQ = query(
        collection(db!, 'notifications'),
        where('agentId', '==', agentId),
        limit(1000),
      )
      onSnapshot(fallbackQ, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationDoc))
        docs.sort((a, b) => {
          const aMs = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0
          const bMs = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0
          return bMs - aMs
        })
        cb(docs)
      }, () => cb([]))
    })
  } catch {
    return null
  }
}

export async function markNotificationsRead(ids: string[]) {
  if (!db || ids.length === 0) return
  const batch = (await import('firebase/firestore')).writeBatch(db)
  for (const id of ids) {
    batch.update(doc(db, 'notifications', id), { read: true })
  }
  await batch.commit()
}

// ══════════════════════════════════════════
// DELETE ACCOUNT
// ══════════════════════════════════════════

export async function deleteAccount(uid: string) {
  if (!db) return

  const batch = writeBatch(db)

  // Delete user doc
  batch.delete(doc(db, 'users', uid))

  // Delete username claim
  const userSnap = await getDoc(doc(db, 'users', uid))
  const username = userSnap.data()?.username
  if (username) batch.delete(doc(db, 'usernames', username.toLowerCase()))

  await batch.commit()

  // Delete related collections in smaller batches
  const collections = [
    { name: 'pins', field: 'agentId' },
    { name: 'content', field: 'agentId' },
    { name: 'notifications', field: 'agentId' },
    { name: 'showing_requests', field: 'agentId' },
  ]
  for (const col of collections) {
    const q = query(collection(db, col.name), where(col.field, '==', uid))
    const snap = await getDocs(q)
    const b = writeBatch(db)
    snap.docs.forEach((d) => b.delete(d.ref))
    if (snap.docs.length > 0) await b.commit()
  }

  // Delete follows (both directions)
  for (const field of ['followerUid', 'followedUid']) {
    const q = query(collection(db, 'follows'), where(field, '==', uid))
    const snap = await getDocs(q)
    const b = writeBatch(db)
    snap.docs.forEach((d) => b.delete(d.ref))
    if (snap.docs.length > 0) await b.commit()
  }

  // Delete saves
  const savesQ = query(collection(db, 'saves'), where('userId', '==', uid))
  const savesSnap = await getDocs(savesQ)
  const sb = writeBatch(db)
  savesSnap.docs.forEach((d) => sb.delete(d.ref))
  if (savesSnap.docs.length > 0) await sb.commit()
}

// ══════════════════════════════════════════
// ANALYTICS QUERIES
// ══════════════════════════════════════════

export interface AnalyticsEvent {
  type: string
  agentId: string
  pinId?: string
  contentId?: string
  actorUid?: string
  city?: string
  region?: string
  country?: string
  hour: number
  date: string
  createdAt: import('firebase/firestore').Timestamp
}

export async function getAgentEvents(agentId: string, days = 30): Promise<AnalyticsEvent[]> {
  if (!db) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().slice(0, 10)
  try {
    const q = query(
      collection(db, 'events'),
      where('agentId', '==', agentId),
      where('date', '>=', sinceStr),
      orderBy('date', 'desc'),
      limit(5000),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as AnalyticsEvent))
  } catch {
    const q = query(collection(db, 'events'), where('agentId', '==', agentId), limit(5000))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as AnalyticsEvent))
  }
}

export interface FollowerSnapshot {
  agentId: string
  date: string
  count: number
}

export async function getFollowerSnapshots(agentId: string, days = 30): Promise<FollowerSnapshot[]> {
  if (!db) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().slice(0, 10)
  try {
    const q = query(
      collection(db, 'follower_snapshots'),
      where('agentId', '==', agentId),
      where('date', '>=', sinceStr),
      orderBy('date', 'asc'),
      limit(90),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as FollowerSnapshot)
  } catch {
    const q = query(collection(db, 'follower_snapshots'), where('agentId', '==', agentId), limit(90))
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as FollowerSnapshot)
  }
}

export async function getSavedMapInsights(agentId: string): Promise<{ pattern: string; overlap: string; strength: number; savers: number }[]> {
  if (!db) return []
  const pinsSnap = await getDocs(query(collection(db, 'pins'), where('agentId', '==', agentId), where('enabled', '==', true), limit(100)))
  const pinIds = pinsSnap.docs.map((d) => d.id)
  if (pinIds.length < 2) return []

  const savesMap = new Map<string, Set<string>>()
  for (const pid of pinIds) {
    const savesSnap = await getDocs(query(collection(db, 'saves'), where('pinId', '==', pid), limit(500)))
    const userIds = new Set(savesSnap.docs.map((d) => d.data().userId as string))
    savesMap.set(pid, userIds)
  }

  const insights: { pattern: string; overlap: string; strength: number; savers: number }[] = []
  const pinAddrs = new Map(pinsSnap.docs.map((d) => [d.id, (d.data().address as string || '').split(',')[0]]))
  const entries = Array.from(savesMap.entries())

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [pidA, usersA] = entries[i]
      const [pidB, usersB] = entries[j]
      const overlap = [...usersA].filter((u) => usersB.has(u)).length
      if (overlap === 0) continue
      const strength = Math.round((overlap / Math.min(usersA.size, usersB.size)) * 100)
      insights.push({
        pattern: pinAddrs.get(pidA) || pidA,
        overlap: pinAddrs.get(pidB) || pidB,
        strength,
        savers: overlap,
      })
    }
  }

  return insights.sort((a, b) => b.strength - a.strength).slice(0, 6)
}

// ══════════════════════════════════════════
// COMMENTS
// ══════════════════════════════════════════

export interface CommentDoc {
  id: string
  pinId: string
  contentId: string
  pinAgentId: string
  authorUid: string
  authorName: string
  authorPhotoURL: string | null
  text: string
  createdAt: import('firebase/firestore').Timestamp
}

export async function getComments(pinId: string, contentId: string): Promise<CommentDoc[]> {
  if (!db) return []
  try {
    const q = query(
      collection(db, 'comments'),
      where('pinId', '==', pinId),
      where('contentId', '==', contentId),
      orderBy('createdAt', 'desc'),
      limit(200),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommentDoc))
  } catch {
    const q = query(collection(db, 'comments'), where('pinId', '==', pinId), where('contentId', '==', contentId), limit(200))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommentDoc))
  }
}

export async function addComment(data: Omit<CommentDoc, 'id' | 'createdAt'>): Promise<string> {
  if (!db) return ''
  const ref = await addDoc(collection(db, 'comments'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteComment(commentId: string) {
  if (!db) return
  await deleteDoc(doc(db, 'comments', commentId))
}
