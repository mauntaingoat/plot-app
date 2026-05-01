import type { Timestamp } from 'firebase/firestore'
import type { AgentStyle } from './style/types'

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
  /** Legacy — kept on the type so older user docs still parse. The
   *  new product model uses `newSubscriber` instead; `newFollower`
   *  is no longer surfaced in the dashboard UI. */
  newFollower: boolean
  showingRequest: boolean
  /** Legacy — kept for older user docs. Replaced by `newSubscriber`
   *  in the new public-profile flow. */
  pinSaved: boolean
  /** New (Save Maya). True = ping me on each new email subscriber. */
  newSubscriber: boolean
  /** New (Wave). True = ping me when buyers wave at a listing. */
  newWave: boolean
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
  giftTier?: UserTier
  giftExpiry?: Timestamp | null
  lastActiveAt?: Timestamp
  /** Agent profile customization (palette, font, map shape, frames,
   *  section visibility, ticker stats, CTA labels). Optional — when
   *  unset the public profile renders with `DEFAULT_STYLE`. */
  style?: AgentStyle
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
  mediaUrls?: string[]
  thumbnailUrl?: string
  caption: string
  duration?: number
  createdAt: Timestamp
  views: number
  saves: number
  publishAt?: Timestamp | null
  /** Mux fields — populated by the Mux webhook when the asset finishes processing. */
  muxAssetId?: string
  muxPlaybackId?: string
  mp4Url?: string
  /** Original Firebase Storage URL — preserved for editing. */
  sourceUrl?: string
  /** All original clip Storage URLs for multi-clip reels. */
  sourceUrls?: string[]
  status?: 'preparing' | 'ready' | 'errored'
  /** The aspect ratio chosen in the editor (e.g. '9:16', '1:1', '4:5'). */
  aspect?: string
  uniqueViews?: number
  /** Set when archived (used on standalone ContentDoc only — pins
   *  archive at the pin level and cascade to their content). The
   *  cleanupArchivedAssets scheduled function deletes the Mux asset
   *  and hard-deletes the doc 7 days after this timestamp. */
  archivedAt?: Timestamp | null
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
  /** Apartment / unit / suite number — appended to the address when
   *  hitting Rentcast (so condos in the same building get distinct
   *  beds/baths/price/MLS#) and rendered as "Street #unit" in
   *  public-facing displays. Optional; single-family homes leave it
   *  blank. Stored without the leading '#'. */
  unit?: string | null
  neighborhoodId: string
  geohash: string
  enabled: boolean
  status: PinStatus // 'active' | 'archived' — archived pins are soft-deleted
  /** When the pin was archived. The cleanupArchivedAssets scheduled
   *  function deletes Storage + Mux assets and hard-deletes the doc
   *  7 days after this timestamp. Null/undefined while pin is active. */
  archivedAt?: Timestamp | null
  /** Records the most recent diff the agent rejected via the property
   *  sync review modal. The next syncPropertyData run skips diffs that
   *  match this snapshot so a rejected change isn't re-suggested. */
  rejectedSnapshot?: {
    price?: number
    type?: 'for_sale' | 'sold'
  } | null
  createdAt: Timestamp
  updatedAt: Timestamp
  views: number
  taps: number
  saves: number
  content: ContentItem[]
  /** Earliest future publishAt in the content array — scheduling hint
   *  for the publishScheduledContent cron so it can skip pins with no
   *  due content via a simple <= query. */
  nextPublishAt?: Timestamp | null
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
  listingStatus: ListingStatus
  daysOnMarket: number
  mlsNumber?: string
  openHouse?: OpenHouse | null
  isLive?: boolean
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

/**
 * Property-data diff produced by the syncPropertyData scheduled
 * Cloud Function and stored at /pins/{pinId}/pendingChanges/latest.
 * The dashboard reads these on load to surface a review modal/sheet.
 * Mutations on the diff (approve/reject) are done via firestore.ts
 * helpers — never directly written by the client.
 */
export interface PendingPinChange {
  /** Same as the parent pin id — denormalized for easier client use. */
  pinId: string
  agentId: string
  syncedAt: Timestamp
  /** Set when Rentcast reports a different price than what we store. */
  priceChange?: { from: number; to: number }
  /** Set on for_sale ↔ sold transitions. */
  typeChange?: { from: 'for_sale' | 'sold'; to: 'for_sale' | 'sold' }
  /** Populated alongside typeChange when transitioning to sold. ISO date. */
  soldDate?: string
  /** Latest MLS# from Rentcast — applied silently on approve. */
  mlsNumber?: string | null
}

/**
 * Email-based subscription to an agent's weekly digest. Replaces the
 * account-based `follows` flow on the new agent profile — buyers tap
 * "Save Maya," drop their email, and Reelst writes one of these.
 *
 * Phase 1: doc is created + an inbox notification fires for the agent.
 * No emails actually send. Phase 2 introduces the digest engine.
 */
export interface DigestSubscription {
  id: string
  agentId: string
  email: string                         // raw email (lowercased on write)
  emailHash: string                     // sha256 of the email — for dedup without exposing
  source?: 'profile' | 'listing' | 'reels' | string
  status: 'active' | 'unsubscribed'
  unsubToken: string                    // signed/random token for one-click unsubscribe
  newListings: boolean                  // opt-in flags (default true)
  newReels: boolean
  statusChanges: boolean
  lastSentAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * A "wave" — buyer's question on a listing, captured with name +
 * email so the agent can respond externally. Replaces the public
 * comment system entirely. Lives at /pins/{pinId}/waves/{waveId}
 * (subcollection so the pin can carry its own thread; the agent
 * sees aggregated waves in their dashboard inbox).
 */
export interface Wave {
  id: string
  pinId: string
  agentId: string
  pinAddress: string                    // denormalized for inbox rendering
  visitorName: string
  visitorEmail: string
  visitorPhone?: string | null          // optional — buyer may skip
  question: string                      // the message, max ~500 chars
  read: boolean                         // agent toggles read state
  status: 'new' | 'responded' | 'closed'
  createdAt: Timestamp
}

/**
 * Fields that are *specific* to a single pin type (not in PinBase).
 * Used by `updatePinType` in firestore.ts to wipe stale fields when an
 * existing pin's type changes — e.g., flipping a for_sale to sold
 * shouldn't leave behind `openHouse`, `listingStatus`, or `isLive`.
 */
export const TYPE_SPECIFIC_FIELDS: Record<PinType, ReadonlyArray<string>> = {
  for_sale: [
    'price',
    'beds',
    'baths',
    'sqft',
    'pricePerSqft',
    'homeType',
    'yearBuilt',
    'lotSize',
    'heroPhotoUrl',
    'photos',
    'description',
    'listingStatus',
    'daysOnMarket',
    'mlsNumber',
    'openHouse',
    'isLive',
  ],
  sold: [
    'soldPrice',
    'originalPrice',
    'soldDate',
    'beds',
    'baths',
    'sqft',
    'pricePerSqft',
    'homeType',
    'yearBuilt',
    'heroPhotoUrl',
    'photos',
    'description',
    'daysOnMarket',
    'mlsNumber',
  ],
  spotlight: [
    'name',
    'description',
    'heroPhotoUrl',
  ],
}

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

// ── Aspect helpers ──

const ASPECT_HW: Record<string, number> = {
  '9:16': 16 / 9,   // 1.78
  '3:4':  4 / 3,    // 1.33
  '4:5':  5 / 4,    // 1.25
  '1:1':  1,         // 1.0
  '4:3':  3 / 4,    // 0.75
  '16:9': 9 / 16,   // 0.56
}

export function isTallAspect(aspect?: string): boolean {
  if (!aspect) return true
  const ratio = ASPECT_HW[aspect]
  if (ratio === undefined) return true
  return ratio >= 1.2
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
