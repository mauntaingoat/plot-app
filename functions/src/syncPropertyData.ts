/**
 * Cloud Function: syncPropertyData
 *
 * Daily scheduled job that re-pulls Rentcast data for every active
 * for_sale / sold pin and surfaces meaningful diffs to the agent.
 *
 * Scope of "meaningful diff" (intentionally narrow to avoid noise):
 *   - PRICE change (any delta on listingPrice / soldPrice)
 *   - TYPE transition: for_sale ↔ sold
 *
 * Everything else (daysOnMarket, listed/sold dates, agent name) is
 * silently refreshed on the pin doc itself. Diffs that match the pin's
 * `rejectedSnapshot` are skipped so users don't get re-pestered after
 * dismissing a change.
 *
 * Output shape — at most one doc per pin:
 *   /pins/{pinId}/pendingChanges/latest = {
 *     pinId, agentId, syncedAt,
 *     priceChange?: { from, to },
 *     typeChange?:  { from, to },     // 'for_sale' | 'sold'
 *     soldDate?: string,              // populated on for_sale → sold
 *     mlsNumber?: string | null,
 *   }
 *
 * Deploy:
 *   firebase deploy --only functions:syncPropertyData
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const REALTYMOLE_API_KEY = defineSecret('REALTYMOLE_API_KEY')

const BATCH_LIMIT = 500
const RENTCAST_PARALLELISM = 5

interface PinDoc {
  agentId?: string
  type?: 'for_sale' | 'sold' | 'spotlight'
  status?: string
  enabled?: boolean
  address?: string
  unit?: string | null
  price?: number
  soldPrice?: number
  rejectedSnapshot?: {
    price?: number
    type?: 'for_sale' | 'sold'
  }
}

function composeAddressWithUnit(address: string, unit: string | null | undefined): string {
  if (!unit || !unit.trim()) return address
  const cleanUnit = unit.trim().replace(/^#/, '')
  if (address.includes(`#${cleanUnit}`)) return address
  const commaIdx = address.indexOf(',')
  if (commaIdx === -1) return `${address.trim()} #${cleanUnit}`
  const street = address.slice(0, commaIdx).trim()
  const rest = address.slice(commaIdx)
  return `${street} #${cleanUnit}${rest}`
}

async function fetchRentcast(path: string, apiKey: string): Promise<any> {
  try {
    const res = await fetch(`https://api.rentcast.io${path}`, {
      headers: { 'X-Api-Key': apiKey },
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    logger.warn('[syncPropertyData] rentcast fetch failed', {
      path,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

interface RentcastSnapshot {
  effectiveType: 'for_sale' | 'sold' | null
  effectivePrice: number | null
  soldDate: string | null
  mlsNumber: string | null
}

async function pullSnapshot(address: string, apiKey: string): Promise<RentcastSnapshot> {
  const encoded = encodeURIComponent(address.trim())
  // Pull both Active and Inactive — whichever returns wins.
  const [activeData, inactiveData] = await Promise.all([
    fetchRentcast(`/v1/listings/sale?address=${encoded}&status=Active&limit=1`, apiKey),
    fetchRentcast(`/v1/listings/sale?address=${encoded}&status=Inactive&limit=1`, apiKey),
  ])
  const active = Array.isArray(activeData) ? activeData[0] : activeData
  const inactive = Array.isArray(inactiveData) ? inactiveData[0] : inactiveData

  if (active && active.price) {
    return {
      effectiveType: 'for_sale',
      effectivePrice: Number(active.price) || null,
      soldDate: null,
      mlsNumber: active.mlsNumber ?? null,
    }
  }
  if (inactive && inactive.price) {
    return {
      effectiveType: 'sold',
      effectivePrice: Number(inactive.price) || null,
      soldDate: inactive.removedDate ?? inactive.soldDate ?? null,
      mlsNumber: inactive.mlsNumber ?? null,
    }
  }
  return { effectiveType: null, effectivePrice: null, soldDate: null, mlsNumber: null }
}

interface PendingChange {
  pinId: string
  agentId: string
  syncedAt: admin.firestore.FieldValue
  priceChange?: { from: number; to: number }
  typeChange?: { from: 'for_sale' | 'sold'; to: 'for_sale' | 'sold' }
  soldDate?: string
  mlsNumber?: string | null
}

function computeDiff(pin: PinDoc, pinId: string, snap: RentcastSnapshot): PendingChange | null {
  if (!snap.effectiveType || snap.effectivePrice == null) return null
  if (pin.type !== 'for_sale' && pin.type !== 'sold') return null
  if (!pin.agentId) return null

  const change: PendingChange = {
    pinId,
    agentId: pin.agentId,
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  }
  let hasMeaningfulDiff = false

  // Type transition (for_sale ↔ sold)
  if (snap.effectiveType !== pin.type) {
    if (pin.rejectedSnapshot?.type !== snap.effectiveType) {
      change.typeChange = { from: pin.type, to: snap.effectiveType }
      if (snap.soldDate) change.soldDate = snap.soldDate
      hasMeaningfulDiff = true
    }
  }

  // Price diff. Compare the right field per the *current* type — once
  // the pin is sold its source-of-truth price is soldPrice, not price.
  const currentPrice = pin.type === 'sold' ? pin.soldPrice : pin.price
  if (currentPrice != null && snap.effectivePrice !== currentPrice) {
    if (pin.rejectedSnapshot?.price !== snap.effectivePrice) {
      change.priceChange = { from: currentPrice, to: snap.effectivePrice }
      hasMeaningfulDiff = true
    }
  }

  if (!hasMeaningfulDiff) return null
  if (snap.mlsNumber) change.mlsNumber = snap.mlsNumber
  return change
}

async function processBatch(
  docs: admin.firestore.QueryDocumentSnapshot[],
  apiKey: string,
): Promise<{ written: number; cleared: number; skipped: number; errors: number }> {
  const stats = { written: 0, cleared: 0, skipped: 0, errors: 0 }
  const db = admin.firestore()

  // Process pins in small parallel batches to avoid hammering Rentcast.
  for (let i = 0; i < docs.length; i += RENTCAST_PARALLELISM) {
    const slice = docs.slice(i, i + RENTCAST_PARALLELISM)
    await Promise.all(
      slice.map(async (pinDocSnap) => {
        const pin = pinDocSnap.data() as PinDoc
        const pinId = pinDocSnap.id
        if (!pin.address) {
          stats.skipped++
          return
        }
        try {
          // Use the same composed address Rentcast saw at create time
          // — keeps unit-level data sourcing consistent across syncs.
          const fullAddress = composeAddressWithUnit(pin.address, pin.unit)
          const snap = await pullSnapshot(fullAddress, apiKey)
          const diff = computeDiff(pin, pinId, snap)
          const pendingRef = db
            .collection('pins')
            .doc(pinId)
            .collection('pendingChanges')
            .doc('latest')

          if (diff) {
            await pendingRef.set(diff)
            stats.written++
            logger.info('[syncPropertyData] pending change', {
              pinId,
              priceChange: diff.priceChange,
              typeChange: diff.typeChange,
            })
          } else {
            // No meaningful diff — clear any stale pendingChange doc
            // so the dashboard doesn't show a phantom alert.
            const existing = await pendingRef.get()
            if (existing.exists) {
              await pendingRef.delete()
              stats.cleared++
            } else {
              stats.skipped++
            }
          }
        } catch (err) {
          stats.errors++
          logger.error('[syncPropertyData] pin failed', {
            pinId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }),
    )
  }

  return stats
}

export const syncPropertyData = onSchedule(
  {
    schedule: '0 9 * * *', // daily at 09:00 UTC
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 540,
    secrets: [REALTYMOLE_API_KEY],
  },
  async () => {
    const apiKey = REALTYMOLE_API_KEY.value()
    if (!apiKey) {
      logger.error('[syncPropertyData] REALTYMOLE_API_KEY not configured')
      return
    }

    const db = admin.firestore()

    // Walk for_sale and sold pins separately so we can rely on the
    // existing (agentId, status) indexes; we don't need 'type' queries
    // here — we only fetch enabled, non-archived pins.
    const pinsSnap = await db
      .collection('pins')
      .where('enabled', '==', true)
      .where('status', '==', 'active')
      .limit(BATCH_LIMIT)
      .get()

    const eligible = pinsSnap.docs.filter((d) => {
      const pin = d.data() as PinDoc
      return pin.type === 'for_sale' || pin.type === 'sold'
    })

    if (eligible.length === 0) {
      logger.info('[syncPropertyData] no eligible pins')
      return
    }

    logger.info('[syncPropertyData] starting', { count: eligible.length })
    const stats = await processBatch(eligible, apiKey)
    logger.info('[syncPropertyData] done', stats)
  },
)
