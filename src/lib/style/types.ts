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

/** A single agent-curated link on the public profile.
 *  Render order is whatever order `customLinks` lives in — drag in the
 *  Style tab is the source of truth.
 *
 *  Thumbnail is optional: when missing, the renderer falls back to a
 *  gradient avatar derived from the title's first letter so empty-state
 *  links still feel intentional. */
export interface CustomLink {
  /** Stable id: 'lnk_<ts>_<rand>'. */
  id: string
  /** Visible label, max 60 chars. */
  title: string
  /** External URL — always https. Normalized on save (we prepend
   *  `https://` if scheme missing). */
  url: string
  /** Optional Firebase Storage download URL for a small thumbnail. */
  thumbnailUrl?: string | null
}

/** Where the custom-links stack lives in the profile layout. */
export type CustomLinksPosition = 'above' | 'below'

/** Max title length — enforced on save in the editor + truncated at
 *  render time as a defensive belt-and-braces. */
export const MAX_LINK_TITLE_LEN = 60

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
    /** Custom links stack frame. Defaults to the same `border_shadow`
     *  starter as the other surfaces so links look like siblings of
     *  the listings cards out of the box. */
    links: FrameStyle
  }

  /** Section visibility. */
  sections: {
    bio: boolean
    ticker: boolean
    social: boolean
    map: boolean
    /** Content cards (listings/sold/spotlight grid). Defaults true.
     *  When off, the public profile renders map + links only — useful
     *  for agents using Reelst as a pure link-in-bio surface. */
    content: boolean
    /** Custom links stack (Linktree-style). Defaults true; the stack
     *  renders nothing on empty `customLinks` anyway, so toggling off
     *  is just for agents who want zero possibility of one showing. */
    links: boolean
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

  /** Optional Pro override for the palette accent color. When set,
   *  takes precedence over `palette.accent` on the public profile.
   *  Must be a 7-char hex (`#RRGGBB`). The `--accent-ink` companion
   *  is auto-derived from luminance, not stored. */
  customAccentColor?: string | null

  /** Optional Pro override for the display/heading text color.
   *  When set, takes precedence over `palette.textPrimary`.
   *  Hierarchy (secondary/muted) stays palette-derived. */
  customFontColor?: string | null

  /** Optional Pro override for the page background. When set,
   *  replaces `palette.pageCanvas` AND `palette.surroundBg` with
   *  this solid hex on mobile + desktop. Card surface stays
   *  palette-derived so cards still visually lift off the canvas. */
  customBackgroundColor?: string | null

  /** Optional Pro custom background image URL (Firebase Storage).
   *  When set, takes precedence over `customBackgroundColor` and
   *  the palette's `cardBg` — applied as `background: url(...)
   *  center / cover` on the profile card surface. Resized client-
   *  side to max 1600px wide before upload. */
  customBackgroundImage?: string | null

  /** Linktree-style stack of agent-curated external links. Ordered
   *  array — drag in the Style tab editor is the source of truth.
   *  Free: 3 max. Pro: 20 max. Render position controlled by
   *  `customLinksPosition` below. */
  customLinks: CustomLink[]
  /** Whether the links stack renders above or below the listings/
   *  content grid on the public profile. */
  customLinksPosition: CustomLinksPosition
}
