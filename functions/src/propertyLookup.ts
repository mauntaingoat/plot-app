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

const REALTYMOLE_API_KEY = defineSecret('REALTYMOLE_API_KEY')

interface PropertyLookupRequest {
  address: string
  pinType: 'for_sale' | 'sold' | 'spotlight'
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

    const { address, pinType } = request.data
    if (!address || address.trim().length < 5) {
      throw new HttpsError('invalid-argument', 'A valid address is required.')
    }

    const apiKey = REALTYMOLE_API_KEY.value()
    if (!apiKey) {
      throw new HttpsError('unavailable', 'Property lookup is not configured.')
    }

    const encoded = encodeURIComponent(address.trim())
    const result: PropertyData = {
      bedrooms: null, bathrooms: null, squareFootage: null,
      propertyType: null, yearBuilt: null, lotSize: null,
      listingPrice: null, soldPrice: null, daysOnMarket: null,
      listedDate: null, soldDate: null, listingStatus: null,
      mlsNumber: null, listingAgentName: null, listingAgentPhone: null,
      listingAgentEmail: null, listingOfficeName: null, hoaFees: null,
      lastSalePrice: null, lastSaleDate: null,
    }

    try {
      // 1. Try sale listings endpoint first (has price, DOM, agent, MLS)
      const listingStatus = pinType === 'sold' ? 'Inactive' : 'Active'
      const listingData = await fetchRentcast(
        `/v1/listings/sale?address=${encoded}&status=${listingStatus}&limit=1`,
        apiKey,
      )

      const listing = Array.isArray(listingData) ? listingData[0] : listingData

      if (listing) {
        result.bedrooms = listing.bedrooms ?? null
        result.bathrooms = listing.bathrooms ?? null
        result.squareFootage = listing.squareFootage ?? null
        result.propertyType = listing.propertyType ?? null
        result.yearBuilt = listing.yearBuilt ?? null
        result.lotSize = listing.lotSize ? String(listing.lotSize) : null
        result.listingPrice = listing.price ?? null
        result.daysOnMarket = listing.daysOnMarket ?? null
        result.listedDate = listing.listedDate ?? null
        result.soldDate = listing.removedDate ?? null
        result.listingStatus = listing.status ?? null
        result.mlsNumber = listing.mlsNumber ?? null
        result.hoaFees = listing.hoaFee ?? null

        if (listing.listingAgent) {
          result.listingAgentName = listing.listingAgent.name ?? null
          result.listingAgentPhone = listing.listingAgent.phone ?? null
          result.listingAgentEmail = listing.listingAgent.email ?? null
        }
        if (listing.listingOffice) {
          result.listingOfficeName = listing.listingOffice.name ?? null
        }

        if (pinType === 'sold') {
          result.soldPrice = listing.price ?? null
        }

        logger.info('[propertyLookup] listing found', { address, status: listingStatus, price: result.listingPrice })
      }

      // 2. If no listing found or missing basic details, try property data
      if (!listing || !result.bedrooms) {
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

          if (pinType === 'sold' && !result.soldPrice) {
            result.soldPrice = prop.lastSalePrice ?? null
            result.soldDate = prop.lastSaleDate ?? null
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
