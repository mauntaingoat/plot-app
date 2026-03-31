import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { UserDoc, Pin, Coordinates } from '@/lib/types'

// ── Users ──

export async function getUserByUsername(username: string): Promise<UserDoc | null> {
  const usernameSnap = await getDoc(doc(db, 'usernames', username.toLowerCase()))
  if (!usernameSnap.exists()) return null

  const { uid } = usernameSnap.data()
  const userSnap = await getDoc(doc(db, 'users', uid))
  if (!userSnap.exists()) return null

  return { uid: userSnap.id, ...userSnap.data() } as UserDoc
}

export async function getUserById(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() } as UserDoc
}

export async function createUserDoc(uid: string, data: Partial<UserDoc>) {
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
  await updateDoc(doc(db, 'users', uid), data as DocumentData)
}

// ── Pins ──

export async function createPin(data: Omit<Pin, 'id'>) {
  const ref = await addDoc(collection(db, 'pins'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    views: 0,
    taps: 0,
    saves: 0,
    enabled: true,
  })
  return ref.id
}

export async function updatePin(pinId: string, data: Partial<Pin>) {
  await updateDoc(doc(db, 'pins', pinId), {
    ...data,
    updatedAt: serverTimestamp(),
  } as DocumentData)
}

export async function deletePin(pinId: string) {
  await deleteDoc(doc(db, 'pins', pinId))
}

export async function getAgentPins(agentId: string): Promise<Pin[]> {
  const q = query(
    collection(db, 'pins'),
    where('agentId', '==', agentId),
    where('enabled', '==', true)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pin)
}

// ── Featured agents ──

export async function getFeaturedAgents(limit = 10): Promise<UserDoc[]> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'agent'),
    where('onboardingComplete', '==', true)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }) as UserDoc)
    .sort((a, b) => b.followerCount - a.followerCount)
    .slice(0, limit)
}

// ── Setup percent calculation ──

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

// ── Geocoding helpers ──

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
