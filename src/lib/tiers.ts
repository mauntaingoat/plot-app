// ════════════════════════════════════════
// PRICING TIERS — single source of truth
// ════════════════════════════════════════

import type { UserDoc, Pin } from './types'
import { isAdmin } from './admin'

export type Tier = 'free' | 'pro' | 'studio'

export interface TierLimits {
  id: Tier
  name: string
  price: number
  maxActivePins: number
  maxContentPerPin: number
  maxVideoSeconds: number
  advancedAnalytics: boolean
  liveStreaming: boolean
  savedMapInsights: boolean
}

export const TIERS: Record<Tier, TierLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    maxActivePins: 6,
    maxContentPerPin: 3,
    maxVideoSeconds: 180,
    advancedAnalytics: false,
    liveStreaming: false,
    savedMapInsights: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 19,
    maxActivePins: 9999,
    maxContentPerPin: 10,
    maxVideoSeconds: 180,
    advancedAnalytics: true,
    liveStreaming: false,
    savedMapInsights: false,
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    price: 39,
    maxActivePins: 9999,
    maxContentPerPin: 10,
    maxVideoSeconds: 180,
    advancedAnalytics: true,
    liveStreaming: true,
    savedMapInsights: true,
  },
}

// ── Helpers ──

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

// ── Gating checks ──

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
  if (pin.content.length >= limits.maxContentPerPin) {
    return {
      allowed: false,
      reason: `You've reached ${limits.maxContentPerPin} content items per pin on the ${limits.name} plan.`,
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

export function hasFeature(user: UserDoc | null, feature: keyof Pick<TierLimits, 'advancedAnalytics' | 'liveStreaming' | 'savedMapInsights'>): boolean {
  return getTierLimits(user)[feature]
}
