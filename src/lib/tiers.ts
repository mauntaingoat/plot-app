import type { UserDoc, Pin } from './types'
import { isAdmin } from './admin'

export type Tier = 'free' | 'pro'

export interface TierLimits {
  id: Tier
  name: string
  price: number
  maxActivePins: number
  maxContentPerPin: number
  maxSpotlightContent: number
  maxVideoSeconds: number
  /** Pro only — unlocks the full analytics dashboard (visits, taps,
   *  save growth, viewer cities, peak hours, content performance,
   *  audience crossover). Free agents see the basic stat cards
   *  (visits/taps/saves/waves) but not the deep charts. */
  advancedAnalytics: boolean
  /** Pro only — open house scheduling on for_sale pins. */
  openHouses: boolean
  /** Pro only — agent receives FCM/email pings for new buyer
   *  email signups + waves. */
  emailNotifications: boolean
  /** Pro only — expanded customization (custom ticker items, custom
   *  CTA labels, brand color override, profile layout choices, etc.). */
  expandedCustomization: boolean
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
    openHouses: false,
    emailNotifications: false,
    expandedCustomization: false,
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
    openHouses: true,
    emailNotifications: true,
    expandedCustomization: true,
  },
}

export function getUserTier(user: UserDoc | null): Tier {
  if (!user) return 'free'
  // Admins get Pro automatically. Was Studio when we had three tiers;
  // collapsed to Pro now that Studio is gone.
  if (isAdmin(user.uid)) return 'pro'
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
      upgradeTo: 'pro',
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

export function hasFeature(
  user: UserDoc | null,
  feature: keyof Pick<TierLimits, 'advancedAnalytics' | 'openHouses' | 'emailNotifications' | 'expandedCustomization'>,
): boolean {
  return getTierLimits(user)[feature]
}
