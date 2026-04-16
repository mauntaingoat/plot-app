import type { ContentItem, Pin } from '@/lib/types'

/**
 * Returns true if a content item should be visible to the public right now.
 * Content with `publishAt` in the future is hidden until that time passes.
 */
export function isContentPublished(item: ContentItem, nowMs: number = Date.now()): boolean {
  if (!item.publishAt) return true
  const ts = (item.publishAt as any)?.toMillis?.() ?? (item.publishAt as any)?._seconds * 1000
  if (ts == null) return true
  return ts <= nowMs
}

/**
 * Returns the pin's publicly-visible content (filters out scheduled items).
 * Used by ContentFeed, ListingModal, etc. The agent's own dashboard always sees everything.
 */
export function publicContent(pin: Pin): ContentItem[] {
  const now = Date.now()
  return (pin.content || []).filter((c) => isContentPublished(c, now))
}
