/**
 * Domain types — narrow subset mirrored from `src/lib/types.ts` (web).
 * Only the fields the iOS app actually reads are duplicated here, on
 * purpose, to keep mobile/ independent of web src/.
 */

export type PinType = 'for_sale' | 'sold' | 'spotlight'

export interface PinContentItem {
  id?: string
  type?: 'reel' | 'photo' | string
  mediaUrl?: string | null
  thumbnailUrl?: string | null
}

export interface Pin {
  id: string
  agentId: string
  type: PinType
  address: string
  unit?: string | null
  city?: string
  state?: string
  zip?: string
  heroPhotoUrl?: string | null
  // for_sale / sold pins
  price?: number
  soldPrice?: number
  beds?: number
  baths?: number
  sqft?: number
  // bookkeeping
  enabled?: boolean
  archivedAt?: unknown | null
  content?: PinContentItem[]
}

export const PIN_CONFIG: Record<PinType, {
  label: string
  color: string
  bgColor: string
}> = {
  for_sale: {
    label: 'For Sale',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
  },
  sold: {
    label: 'Sold',
    color: '#34C759',
    bgColor: 'rgba(52, 199, 89, 0.12)',
  },
  spotlight: {
    label: 'Spotlight',
    color: '#FF6B3D',
    bgColor: 'rgba(255, 107, 61, 0.12)',
  },
}

export function formatPrice(price?: number | null): string | null {
  if (!price || price <= 0) return null
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`
  return `$${price}`
}

/** Match web `displayAddressWithUnit` (src/lib/format.ts). */
export function displayAddressWithUnit(pin: Pin): string {
  if (pin.unit) return `${pin.address}, ${pin.unit}`
  return pin.address
}
