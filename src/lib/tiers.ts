// ════════════════════════════════════════
// PRICING TIERS — single source of truth
// ════════════════════════════════════════

import type { UserDoc, Pin } from './types'

export type Tier = 'free' | 'pro' | 'studio'

export interface TierLimits {
  id: Tier
  name: string
  price: number // monthly USD, 0 for free
  maxActivePins: number
  maxContentPerPin: number
  maxVideoSeconds: number
  // Features
  advancedAnalytics: boolean
  liveStreaming: boolean
  scheduledContent: boolean
  savedMapInsights: boolean
  customBranding: boolean
}

export const TIERS: Record<Tier, TierLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    maxActivePins: 5,
    maxContentPerPin: 3,
    maxVideoSeconds: 60,
    advancedAnalytics: false,
    liveStreaming: false,
    scheduledContent: false,
    savedMapInsights: false,
    customBranding: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 19,
    maxActivePins: 20,
    maxContentPerPin: 5,
    maxVideoSeconds: 180,
    advancedAnalytics: true,
    liveStreaming: true,
    scheduledContent: true,
    savedMapInsights: false,
    customBranding: false,
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    price: 39,
    maxActivePins: 50,
    maxContentPerPin: 10,
    maxVideoSeconds: 180,
    advancedAnalytics: true,
    liveStreaming: true,
    scheduledContent: true,
    savedMapInsights: true,
    customBranding: true,
  },
}

// ── Helpers ──

export function getUserTier(user: UserDoc | null): Tier {
  if (!user) return 'free'
  // tier field will be added to UserDoc — fall back to free if not set
  return ((user as any).tier as Tier) || 'free'
}

export function getTierLimits(user: UserDoc | null): TierLimits {
  return TIERS[getUserTier(user)]
}

// "Active" = visible on the map. enabled + status:active + has at least 1 content item
export function isPinActive(pin: Pin): boolean {
  return pin.enabled && (pin as any).status !== 'archived' && pin.content.length > 0
}

export function countActivePins(pins: Pin[]): number {
  return pins.filter(isPinActive).length
}

// ── Gating checks — return true if action is allowed ──

export interface GateResult {
  allowed: boolean
  reason?: string
  upgradeTo?: Tier
}

export function canActivatePin(user: UserDoc | null, pins: Pin[]): GateResult {
  const limits = getTierLimits(user)
  const activeCount = countActivePins(pins)
  if (activeCount >= limits.maxActivePins) {
    return {
      allowed: false,
      reason: `You've reached the ${limits.maxActivePins} active pin limit on the ${limits.name} plan.`,
      upgradeTo: limits.id === 'free' ? 'pro' : 'studio',
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
    const limitMin = Math.floor(limits.maxVideoSeconds / 60)
    return {
      allowed: false,
      reason: `Videos on the ${limits.name} plan are limited to ${limitMin} minute${limitMin !== 1 ? 's' : ''}.`,
      upgradeTo: limits.id === 'free' ? 'pro' : 'studio',
    }
  }
  return { allowed: true }
}

export function hasFeature(user: UserDoc | null, feature: keyof Pick<TierLimits, 'advancedAnalytics' | 'liveStreaming' | 'scheduledContent' | 'savedMapInsights' | 'customBranding'>): boolean {
  return getTierLimits(user)[feature]
}
