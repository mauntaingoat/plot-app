import type { UserDoc, Pin } from './types'
import { isAdmin } from './admin'

export type Tier = 'free' | 'pro' | 'studio'

export interface TierLimits {
  id: Tier
  name: string
  price: number
  maxActivePins: number
  maxContentPerPin: number
  maxSpotlightContent: number
  maxVideoSeconds: number
  advancedAnalytics: boolean
  savedMapInsights: boolean
  liveStreaming: boolean
  openHouses: boolean
  inExplore: boolean
  emailNotifications: boolean
}

export const TIERS: Record<Tier, TierLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    maxActivePins: 3,
    maxContentPerPin: 999,
    maxSpotlightContent: 999,
    maxVideoSeconds: 180,
    advancedAnalytics: false,
    savedMapInsights: false,
    liveStreaming: false,
    openHouses: false,
    inExplore: false,
    emailNotifications: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 19,
    maxActivePins: 9999,
    maxContentPerPin: 999,
    maxSpotlightContent: 999,
    maxVideoSeconds: 180,
    advancedAnalytics: true,
    savedMapInsights: false,
    liveStreaming: false,
    openHouses: true,
    inExplore: true,
    emailNotifications: true,
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    price: 39,
    maxActivePins: 9999,
    maxContentPerPin: 999,
    maxSpotlightContent: 999,
    maxVideoSeconds: 180,
    advancedAnalytics: true,
    savedMapInsights: true,
    liveStreaming: true,
    openHouses: true,
    inExplore: true,
    emailNotifications: true,
  },
}

export function getUserTier(user: UserDoc | null): Tier {
  if (!user) return 'free'
  if (isAdmin(user.uid)) return 'studio'
  const giftTier = (user as any).giftTier as Tier | undefined
  const giftExpiry = (user as any).giftExpiry as any
  if (giftTier && giftExpiry) {
    const expiryMs = typeof giftExpiry.toMillis === 'function' ? giftExpiry.toMillis() : giftExpiry
    if (expiryMs > Date.now()) return giftTier
  }
  return ((user as any).tier as Tier) || 'free'
}

export function getTierLimits(user: UserDoc | null): TierLimits {
  return TIERS[getUserTier(user)]
}

export function isPinActive(pin: Pin): boolean {
  return pin.enabled && (pin as any).status !== 'archived' && pin.content.length > 0
}

export function countActivePins(pins: Pin[]): number {
  return pins.filter(isPinActive).length
}

export interface GateResult {
  allowed: boolean
  reason?: string
  upgradeTo?: Tier
}

export function canActivatePin(user: UserDoc | null, pins: Pin[]): GateResult {
  const limits = getTierLimits(user)
  const activeCount = countActivePins(pins)
  if (limits.maxActivePins < 9999 && activeCount >= limits.maxActivePins) {
    return {
      allowed: false,
      reason: `You've reached the ${limits.maxActivePins} active pin limit on the ${limits.name} plan.`,
      upgradeTo: 'pro',
    }
  }
  return { allowed: true }
}

export function canAddContent(user: UserDoc | null, pin: Pin): GateResult {
  const limits = getTierLimits(user)
  const max = pin.type === 'spotlight' ? limits.maxSpotlightContent : limits.maxContentPerPin
  if (max < 9999 && pin.content.length >= max) {
    return {
      allowed: false,
      reason: `You've reached the content limit per pin on the ${limits.name} plan.`,
      upgradeTo: limits.id === 'free' ? 'pro' : 'studio',
    }
  }
  return { allowed: true }
}

export function canUploadVideo(user: UserDoc | null, durationSeconds: number): GateResult {
  const limits = getTierLimits(user)
  if (durationSeconds > limits.maxVideoSeconds) {
    return {
      allowed: false,
      reason: 'Videos are limited to 3 minutes.',
    }
  }
  return { allowed: true }
}

export function hasFeature(user: UserDoc | null, feature: keyof Pick<TierLimits, 'advancedAnalytics' | 'liveStreaming' | 'savedMapInsights' | 'openHouses' | 'inExplore' | 'emailNotifications'>): boolean {
  return getTierLimits(user)[feature]
}
