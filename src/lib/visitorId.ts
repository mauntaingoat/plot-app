// Anonymous visitor identity for crossover analytics.
//
// One UUID per device, persisted in localStorage. Lets us group events
// from the same anonymous browser across sessions and agents — the
// unit the Crossover Insights card aggregates on.
//
// Falls back to an in-memory UUID when localStorage throws (private
// browsing, restrictive privacy settings). In-memory falls reset per
// tab — that's fine; crossover just won't count those visitors twice
// when they come back.

const STORAGE_KEY = 'reelst_visitor_id'

let cached: string | null = null

function generate(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // fall through to manual generator
  }
  // RFC4122-ish fallback for older browsers — sufficient for grouping.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getVisitorId(): string {
  if (cached) return cached
  try {
    if (typeof localStorage !== 'undefined') {
      const existing = localStorage.getItem(STORAGE_KEY)
      if (existing) {
        cached = existing
        return existing
      }
      const fresh = generate()
      localStorage.setItem(STORAGE_KEY, fresh)
      cached = fresh
      return fresh
    }
  } catch {
    // localStorage blocked — fall through to in-memory
  }
  cached = generate()
  return cached
}
