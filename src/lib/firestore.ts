import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, getDocs, orderBy, limit,
  serverTimestamp, increment, onSnapshot,
  type DocumentData, type Unsubscribe,
} from 'firebase/firestore'
import { db, firebaseConfigured } from '@/config/firebase'
import type { UserDoc, Pin, ContentItem, ContentDoc, Coordinates, PinType, ShowingRequest, ContentReport, ReportReason, LicenseDispute, DmcaRequest } from '@/lib/types'

// ══════════════════════════════════════════
// USERS
// ══════════════════════════════════════════

export async function getUserByUsername(username: string): Promise<UserDoc | null> {
  if (!db) return null
  const usernameSnap = await getDoc(doc(db, 'usernames', username.toLowerCase()))
  if (!usernameSnap.exists()) return null
  const { uid } = usernameSnap.data()
  const userSnap = await getDoc(doc(db, 'users', uid))
  if (!userSnap.exists()) return null
  return { uid: userSnap.id, ...userSnap.data() } as UserDoc
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

export async function createPin(data: Omit<Pin, 'id'>): Promise<string> {
  if (!db) return `local-${Date.now()}`
  const ref = await addDoc(collection(db, 'pins'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    views: 0,
    taps: 0,
    saves: 0,
    enabled: true,
    status: 'active',
    content: data.content || [],
  })
  return ref.id
}

export async function updatePin(pinId: string, data: Partial<Pin>) {
  if (!db) return
  await updateDoc(doc(db, 'pins', pinId), {
    ...data,
    updatedAt: serverTimestamp(),
  } as DocumentData)
}

// Soft delete — archive instead of destroy. Data persists for RTBF compliance.
export async function archivePin(pinId: string) {
  if (!db) return
  await updateDoc(doc(db, 'pins', pinId), {
    status: 'archived',
    enabled: false,
    updatedAt: serverTimestamp(),
  })
}

// Hard delete — only for RTBF (Right To Be Forgotten) requests
export async function deletePin(pinId: string) {
  if (!db) return
  await deleteDoc(doc(db, 'pins', pinId))
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
  const q = query(
    collection(db, 'pins'),
    where('agentId', '==', agentId),
    where('enabled', '==', true),
    orderBy('createdAt', 'desc'),
    limit(100)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pin)
}

export function subscribeToAgentPins(agentId: string, callback: (pins: Pin[]) => void): Unsubscribe | null {
  if (!db) return null
  const q = query(
    collection(db, 'pins'),
    where('agentId', '==', agentId),
    where('enabled', '==', true),
    orderBy('createdAt', 'desc'),
    limit(100)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pin))
  })
}

/** Dashboard variant — returns ALL agent pins (enabled + disabled)
 *  so the toggle UI can manage visibility. */
export function subscribeToAllAgentPins(agentId: string, callback: (pins: Pin[]) => void): Unsubscribe | null {
  if (!db) return null
  const q = query(
    collection(db, 'pins'),
    where('agentId', '==', agentId),
    orderBy('createdAt', 'desc'),
    limit(200)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pin))
  })
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
  await updateDoc(doc(db, 'users', agentUid), { followerCount: increment(1) }).catch(() => {})
  await updateDoc(doc(db, 'users', followerUid), { followingCount: increment(1) }).catch(() => {})
}

export async function unfollowAgent(followerUid: string, agentUid: string) {
  if (!db) return
  const followId = `${followerUid}_${agentUid}`
  await deleteDoc(doc(db, 'follows', followId))
  await updateDoc(doc(db, 'users', agentUid), { followerCount: increment(-1) }).catch(() => {})
  await updateDoc(doc(db, 'users', followerUid), { followingCount: increment(-1) }).catch(() => {})
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
  // Increment pin save count
  await updateDoc(doc(db, 'pins', pinId), { saves: increment(1) }).catch(() => {})
}

export async function unsavePin(userId: string, pinId: string, contentId?: string) {
  if (!db) return
  const saveId = contentId ? `${userId}_${pinId}_${contentId}` : `${userId}_${pinId}`
  await deleteDoc(doc(db, 'saves', saveId))
  await updateDoc(doc(db, 'pins', pinId), { saves: increment(-1) }).catch(() => {})
}

export async function getUserSaves(userId: string): Promise<{ pinId: string; contentId?: string }[]> {
  if (!db) return []
  const q = query(collection(db, 'saves'), where('userId', '==', userId), limit(200))
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
    limit(100),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShowingRequest))
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

export async function incrementPinView(pinId: string) {
  if (!db) return
  await updateDoc(doc(db, 'pins', pinId), { views: increment(1) }).catch(() => {})
}

export async function incrementPinTap(pinId: string) {
  if (!db) return
  await updateDoc(doc(db, 'pins', pinId), { taps: increment(1) }).catch(() => {})
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
    ? query(collection(db, 'reports'), where('status', '==', status), orderBy('createdAt', 'desc'), limit(100))
    : query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100))
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
    limit(200),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pin)))
  })
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

export async function getAgentContent(agentId: string): Promise<ContentDoc[]> {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_content') || '[]')
    return list.filter((c: ContentDoc) => c.agentId === agentId)
  }
  const q = query(
    collection(db, 'content'),
    where('agentId', '==', agentId),
    orderBy('createdAt', 'desc'),
    limit(200),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContentDoc))
}

export async function updateContent(contentId: string, data: Partial<ContentDoc>) {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_content') || '[]')
    const updated = list.map((c: ContentDoc) => c.id === contentId ? { ...c, ...data } : c)
    localStorage.setItem('reelst_content', JSON.stringify(updated))
    return
  }
  await updateDoc(doc(db, 'content', contentId), data as any)
}

export async function linkContentToPin(contentId: string, pinId: string | null) {
  return updateContent(contentId, { pinId })
}

export async function archiveContent(contentId: string) {
  if (!db) {
    const list = JSON.parse(localStorage.getItem('reelst_content') || '[]')
    localStorage.setItem('reelst_content', JSON.stringify(list.filter((c: ContentDoc) => c.id !== contentId)))
    return
  }
  await deleteDoc(doc(db, 'content', contentId))
}
