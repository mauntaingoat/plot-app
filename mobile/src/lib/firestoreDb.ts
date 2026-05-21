/**
 * Native Firestore wrapper using @react-native-firebase/firestore.
 * Mirrors the web app's `src/lib/firestore.ts` query patterns for the
 * surfaces the iOS app needs (pins, content, users). Same collection
 * names and document shapes — the iOS app reads the same data the
 * web dashboard does.
 */
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore'
import type { Pin } from '../types'

type Unsub = () => void

/**
 * Subscribe to all pins for `agentId`. Mirrors the web `useAgentPins`
 * filter: live pins (not archived) returned first. Calls back with
 * the latest snapshot. Returns unsubscribe.
 */
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
      snap.forEach((doc) => {
        const data = doc.data() as Omit<Pin, 'id'>
        // Filter out archived pins client-side; the web dashboard does
        // the same. Server-side query stays simple to avoid an extra
        // composite index for the {archivedAt == null} case.
        if (data.archivedAt == null) {
          pins.push({ id: doc.id, ...data })
        }
      })
      onUpdate(pins)
    },
    onError,
  )
}
