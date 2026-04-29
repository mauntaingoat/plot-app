/**
 * Property data lookup via Rentcast API.
 *
 * For-sale pins: hits /v1/listings/sale?status=Active for live listing data
 * (price, DOM, listing agent, MLS#). Falls back to /v1/properties.
 *
 * Sold pins: hits /v1/listings/sale?status=Inactive for sold data,
 * falls back to /v1/properties for lastSalePrice.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const REALTYMOLE_API_KEY = defineSecret('REALTYMOLE_API_KEY')

// Per-user rate limit on propertyLookup. Rentcast is paid per-call;
// without this a single bad actor (or a busted client retry loop) can
// burn the monthly quota. 30 lookups / rolling 60-minute window per
// uid is plenty for a normal authoring session — 10 pins ≈ 30 calls.
const RATE_LIMIT_PER_HOUR = 30
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

interface RateLimitDoc {
  count: number
  windowStart: admin.firestore.Timestamp
}

async function checkAndIncrementRateLimit(uid: string): Promise<void> {
  const ref = admin.firestore().collection('rateLimits').doc(`${uid}_propertyLookup`)
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const now = admin.firestore.Timestamp.now()
    if (!snap.exists) {
      tx.set(ref, { count: 1, windowStart: now } as RateLimitDoc)
      return
    }
    const data = snap.data() as RateLimitDoc
    const elapsed = now.toMillis() - data.windowStart.toMillis()
    if (elapsed >= RATE_LIMIT_WINDOW_MS) {
      // Window expired — reset.
      tx.set(ref, { count: 1, windowStart: now } as RateLimitDoc)
      return
    }
    if (data.count >= RATE_LIMIT_PER_HOUR) {
      const minutesLeft = Math.ceil((RATE_LIMIT_WINDOW_MS - elapsed) / 60000)
      throw new HttpsError(
        'resource-exhausted',
        `Property lookup limit reached. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
      )
    }
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) })
  })
}

interface PropertyLookupRequest {
  address: string
  pinType: 'for_sale' | 'sold' | 'spotlight'
  /** Optional apt/unit/suite for unit-level Rentcast matching. The
   *  client may pass the address pre-composed; if `unit` is also set
   *  we compose it ourselves and ignore the original (defensive).
   *  Stored unit is the bare number/code without a leading '#'. */
  unit?: string | null
}

function composeAddressWithUnit(address: string, unit: string | null | undefined): string {
  if (!unit || !unit.trim()) return address
  const cleanUnit = unit.trim().replace(/^#/, '')
  // If the address already has a # already (client pre-composed),
  // don't double up.
  if (address.includes(`#${cleanUnit}`)) return address
  const commaIdx = address.indexOf(',')
  if (commaIdx === -1) return `${address.trim()} #${cleanUnit}`
  const street = address.slice(0, commaIdx).trim()
  const rest = address.slice(commaIdx)
  return `${street} #${cleanUnit}${rest}`
}

interface PropertyData {
  bedrooms: number | null
  bathrooms: number | null
  squareFootage: number | null
  propertyType: string | null
  yearBuilt: number | null
  lotSize: string | null
  // Listing data (from sale listings endpoint)
  listingPrice: number | null
  soldPrice: number | null
  daysOnMarket: number | null
  listedDate: string | null
  soldDate: string | null
  listingStatus: string | null
  mlsNumber: string | null
  listingAgentName: string | null
  listingAgentPhone: string | null
  listingAgentEmail: string | null
  listingOfficeName: string | null
  hoaFees: number | null
  // From property data endpoint
  lastSalePrice: number | null
  lastSaleDate: string | null
}

async function fetchRentcast(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`https://api.rentcast.io${path}`, {
    headers: { 'X-Api-Key': apiKey },
  })
  if (!res.ok) return null
  return res.json()
}

export const propertyLookup = onCall<PropertyLookupRequest, Promise<PropertyData>>(
  {
    secrets: [REALTYMOLE_API_KEY],
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.')
    }

    const { address, pinType, unit } = request.data
    if (!address || address.trim().length < 5) {
      throw new HttpsError('invalid-argument', 'A valid address is required.')
    }

    // Rate limit BEFORE the Rentcast call so we don't burn quota on
    // the request that's about to be rejected anyway.
    await checkAndIncrementRateLimit(request.auth.uid)

    const apiKey = REALTYMOLE_API_KEY.value()
    if (!apiKey) {
      throw new HttpsError('unavailable', 'Property lookup is not configured.')
    }

    // Compose unit into the address before encoding. Rentcast matches
    // distinct condo/apartment units when the unit is in the string.
    const fullAddress = composeAddressWithUnit(address, unit)
    const encoded = encodeURIComponent(fullAddress.trim())
    const result: PropertyData = {
      bedrooms: null, bathrooms: null, squareFootage: null,
      propertyType: null, yearBuilt: null, lotSize: null,
      listingPrice: null, soldPrice: null, daysOnMarket: null,
      listedDate: null, soldDate: null, listingStatus: null,
      mlsNumber: null, listingAgentName: null, listingAgentPhone: null,
      listingAgentEmail: null, listingOfficeName: null, hoaFees: null,
      lastSalePrice: null, lastSaleDate: null,
    }

    const applyListing = (listing: any, source: 'active' | 'inactive') => {
      if (!result.bedrooms) result.bedrooms = listing.bedrooms ?? null
      if (!result.bathrooms) result.bathrooms = listing.bathrooms ?? null
      if (!result.squareFootage) result.squareFootage = listing.squareFootage ?? null
      if (!result.propertyType) result.propertyType = listing.propertyType ?? null
      if (!result.yearBuilt) result.yearBuilt = listing.yearBuilt ?? null
      if (!result.lotSize) result.lotSize = listing.lotSize ? String(listing.lotSize) : null
      result.daysOnMarket = listing.daysOnMarket ?? result.daysOnMarket
      result.listedDate = listing.listedDate ?? result.listedDate
      result.listingStatus = listing.status ?? (source === 'active' ? 'Active' : 'Inactive')
      result.mlsNumber = listing.mlsNumber ?? result.mlsNumber
      result.hoaFees = listing.hoaFee ?? result.hoaFees

      if (listing.listingAgent) {
        result.listingAgentName = listing.listingAgent.name ?? result.listingAgentName
        result.listingAgentPhone = listing.listingAgent.phone ?? result.listingAgentPhone
        result.listingAgentEmail = listing.listingAgent.email ?? result.listingAgentEmail
      }
      if (listing.listingOffice) {
        result.listingOfficeName = listing.listingOffice.name ?? result.listingOfficeName
      }

      if (source === 'active') {
        result.listingPrice = listing.price ?? result.listingPrice
      } else {
        result.soldPrice = listing.price ?? result.soldPrice
        result.soldDate = listing.removedDate ?? listing.soldDate ?? result.soldDate
      }
    }

    try {
      // 1. Try the sale listings endpoint matching the user's selected pin
      // type. (Active for For Sale, Inactive for Sold.)
      const primaryStatus = pinType === 'sold' ? 'Inactive' : 'Active'
      const primaryData = await fetchRentcast(
        `/v1/listings/sale?address=${encoded}&status=${primaryStatus}&limit=1`,
        apiKey,
      )
      const primary = Array.isArray(primaryData) ? primaryData[0] : primaryData
      if (primary) {
        applyListing(primary, primaryStatus === 'Active' ? 'active' : 'inactive')
        logger.info('[propertyLookup] primary listing found', {
          address, status: primaryStatus, price: result.listingPrice ?? result.soldPrice,
        })
      }

      // 2. ALWAYS check the opposite status as well so we can detect a
      // mismatch (e.g. user picks For Sale but the property is actually
      // sold). This lets the client surface the correct status & price.
      if (pinType === 'for_sale' || pinType === 'sold') {
        const altStatus = primaryStatus === 'Active' ? 'Inactive' : 'Active'
        const altData = await fetchRentcast(
          `/v1/listings/sale?address=${encoded}&status=${altStatus}&limit=1`,
          apiKey,
        )
        const alt = Array.isArray(altData) ? altData[0] : altData
        if (alt) {
          applyListing(alt, altStatus === 'Active' ? 'active' : 'inactive')
          logger.info('[propertyLookup] alternate listing found', {
            address, status: altStatus,
          })
        }
      }

      // 3. If no listings or missing basic details, fall back to property data.
      const haveListing = result.listingPrice || result.soldPrice
      if (!haveListing || !result.bedrooms) {
        const propData = await fetchRentcast(`/v1/properties?address=${encoded}`, apiKey)
        const prop = Array.isArray(propData) ? propData[0] : propData

        if (prop) {
          if (!result.bedrooms) result.bedrooms = prop.bedrooms ?? null
          if (!result.bathrooms) result.bathrooms = prop.bathrooms ?? null
          if (!result.squareFootage) result.squareFootage = prop.squareFootage ?? null
          if (!result.propertyType) result.propertyType = prop.propertyType ?? null
          if (!result.yearBuilt) result.yearBuilt = prop.yearBuilt ?? null
          if (!result.lotSize) result.lotSize = prop.lotSize ? String(prop.lotSize) : null
          result.lastSalePrice = prop.lastSalePrice ?? null
          result.lastSaleDate = prop.lastSaleDate ?? null

          // Treat lastSalePrice as a sold-price hint when no listing exists.
          if (!result.soldPrice && prop.lastSalePrice) {
            result.soldPrice = prop.lastSalePrice
            result.soldDate = prop.lastSaleDate ?? result.soldDate
          }

          logger.info('[propertyLookup] property data found', { address })
        }
      }

      if (!result.bedrooms && !result.listingPrice && !result.lastSalePrice) {
        throw new HttpsError('not-found', 'No property data found for this address.')
      }

      return result
    } catch (err) {
      if (err instanceof HttpsError) throw err
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('[propertyLookup] failed', { error: msg })
      throw new HttpsError('internal', 'Property lookup failed.')
    }
  },
)
