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
}
