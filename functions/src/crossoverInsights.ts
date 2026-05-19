// Cross-agent crossover insights (Lens B).
//
// Given an agent A, this callable identifies the other Reelst agents
// and neighborhoods that A's visitors also engage with — only
// available server-side because cross-agent event reads are gated.
//
// Privacy posture: visitorIds never leave the function. Only
// aggregated counts and the names of the overlapping agents /
// neighborhoods come back. Bucketed counts below MIN_SHARED_VISITORS
// are dropped so a single visitor's behavior can't be inferred from
// the result.
//
// Cost shape per uncached call (worst case):
//   - 1 query for caller's own events (up to 1000 docs)
//   - 7 batched `visitorId in [...]` queries (up to 500 docs each)
//   - up to 30 pin doc reads for neighborhood resolution
//   - up to 5 user doc reads for agent display fields
// ≈ 3.5k reads. Cached for 1h per (agentId, window) in `crossoverCache`.

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const MAX_VISITORS = 200
const FIRESTORE_IN_LIMIT = 30
const MIN_SHARED_VISITORS = 2
const TOP_N = 5
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

type Window = 'all' | '30d'

export interface CrossAgentInsights {
  topAgents: { agentId: string; displayName: string; username: string; photoURL: string | null; sharedVisitors: number; overlapPct: number }[]
  topNeighborhoods: { name: string; sharedVisitors: number; overlapPct: number }[]
  myVisitorCount: number
  computedAt: number
}

function neighborhoodOf(address: string): string | null {
  if (!address) return null
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  // "<street>, <neighborhood/city>, <state>" — middle chunk reads as
  // the neighborhood for the metro names RentCast typically returns.
  if (parts.length >= 2) return parts[1] || null
  return null
}

export const getCrossAgentInsights = onCall<{ agentId: string; window?: Window }>(
  { cors: true, maxInstances: 10 },
  async (request) => {
    const callerUid = request.auth?.uid
    const { agentId, window = 'all' } = request.data || ({} as { agentId: string; window?: Window })

    if (!callerUid) throw new HttpsError('unauthenticated', 'Sign in required.')
    if (!agentId) throw new HttpsError('invalid-argument', 'agentId required.')
    if (callerUid !== agentId) throw new HttpsError('permission-denied', 'You can only fetch your own crossover.')
    if (window !== 'all' && window !== '30d') throw new HttpsError('invalid-argument', 'window must be "all" or "30d".')

    const db = admin.firestore()

    // ── Cache check ──
    const cacheKey = `${agentId}_${window}`
    const cacheRef = db.collection('crossoverCache').doc(cacheKey)
    try {
      const cached = await cacheRef.get()
      if (cached.exists) {
        const data = cached.data() as { computedAt?: number; payload?: CrossAgentInsights }
        if (data.computedAt && Date.now() - data.computedAt < CACHE_TTL_MS && data.payload) {
          return data.payload
        }
      }
    } catch (err) {
      logger.warn('[crossover] cache read failed', { err: String(err) })
    }

    // ── Pull caller's own events to find their visitor set ──
    const sinceStr = window === '30d'
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null

    let ownEventsQuery: admin.firestore.Query = db.collection('events')
      .where('agentId', '==', agentId)
      .limit(1000)
    if (sinceStr) ownEventsQuery = ownEventsQuery.where('date', '>=', sinceStr)

    const ownEvents = await ownEventsQuery.get().catch((err) => {
      logger.warn('[crossover] own-events query failed', { err: String(err) })
      return null
    })

    if (!ownEvents) {
      return emptyResult(0)
    }

    // Most-recent visitorIds first — Firestore doesn't sort here unless
    // we have an index; in-memory sort by `date` (string YYYY-MM-DD).
    const visitorSet = new Map<string, string>() // visitorId -> latest date
    for (const doc of ownEvents.docs) {
      const d = doc.data() as { visitorId?: string; date?: string }
      if (!d.visitorId) continue
      const prev = visitorSet.get(d.visitorId)
      if (!prev || (d.date && d.date > prev)) visitorSet.set(d.visitorId, d.date || '')
    }
    const myVisitorCount = visitorSet.size

    if (myVisitorCount < MIN_SHARED_VISITORS) {
      const empty = emptyResult(myVisitorCount)
      await cacheRef.set({ computedAt: Date.now(), payload: empty }).catch(() => {})
      return empty
    }

    const visitorIds = Array.from(visitorSet.entries())
      .sort((a, b) => (b[1] || '').localeCompare(a[1] || ''))
      .slice(0, MAX_VISITORS)
      .map(([id]) => id)

    // ── Batched cross-agent event lookup ──
    const agentVisitorOverlap = new Map<string, Set<string>>() // otherAgentId -> Set<visitorId>
    const pinVisitorOverlap = new Map<string, Set<string>>() // pinId -> Set<visitorId>

    for (let i = 0; i < visitorIds.length; i += FIRESTORE_IN_LIMIT) {
      const batch = visitorIds.slice(i, i + FIRESTORE_IN_LIMIT)
      if (batch.length === 0) continue
      let q: admin.firestore.Query = db.collection('events')
        .where('visitorId', 'in', batch)
        .limit(500)
      if (sinceStr) q = q.where('date', '>=', sinceStr)
      const snap = await q.get().catch((err) => {
        logger.warn('[crossover] batch query failed', { batch: batch.length, err: String(err) })
        return null
      })
      if (!snap) continue
      for (const doc of snap.docs) {
        const d = doc.data() as { agentId?: string; visitorId?: string; pinId?: string }
        if (!d.agentId || !d.visitorId || d.agentId === agentId) continue
        if (!agentVisitorOverlap.has(d.agentId)) agentVisitorOverlap.set(d.agentId, new Set())
        agentVisitorOverlap.get(d.agentId)!.add(d.visitorId)
        if (d.pinId) {
          if (!pinVisitorOverlap.has(d.pinId)) pinVisitorOverlap.set(d.pinId, new Set())
          pinVisitorOverlap.get(d.pinId)!.add(d.visitorId)
        }
      }
    }

    // ── Top overlapping agents ──
    const agentRanked = Array.from(agentVisitorOverlap.entries())
      .map(([id, vSet]) => ({ agentId: id, sharedVisitors: vSet.size }))
      .filter((a) => a.sharedVisitors >= MIN_SHARED_VISITORS)
      .sort((a, b) => b.sharedVisitors - a.sharedVisitors)
      .slice(0, TOP_N)

    const topAgents: CrossAgentInsights['topAgents'] = []
    for (const a of agentRanked) {
      const userSnap = await db.collection('users').doc(a.agentId).get().catch(() => null)
      if (!userSnap || !userSnap.exists) continue
      const u = userSnap.data() as { displayName?: string; username?: string; photoURL?: string; role?: string; onboardingComplete?: boolean }
      // Skip agents that aren't fully onboarded / public.
      if (u.role !== 'agent' || !u.onboardingComplete) continue
      topAgents.push({
        agentId: a.agentId,
        displayName: u.displayName || u.username || 'Reelst Agent',
        username: u.username || '',
        photoURL: u.photoURL || null,
        sharedVisitors: a.sharedVisitors,
        overlapPct: Math.round((a.sharedVisitors / myVisitorCount) * 100),
      })
    }

    // ── Top neighborhoods (across overlapping pins) ──
    // Resolve pin -> neighborhood by reading the pin docs in batches.
    const pinIds = Array.from(pinVisitorOverlap.keys())
    const pinNeighborhood = new Map<string, string | null>()
    for (let i = 0; i < pinIds.length; i += FIRESTORE_IN_LIMIT) {
      const batch = pinIds.slice(i, i + FIRESTORE_IN_LIMIT)
      if (batch.length === 0) continue
      const snap = await db.collection('pins')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
        .get()
        .catch(() => null)
      if (!snap) continue
      for (const doc of snap.docs) {
        const d = doc.data() as { address?: string }
        pinNeighborhood.set(doc.id, neighborhoodOf(d.address || ''))
      }
    }

    const neighborhoodVisitors = new Map<string, Set<string>>()
    for (const [pinId, visitors] of pinVisitorOverlap) {
      const n = pinNeighborhood.get(pinId)
      if (!n) continue
      if (!neighborhoodVisitors.has(n)) neighborhoodVisitors.set(n, new Set())
      for (const v of visitors) neighborhoodVisitors.get(n)!.add(v)
    }

    const topNeighborhoods = Array.from(neighborhoodVisitors.entries())
      .map(([name, vSet]) => ({
        name,
        sharedVisitors: vSet.size,
        overlapPct: Math.round((vSet.size / myVisitorCount) * 100),
      }))
      .filter((n) => n.sharedVisitors >= MIN_SHARED_VISITORS)
      .sort((a, b) => b.sharedVisitors - a.sharedVisitors)
      .slice(0, TOP_N)

    const result: CrossAgentInsights = {
      topAgents,
      topNeighborhoods,
      myVisitorCount,
      computedAt: Date.now(),
    }

    await cacheRef.set({ computedAt: result.computedAt, payload: result }).catch((err) => {
      logger.warn('[crossover] cache write failed', { err: String(err) })
    })

    return result
  },
)

function emptyResult(myVisitorCount: number): CrossAgentInsights {
  return { topAgents: [], topNeighborhoods: [], myVisitorCount, computedAt: Date.now() }
}
