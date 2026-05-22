/**
 * Native Firestore wrapper using @react-native-firebase/firestore
 * (modular API, v22+). Mirrors the web app's `src/lib/firestore.ts`
 * query patterns. Same Firestore collections + shapes as web.
 */
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore'
import type { Pin } from '../types'

type Unsub = () => void

export interface UserDocLite {
  uid: string
  email?: string
  username?: string | null
  displayName?: string | null
  photoURL?: string | null
  bio?: string | null
  brokerage?: string | null
  licenseNumber?: string | null
  platforms?: { id: string; username: string }[]
  tier?: 'free' | 'pro'
  profileVisits?: number
  pinTaps?: number
  subscriberCount?: number
}

/** Update a pin doc — used by the visibility toggle, archive action, etc. */
export async function updatePin(pinId: string, patch: Record<string, unknown>) {
  const db = getFirestore()
  await updateDoc(doc(db, 'pins', pinId), patch)
}

/** Toggle the `enabled` flag on a pin. Mirrors web `handleTogglePin`. */
export async function togglePinEnabled(pinId: string, enabled: boolean) {
  await updatePin(pinId, { enabled })
}

/** Archive a pin — sets archivedAt so the client-side filter hides it. */
export async function archivePin(pinId: string) {
  await updatePin(pinId, { archivedAt: serverTimestamp() })
}

export function subscribeUserDoc(
  uid: string,
  onUpdate: (doc: UserDocLite | null) => void,
  onError?: (err: unknown) => void,
): Unsub {
  const db = getFirestore()
  const ref = doc(db, 'users', uid)
  return onSnapshot(
    ref,
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
      if (!snap.exists()) {
        onUpdate(null)
        return
      }
      onUpdate({ uid: snap.id, ...(snap.data() as Omit<UserDocLite, 'uid'>) })
    },
    onError,
  )
}

export function subscribeAgentPins(
  agentId: string,
  onUpdate: (pins: Pin[]) => void,
  onError?: (err: unknown) => void,
): Unsub {
  const db = getFirestore()
  const q = query(
    collection(db, 'pins'),
    where('agentId', '==', agentId),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      const pins: Pin[] = []
      snap.forEach((d) => {
        const data = d.data() as Omit<Pin, 'id'>
        if (data.archivedAt == null) {
          pins.push({ id: d.id, ...data })
        }
      })
      onUpdate(pins)
    },
    onError,
  )
}
