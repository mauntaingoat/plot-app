import type { Pin, ContentItem } from '@/lib/types'

// Flatten all content items across the given pins, hide future-scheduled
// posts, and sort newest-first by createdAt. Pure utility — no I/O.
export function getAllContent(pins: Pin[]): { content: ContentItem; pin: Pin }[] {
  const items: { content: ContentItem; pin: Pin }[] = []
  const now = Date.now()
  for (const pin of pins) {
    for (const c of pin.content) {
      const publishMs = (c.publishAt as any)?.toMillis?.() ?? null
      if (publishMs != null && publishMs > now) continue
      items.push({ content: c, pin })
    }
  }
  items.sort((a, b) => {
    const aMs = typeof a.content.createdAt?.toMillis === 'function' ? a.content.createdAt.toMillis() : 0
    const bMs = typeof b.content.createdAt?.toMillis === 'function' ? b.content.createdAt.toMillis() : 0
    return bMs - aMs
  })
  return items
}
