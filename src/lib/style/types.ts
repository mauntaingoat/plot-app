/* ════════════════════════════════════════════════════════════════
   AGENT STYLE — type definitions
   ────────────────────────────────────────────────────────────────
   Stored on `UserDoc.style`. Every agent profile reads this object
   to render their public page (palette → CSS vars, font → @font-
   face load, shape → map clip-path, etc.). All fields are id refs
   into the registries below — never store full color/path payloads
   so we can evolve the registry without migrating user docs.
   ──────────────────────────────────────────────────────────────── */

export type FrameStyle = 'none' | 'border' | 'shadow' | 'border_shadow'

/** Listings/content card layout strategy.
 *  - `scroller`: 1 = centered 1:1, 2 = side-by-side 1:1, 3 = thirds
 *    9:16, 4+ horizontally scrolls (3 visible per viewport, drag for
 *    more).
 *  - `grid`: same column scale as scroller for 1/2/3 cards, but 4+
 *    wraps onto additional rows instead of scrolling sideways. */
export type ListingsLayout = 'scroller' | 'grid'

export type TickerAutoKey = 'for_sale' | 'sold' | 'open_houses' | 'spotlights'

export interface TickerCustomItem {
  /** Stable id used in the ordering array. */
  id: string
  /** What the agent is bragging about — "$42M total volume sold". */
  label: string
}

export interface AgentStyle {
  /** Palette id from `PALETTES` registry. */
  paletteId: string
  /** Font pairing id from `FONTS` registry. */
  fontId: string
  /** Map viewport shape id from `SHAPES` registry. */
  shapeId: string

  /** Frame treatment per surface — independent for design freedom. */
  frames: {
    avatar: FrameStyle
    map: FrameStyle
    listings: FrameStyle
  }

  /** Section visibility — listings are mandatory (the product). */
  sections: {
    bio: boolean
    ticker: boolean
    social: boolean
    map: boolean
  }

  /** Per-stat toggle for the auto-derived ticker phrases. */
  tickerAuto: Record<TickerAutoKey, boolean>
  /** Custom hand-typed ticker items (e.g., "$42M sold"). */
  tickerCustom: TickerCustomItem[]
  /** Display order — mix of TickerAutoKey ids and custom item ids. */
  tickerOrder: string[]

  /** Top-corner action button labels. */
  ctaLabels: {
    wave: string
    save: string
  }

  /** How the listings/content cards lay out on the public profile.
   *  See `ListingsLayout` for the two modes. */
  listingsLayout: ListingsLayout
}
