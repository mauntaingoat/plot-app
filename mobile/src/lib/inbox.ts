/**
 * Inbox data layer — Firestore subscriptions for showing requests
 * and notifications. Mirrors `src/lib/firestore.ts`
 * (subscribeToShowingRequests, subscribeToNotifications,
 * updateShowingRequestStatus).
 *
 * Doc shapes match the web app verbatim — same collections, same
 * fields. iOS reads only, all mutations except status updates flow
 * through server-side triggers (subscriber capture, wave creation).
 */
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore'

type Unsub = () => void
type FirebaseTimestamp = FirebaseFirestoreTypes.Timestamp

export type ShowingRequestStatus = 'new' | 'read' | 'scheduled' | 'closed'

export interface ShowingRequest {
  id: string
  agentId: string
  pinId: string
  pinAddress: string
  visitorName: string
  visitorEmail: string
  visitorPhone: string
  preferredDate: string  // YYYY-MM-DD
  preferredTime: string  // HH:MM 24h
  note: string
  status: ShowingRequestStatus
  createdAt: FirebaseTimestamp | null
}

export type NotificationType =
  | 'save'
  | 'showing_request'
  | 'subscriber'
  | 'unsubscriber'
  | 'wave'
  | 'gift'
  | 'follow'

export interface NotificationDoc {
  id: string
  agentId: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: FirebaseTimestamp | null
  actorName?: string
  actorUid?: string
  pinId?: string
  pinAddress?: string
  refId?: string
  visitorEmail?: string
  visitorPhone?: string | null
  question?: string
}

export function subscribeShowingRequests(agentId: string, cb: (rows: ShowingRequest[]) => void): Unsub {
  const db = getFirestore()
  const q = query(
    collection(db, 'showing_requests'),
    where('agentId', '==', agentId),
    orderBy('createdAt', 'desc'),
    limit(1000),
  )
  return onSnapshot(
    q,
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ShowingRequest, 'id'>) })))
    },
    (err) => {
      // Mirror web fallback: drop the orderBy if the composite index
      // isn't built and sort client-side.
      // eslint-disable-next-line no-console
      console.warn('[inbox] showing_requests fallback:', err.message)
      const fq = query(
        collection(db, 'showing_requests'),
        where('agentId', '==', agentId),
        limit(1000),
      )
      onSnapshot(fq, (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ShowingRequest, 'id'>) }))
        rows.sort((a: ShowingRequest, b: ShowingRequest) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        cb(rows)
      })
    },
  )
}

export function subscribeNotifications(agentId: string, cb: (rows: NotificationDoc[]) => void): Unsub {
  const db = getFirestore()
  const q = query(
    collection(db, 'notifications'),
    where('agentId', '==', agentId),
    orderBy('createdAt', 'desc'),
    limit(1000),
  )
  return onSnapshot(
    q,
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationDoc, 'id'>) })))
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.warn('[inbox] notifications fallback:', err.message)
      const fq = query(
        collection(db, 'notifications'),
        where('agentId', '==', agentId),
        limit(1000),
      )
      onSnapshot(fq, (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationDoc, 'id'>) }))
        rows.sort((a: NotificationDoc, b: NotificationDoc) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        cb(rows)
      })
    },
  )
}

export async function updateShowingRequestStatus(requestId: string, status: ShowingRequestStatus) {
  const db = getFirestore()
  await updateDoc(doc(db, 'showing_requests', requestId), { status })
}

/** Group a list of notifications by YYYY-MM-DD created-date.
 *  Returned sorted newest day first; per-day items preserve their
 *  original (newest-first) ordering. */
export function groupByDay<T extends { createdAt: FirebaseTimestamp | null }>(
  items: T[],
): Array<[string, T[]]> {
  const map = new Map<string, T[]>()
  for (const n of items) {
    const ms = n.createdAt?.toMillis?.()
    const key = ms ? new Date(ms).toISOString().slice(0, 10) : 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(n)
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
}

export function formatGroupDate(key: string): string {
  if (key === 'unknown') return 'Earlier'
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  return new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
