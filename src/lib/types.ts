import type { Timestamp } from 'firebase/firestore'

// ── User types ──

export type UserRole = 'consumer' | 'agent'
export type AgentType = 'agent' | 'brokerage' | 'developer'

export interface Platform {
  id: string
  username: string
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type UserTier = 'free' | 'pro' | 'studio'

export interface NotificationPrefs {
  newFollower: boolean
  showingRequest: boolean
  pinSaved: boolean // off by default — can get noisy
}

export interface UserDoc {
  uid: string
  email: string
  role: UserRole
  agentType?: AgentType
  createdAt: Timestamp
  username: string | null
  displayName: string
  photoURL: string | null
  bio: string
  brokerage: string | null
  licenseNumber: string | null
  licenseState: string | null
  licenseName: string | null // legal name on the license
  verificationStatus: VerificationStatus
  fairHousingAccepted: boolean
  dataSecurityAccepted: boolean
  emailVerified: boolean
  tier: UserTier // 'free' | 'pro' | 'studio'
  brandColor: string | null // Studio tier custom branding
  platforms: Platform[]
  followerCount: number
  followingCount: number
  onboardingComplete: boolean
  onboardingStep: number
  setupPercent: number
  fcmTokens?: string[] // device tokens for web push
  notificationPrefs?: NotificationPrefs
}

// ── Pin types — only 2 listing types + neighborhood ──

export type PinType = 'for_sale' | 'sold' | 'neighborhood'
export type ListingStatus = 'active' | 'pending' | 'contingent' | 'closed'
export type ContentType = 'reel' | 'story' | 'live' | 'video_note' | 'photo'
export type HomeType = 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'land' | 'commercial' | 'other'

export interface Coordinates {
  lat: number
  lng: number
}

// ── Content item (lives inside a pin) ──

export interface ContentItem {
  id: string
  type: ContentType
  mediaUrl: string
  thumbnailUrl?: string
  caption: string
  duration?: number // seconds, for reels/videos
  createdAt: Timestamp
  views: number
  saves: number
  publishAt?: Timestamp | null // if set + in the future, content is hidden from the public until then
}

// ── Open house schedule ──

export interface OpenHouseSession {
  id: string
  date: string // YYYY-MM-DD
  startTime: string // 24h "HH:MM"
  endTime: string // 24h "HH:MM"
}

export interface OpenHouse {
  sessions: OpenHouseSession[]
  // Repeat the first session weekly for N additional weeks (0 = no recurrence)
  recurringWeeks?: number
}

// ── Showing request (lead capture from a listing) ──

export type ShowingRequestStatus = 'new' | 'read' | 'scheduled' | 'closed'

export interface ShowingRequest {
  id: string
  agentId: string
  pinId: string
  pinAddress: string
  visitorName: string
  visitorEmail: string
  visitorPhone: string
  preferredDate: string // YYYY-MM-DD
  preferredTime: string // HH:MM 24h
  note: string
  status: ShowingRequestStatus
  createdAt: Timestamp
}

// ── Pin (listing or neighborhood) ──

export type PinStatus = 'active' | 'archived'

export interface PinBase {
  id: string
  agentId: string
  type: PinType
  coordinates: Coordinates
  address: string
  neighborhoodId: string
  geohash: string
  enabled: boolean
  status: PinStatus // 'active' | 'archived' — archived pins are soft-deleted
  createdAt: Timestamp
  updatedAt: Timestamp
  views: number
  taps: number
  saves: number
  content: ContentItem[] // all content lives inside the pin
}

// For Sale listing
export interface ForSalePin extends PinBase {
  type: 'for_sale'
  price: number
  beds: number
  baths: number
  sqft: number
  pricePerSqft: number
  homeType: HomeType
  yearBuilt?: number
  lotSize?: string
  heroPhotoUrl: string
  photos: string[]
  description: string
  status: ListingStatus
  daysOnMarket: number
  mlsNumber?: string
  openHouse?: OpenHouse | null
  isLive?: boolean // agent is currently live streaming this listing
}

// Sold listing
export interface SoldPin extends PinBase {
  type: 'sold'
  soldPrice: number
  originalPrice: number
  soldDate: Timestamp
  beds: number
  baths: number
  sqft: number
  pricePerSqft: number
  homeType: HomeType
  yearBuilt?: number
  heroPhotoUrl: string
  photos: string[]
  description: string
  daysOnMarket: number
  mlsNumber?: string
}

// Neighborhood content zone
export interface NeighborhoodPin extends PinBase {
  type: 'neighborhood'
  name: string // e.g. "Brickell", "Coral Gables"
  description: string
  heroPhotoUrl?: string
}

export type Pin = ForSalePin | SoldPin | NeighborhoodPin

// ── Social ──

export interface FollowDoc {
  followerUid: string
  followedUid: string
  createdAt: Timestamp
}

export interface SaveDoc {
  userId: string
  pinId: string
  contentId?: string // optional — save specific content or entire listing
  createdAt: Timestamp
}

export interface UsernameDoc {
  uid: string
  createdAt: Timestamp
}

// ── Pin visual config ──

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
  neighborhood: {
    label: 'Neighborhood',
    color: '#FF6B3D',
    bgColor: 'rgba(255, 107, 61, 0.12)',
  },
}
