/**
 * Canonical share URLs for the public-profile surface.
 *
 * Routes today: the React app only has /:username — pin and content
 * are surfaced via query params (?pin=<id>&content=<id>) that
 * AgentProfile reads on mount to auto-open the matching modal /
 * scroll-snap to the matching card. Keeping these in one place so
 * every share callsite produces the same shape.
 */

function origin(): string {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

export function profileUrl(username: string | null | undefined): string {
  return `${origin()}/${username || ''}`
}

export function pinUrl(username: string | null | undefined, pinId: string): string {
  return `${profileUrl(username)}?pin=${encodeURIComponent(pinId)}`
}

export function contentUrl(
  username: string | null | undefined,
  pinId: string,
  contentId: string,
): string {
  return `${profileUrl(username)}?pin=${encodeURIComponent(pinId)}&content=${encodeURIComponent(contentId)}`
}
