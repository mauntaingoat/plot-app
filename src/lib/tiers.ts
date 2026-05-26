import type { UserDoc, Pin } from './types'

export type Tier = 'free' | 'pro'

export interface TierLimits {
  id: Tier
  name: string
  price: number
  maxActivePins: number
  maxContentPerPin: number
  maxSpotlightContent: number
  maxVideoSeconds: number
  /** Linktree-style custom external links on the public profile.
   *  Free gets a taste; Pro unlocks a useful stack without ballooning. */
  maxCustomLinks: number
  /** Pro only — unlocks the full analytics dashboard (visits, taps,
   *  save growth, viewer cities, peak hours, content performance,
   *  audience crossover). Free agents see the basic stat cards
   *  (visits/taps/saves/waves) but not the deep charts. */
  advancedAnalytics: boolean
  /** Pro only — open house scheduling on for_sale pins. */
  openHouses: boolean
  /** Available on every tier — agent receives FCM push + per-event
   *  email pings for new buyer signups, waves, showings, and saves
   *  (gated only by the per-event toggle in notification settings, not
   *  by tier). Kept in TierLimits for legacy compatibility with the
   *  hasFeature() helper but always returns true. */
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
    maxCustomLinks: 3,
    advancedAnalytics: false,
    openHouses: false,
    emailNotifications: true,
    expandedCustomization: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    // Active pin cap — sized for a working agent's realistic inventory
    // (typical 10-30 active listings + sold pins + spotlights). Bounds
    // per-agent Firestore read load (every profile visit reads all
    // pins) and Mux storage. Power users (teams, brokerages) with
    // genuinely larger inventories get an override via direct user
    // doc edit; mirror this number in `functions/src/pinControl.ts`'s
    // ACTIVE_PIN_CAP if you change it.
    maxActivePins: 50,
    maxContentPerPin: 999,
    maxSpotlightContent: 999,
    maxVideoSeconds: 180,
    maxCustomLinks: 20,
    advancedAnalytics: true,
    openHouses: true,
    emailNotifications: true,
    expandedCustomization: true,
  },
}

export function getUserTier(user: UserDoc | null): Tier {
  if (!user) return 'free'
  // Admins are granted Pro by writing tier='pro' onto their user doc
  // at grant time (see functions/grant-admin.mjs). This means the
  // tier check below works for everyone — no isAdmin() branch needed
  // here, and `getUserTier` works for ANY user (including ones whose
  // claims aren't accessible to the current viewer).
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

// "Active" = toggled on and not archived. Content count intentionally
// excluded — an enabled empty pin still counts against the cap so a
// free agent can't park placeholder pins all toggled-on to skirt the
// limit.
export function isPinActive(pin: Pin): boolean {
  return pin.enabled && (pin as any).status !== 'archived'
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
