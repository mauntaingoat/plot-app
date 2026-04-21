/**
 * Property data lookup via RealtyMole API.
 *
 * Takes an address string, returns property details: beds, baths,
 * sqft, property type, year built, lot size. Agent confirms and
 * adds price + content.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'

const REALTYMOLE_API_KEY = defineSecret('REALTYMOLE_API_KEY')

interface PropertyLookupRequest {
  address: string
}

interface PropertyData {
  bedrooms: number | null
  bathrooms: number | null
  squareFootage: number | null
  propertyType: string | null
  yearBuilt: number | null
  lotSize: string | null
  lastSalePrice: number | null
  lastSaleDate: string | null
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

    const { address } = request.data
    if (!address || address.trim().length < 5) {
      throw new HttpsError('invalid-argument', 'A valid address is required.')
    }

    const apiKey = REALTYMOLE_API_KEY.value()
    if (!apiKey) {
      throw new HttpsError('unavailable', 'Property lookup is not configured.')
    }

    try {
      const encoded = encodeURIComponent(address.trim())
      const res = await fetch(
        `https://realty-mole-property-api.p.rapidapi.com/properties?address=${encoded}`,
        {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'realty-mole-property-api.p.rapidapi.com',
          },
        },
      )

      if (!res.ok) {
        logger.warn('[propertyLookup] API error', { status: res.status })
        throw new HttpsError('not-found', 'No property data found for this address.')
      }

      const data = await res.json()
      const prop = Array.isArray(data) ? data[0] : data

      if (!prop) {
        throw new HttpsError('not-found', 'No property data found for this address.')
      }

      const result: PropertyData = {
        bedrooms: prop.bedrooms ?? null,
        bathrooms: prop.bathrooms ?? null,
        squareFootage: prop.squareFootage ?? null,
        propertyType: prop.propertyType ?? null,
        yearBuilt: prop.yearBuilt ?? null,
        lotSize: prop.lotSize ? String(prop.lotSize) : null,
        lastSalePrice: prop.lastSalePrice ?? null,
        lastSaleDate: prop.lastSaleDate ?? null,
      }

      logger.info('[propertyLookup] success', { address, type: result.propertyType })
      return result
    } catch (err) {
      if (err instanceof HttpsError) throw err
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('[propertyLookup] failed', { error: msg })
      throw new HttpsError('internal', 'Property lookup failed.')
    }
  },
)
