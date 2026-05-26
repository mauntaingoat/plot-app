/**
 * Insights data layer — subscriber growth + crossover queries.
 * Mirrors the web `src/lib/firestore.ts` helpers.
 */
import {
  getFirestore,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore'

export interface SubscriberSnapshot {
  agentId: string
  /** YYYY-MM-DD */
  date: string
  count: number
}

export async function getSubscriberSnapshots(agentId: string, days = 30): Promise<SubscriberSnapshot[]> {
  const db = getFirestore()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().slice(0, 10)
  try {
    const q = query(
      collection(db, 'subscriber_snapshots'),
      where('agentId', '==', agentId),
      where('date', '>=', sinceStr),
      orderBy('date', 'asc'),
      limit(90),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => d.data() as SubscriberSnapshot)
  } catch {
    const q = query(collection(db, 'subscriber_snapshots'), where('agentId', '==', agentId), limit(90))
    const snap = await getDocs(q)
    const rows = snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => d.data() as SubscriberSnapshot)
    rows.sort((a: SubscriberSnapshot, b: SubscriberSnapshot) => a.date.localeCompare(b.date))
    return rows.filter((r: SubscriberSnapshot) => r.date >= sinceStr)
  }
}

// ── Within-profile crossover ────────────────────────────────────
// "Visitors who tapped this pin also tapped..." Aggregates the
// agent's own tap events keyed by visitorId. Anonymous visitors
// without a stable visitorId are dropped (they'd collapse to one
// bucket and skew everything).

export interface CoTap {
  pinId: string
  address: string
  overlapPct: number
  sharedVisitors: number
}

export interface WithinProfileCrossoverEntry {
  pinId: string
  address: string
  totalVisitors: number
  coTaps: CoTap[]
}

export async function getWithinProfileCrossover(
  agentId: string,
  windowDays?: number,
): Promise<Record<string, WithinProfileCrossoverEntry>> {
  const db = getFirestore()

  const sinceStr =
    windowDays && windowDays > 0
      ? (() => { const d = new Date(); d.setDate(d.getDate() - windowDays); return d.toISOString().slice(0, 10) })()
      : null
  const eventsSnap = await getDocs(
    sinceStr
      ? query(
          collection(db, 'events'),
          where('agentId', '==', agentId),
          where('type', '==', 'tap'),
          where('date', '>=', sinceStr),
          limit(5000),
        )
      : query(
          collection(db, 'events'),
          where('agentId', '==', agentId),
          where('type', '==', 'tap'),
          limit(5000),
        ),
  ).catch(() => null)
  if (!eventsSnap) return {}

  // visitorId → Set<pinId>
  const visitorPins = new Map<string, Set<string>>()
  for (const d of eventsSnap.docs) {
    const data = d.data() as { visitorId?: string; pinId?: string }
    if (!data.visitorId || !data.pinId) continue
    if (!visitorPins.has(data.visitorId)) visitorPins.set(data.visitorId, new Set())
    visitorPins.get(data.visitorId)!.add(data.pinId)
  }

  // pinId → Set<visitorId>
  const pinVisitors = new Map<string, Set<string>>()
  for (const [vid, pins] of visitorPins) {
    for (const pid of pins) {
      if (!pinVisitors.has(pid)) pinVisitors.set(pid, new Set())
      pinVisitors.get(pid)!.add(vid)
    }
  }

  const pinsSnap = await getDocs(
    query(collection(db, 'pins'), where('agentId', '==', agentId), limit(500)),
  ).catch(() => null)
  const addresses = new Map<string, string>()
  if (pinsSnap) {
    for (const p of pinsSnap.docs) {
      const d = p.data() as { address?: string }
      addresses.set(p.id, (d.address || '').split(',')[0] || p.id)
    }
  }

  const out: Record<string, WithinProfileCrossoverEntry> = {}
  for (const [pinId, visitors] of pinVisitors) {
    const coCount = new Map<string, number>()
    for (const vid of visitors) {
      const pins = visitorPins.get(vid)!
      for (const other of pins) {
        if (other === pinId) continue
        coCount.set(other, (coCount.get(other) || 0) + 1)
      }
    }
    const coTaps: CoTap[] = []
    for (const [other, shared] of coCount) {
      coTaps.push({
        pinId: other,
        address: addresses.get(other) || other,
        overlapPct: Math.round((shared / visitors.size) * 100),
        sharedVisitors: shared,
      })
    }
    coTaps.sort((a, b) => b.overlapPct - a.overlapPct || b.sharedVisitors - a.sharedVisitors)
    out[pinId] = {
      pinId,
      address: addresses.get(pinId) || pinId,
      totalVisitors: visitors.size,
      coTaps: coTaps.slice(0, 5),
    }
  }
  return out
}

// ── Cross-Reelst insights ───────────────────────────────────────
// Callable Cloud Function: getCrossAgentInsights({ agentId, window })

export interface CrossAgentEntry {
  agentId: string
  displayName: string
  username?: string
  photoURL?: string | null
  overlapPct: number
  sharedVisitors: number
}

export interface CrossNeighborhoodEntry {
  name: string
  overlapPct: number
  sharedVisitors: number
}

export interface CrossAgentInsights {
  topAgents: CrossAgentEntry[]
  topNeighborhoods: CrossNeighborhoodEntry[]
  myVisitorCount: number
  computedAt?: number
}

// ── Event analytics (chart bars + time-of-day) ──────────────────

export interface AnalyticsEvent {
  type: string
  agentId: string
  pinId?: string
  contentId?: string
  actorUid?: string
  visitorId?: string
  /** Visitor-local wall-clock hour 0-23 — captured at log time. */
  hour: number
  /** YYYY-MM-DD in the visitor's local TZ. */
  date: string
}

export async function getAgentEvents(agentId: string, days = 30): Promise<AnalyticsEvent[]> {
  const db = getFirestore()
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
    return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => d.data() as AnalyticsEvent)
  } catch {
    const q = query(collection(db, 'events'), where('agentId', '==', agentId), limit(5000))
    const snap = await getDocs(q)
    const rows = snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => d.data() as AnalyticsEvent)
    return rows.filter((r: AnalyticsEvent) => r.date >= sinceStr)
  }
}

// ── Active subscriber count (live) ──────────────────────────────
// Returns the size of `digestSubscriptions where agentId == uid &&
// status == 'active'`. Used as the latest "today" data point on the
// SaveGrowth chart so it never disagrees with what's actually in the
// subscriptions collection.

export function subscribeActiveSubscriberCount(agentId: string, cb: (count: number) => void): () => void {
  const db = getFirestore()
  try {
    const q = query(
      collection(db, 'digestSubscriptions'),
      where('agentId', '==', agentId),
      where('status', '==', 'active'),
    )
    return onSnapshot(
      q,
      (snap: FirebaseFirestoreTypes.QuerySnapshot) => cb(snap.size),
      () => cb(0),
    )
  } catch {
    cb(0)
    return () => {}
  }
}

// ── Wave count (live count of buyer waves across all pins) ──────

export function subscribeWaveCount(agentId: string, cb: (count: number) => void): () => void {
  const db = getFirestore()
  try {
    const q = query(
      collectionGroup(db, 'waves'),
      where('agentId', '==', agentId),
      orderBy('createdAt', 'desc'),
      limit(500),
    )
    return onSnapshot(
      q,
      (snap: FirebaseFirestoreTypes.QuerySnapshot) => cb(snap.size),
      () => cb(0),
    )
  } catch {
    cb(0)
    return () => {}
  }
}

// ── Cross-Reelst insights ───────────────────────────────────────

export async function getCrossAgentInsights(
  agentId: string,
  window: 'all' | '30d' = 'all',
): Promise<CrossAgentInsights | null> {
  try {
    const mod = await import('@react-native-firebase/functions')
    const fn = mod.default().httpsCallable('getCrossAgentInsights')
    const res = await fn({ agentId, window })
    return res.data as CrossAgentInsights
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[insights] getCrossAgentInsights failed', (e as Error).message)
    return null
  }
}
