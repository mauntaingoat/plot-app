import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'consumer' | 'agent'
export type AgentType = 'agent' | 'brokerage' | 'developer'

export type PinType = 'listing' | 'story' | 'reel' | 'live' | 'sold' | 'open_house'

export type ListingStatus = 'active' | 'pending' | 'contingent'

export interface Platform {
  id: string
  username: string
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
  platforms: Platform[]
  followerCount: number
  followingCount: number
  onboardingComplete: boolean
  onboardingStep: number
  setupPercent: number
}

export interface Coordinates {
  lat: number
  lng: number
}

export interface PinBase {
  id: string
  agentId: string
  type: PinType
  coordinates: Coordinates
  address: string
  neighborhoodId: string
  geohash: string
  enabled: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  views: number
  taps: number
  saves: number
}

export interface ListingPin extends PinBase {
  type: 'listing'
  price: number
  beds: number
  baths: number
  sqft: number
  heroPhotoUrl: string
  photos: string[]
  description: string
  status: ListingStatus
}

export interface SoldPin extends PinBase {
  type: 'sold'
  soldPrice: number
  soldDate: Timestamp
  originalPrice: number
  heroPhotoUrl: string
  photos: string[]
}

export interface StoryPin extends PinBase {
  type: 'story'
  mediaUrl: string
  mediaType: 'image' | 'video'
  caption: string
  expiresAt: Timestamp
}

export interface ReelPin extends PinBase {
  type: 'reel'
  mediaUrl: string
  thumbnailUrl: string
  duration: number
  caption: string
}

export interface LivePin extends PinBase {
  type: 'live'
  streamUrl: string
  viewerCount: number
  startedAt: Timestamp
  title: string
}

export interface OpenHousePin extends PinBase {
  type: 'open_house'
  listingPrice: number
  startTime: Timestamp
  endTime: Timestamp
  heroPhotoUrl: string
}

export type Pin = ListingPin | SoldPin | StoryPin | ReelPin | LivePin | OpenHousePin

export interface FollowDoc {
  followerUid: string
  followedUid: string
  createdAt: Timestamp
}

export interface SaveDoc {
  userId: string
  pinId: string
  createdAt: Timestamp
}

export interface UsernameDoc {
  uid: string
  createdAt: Timestamp
}

// Pin type visual config
export const PIN_CONFIG: Record<PinType, {
  label: string
  color: string
  bgColor: string
  icon: string
}> = {
  listing: {
    label: 'For Sale',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    icon: 'home',
  },
  sold: {
    label: 'Sold',
    color: '#34C759',
    bgColor: 'rgba(52, 199, 89, 0.12)',
    icon: 'badge-check',
  },
  story: {
    label: 'Story',
    color: '#FF6B3D',
    bgColor: 'rgba(255, 107, 61, 0.12)',
    icon: 'camera',
  },
  reel: {
    label: 'Reel',
    color: '#A855F7',
    bgColor: 'rgba(168, 85, 247, 0.12)',
    icon: 'film',
  },
  live: {
    label: 'Live',
    color: '#FF3B30',
    bgColor: 'rgba(255, 59, 48, 0.12)',
    icon: 'radio',
  },
  open_house: {
    label: 'Open House',
    color: '#FFAA00',
    bgColor: 'rgba(255, 170, 0, 0.12)',
    icon: 'door-open',
  },
}
