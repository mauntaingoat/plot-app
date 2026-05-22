import type { UserDocLite } from './firestoreDb'
import type { Pin } from '../types'

/**
 * Mirrors `computedSetupPercent` in `src/pages/Dashboard.tsx:605`.
 * Weighted checklist totalling 100. Same item order + weights so the
 * iOS ring shows the same percent the web shows for the same user.
 */
export function computeSetupPercent(user: UserDocLite | null, pins: Pin[]): number {
  if (!user) return 0
  const items = [
    { weight: 10, check: !!user.username },
    { weight: 15, check: !!user.photoURL },
    { weight: 10, check: !!user.displayName && user.displayName.length > 0 },
    { weight: 10, check: !!user.bio && user.bio.length > 0 },
    { weight: 15, check: (user.platforms?.length ?? 0) > 0 },
    { weight: 10, check: !!user.licenseNumber },
    { weight: 20, check: pins.length >= 1 },
    { weight: 10, check: pins.length >= 3 },
  ]
  return items.filter((i) => i.check).reduce((s, i) => s + i.weight, 0)
}
