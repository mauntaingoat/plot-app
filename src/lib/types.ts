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
  suspended?: boolean // admin can suspend an agent
  suspendedReason?: string
}

// ── Pin types — 2 listing types + spotlight ──

export type PinType = 'for_sale' | 'sold' | 'spotlight'
export type ListingStatus = 'active' | 'pending' | 'contingent' | 'closed'
export type ContentType = 'reel' | 'live' | 'video_note' | 'photo'
export type HomeType = 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'land' | 'commercial' | 'other'

export interface Coordinates {
  lat: number
  lng: number
}

// ── Content item (lives inside a pin AND in the content collection) ──

export interface ContentItem {
  id: string
  type: ContentType
  mediaUrl: string
  mediaUrls?: string[] // for photo carousels — multiple images in one content item
  thumbnailUrl?: string
  caption: string
  duration?: number // seconds, for reels/videos
  createdAt: Timestamp
  views: number
  saves: number
  publishAt?: Timestamp | null // if set + in the future, content is hidden from the public until then
}

// ── Standalone content document (content collection) ──

export interface ContentDoc extends ContentItem {
  agentId: string
  pinId: string | null // null = unlinked, not assigned to any pin
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

// ── Content reports (moderation) ──

export type ReportReason = 'spam' | 'inappropriate' | 'fake_listing' | 'harassment' | 'copyright' | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed'

export interface ContentReport {
  id: string
  reporterUid: string // who reported
  targetType: 'pin' | 'content' | 'agent' // what was reported
  targetId: string // pin id, content id, or agent uid
  targetOwnerId: string // the agent who owns the reported content
  reason: ReportReason
  detail: string // free-text detail
  status: ReportStatus
  createdAt: Timestamp
}

// ── DMCA takedown requests ──

export type DmcaStatus = 'pending' | 'actioned' | 'counter_filed' | 'dismissed'

export interface DmcaRequest {
  id: string
  claimantName: string
  claimantEmail: string
  targetPinId: string
  targetContentId?: string
  originalWorkUrl: string // URL to the original copyrighted work
  description: string
  swornStatement: boolean // "I swear under penalty of perjury..."
  status: DmcaStatus
  createdAt: Timestamp
}

// ── License disputes ──

export type DisputeStatus = 'pending' | 'resolved_for_claimant' | 'resolved_for_existing' | 'dismissed'

export interface LicenseDispute {
  id: string
  claimantUid: string
  claimantName: string
  claimantEmail: string
  existingUid: string // the user who currently holds the license
  licenseNumber: string
  licenseState: string
  licenseName: string // name on the license per the claimant
  evidence: string // free-text explanation
  status: DisputeStatus
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

// Spotlight — neighborhood, building, local favorite
export interface SpotlightPin extends PinBase {
  type: 'spotlight'
  name: string // e.g. "Brickell", "Coral Gables", "Paramount Tower"
  description: string
  heroPhotoUrl?: string
}

export type Pin = ForSalePin | SoldPin | SpotlightPin

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
  spotlight: {
    label: 'Spotlight',
    color: '#FF6B3D',
    bgColor: 'rgba(255, 107, 61, 0.12)',
  },
}
