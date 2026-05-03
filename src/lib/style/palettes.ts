import { TOPOGRAPHY_DATA_URL } from './topography-bg-data'

/* ════════════════════════════════════════════════════════════════
   PALETTES — 12 themes
   ────────────────────────────────────────────────────────────────
   Structured per the brand-guide groupings:
     • 3 Light    — solid card, surround = a "shadow-y" version
                    of the card (same hue, darker lightness)
     • 3 Dark     — same shadow-of-the-card surround logic, but
                    the base is a deep tone. Accent + accentInk
                    are tuned to harmonize with the darkness, not
                    fight it.
     • 3 Gradient — card has a gradient; surround uses the SAME
                    gradient direction with each stop pushed darker.
                    2 light + 1 dark.
     • 3 Pattern  — card carries a real motif (leopard, clouds on
                    sky, grass on forest). Surround is a deep solid
                    that reads as a shadow of the pattern's base.

   Field reference:
     pageCanvas / surroundBg — page surround (mobile / desktop)
     cardBg                  — card surface (where content sits)
     textPrimary             — display name + headlines (the BAR
                               in the swatch preview)
     textSecondary / textMuted — body text + captions
     accent / accentInk      — the DOT in the swatch — actions,
                               badges, sticker shadows + borders
     border                  — neutral hairline divider
     savedBg / savedInk      — subscribed-state pill
     shadowColor             — soft halo color (loading-screen
                               progress track only — sticker
                               shadows now use --accent)
   ──────────────────────────────────────────────────────────────── */

export interface Palette {
  id: string
  name: string
  vibe: string

  pageCanvas: string
  cardBg: string
  surroundBg: string

  textPrimary: string
  textSecondary: string
  textMuted: string

  accent: string
  accentInk: string

  border: string

  savedBg?: string
  savedInk?: string

  /** Whether the card surface is non-solid (gradient or pattern).
   *  Drives a few presentational choices in the picker chip. */
  patterned?: boolean

  shadowColor?: string
}

const DEFAULT_DARK_SHADOW = 'rgba(10,14,23,0.32)'
const LIGHT_HALO = 'rgba(255,255,255,0.36)'

/* ────────────────────────────────────────────────────────────────
   Patterns — inline SVG data URLs so the registry stays self-
   contained. Each is dialed back to readable contrast levels.
   ──────────────────────────────────────────────────────────────── */

/* All three pattern palettes use the same lavender-gray base
   (#DFDBE5) with a #9C92AC motif at 0.4 opacity, sourced from
   heropatterns.com. SVGs are kept verbatim (already URL-encoded by
   the source) — DON'T wrap with encodeURIComponent or it'll
   double-encode and break the parse. */

/* Topography — full canonical heropatterns SVG, byte-for-byte from
   the user's source file. The encoded data URL lives in
   `topography-bg-data.ts` so this file stays readable instead of
   carrying ~91KB of escaped path data inline. Tiles seamlessly at
   the SVG's native 600×600 (the path's edge contours are designed
   to wrap continuously across tile boundaries — the whole point of
   heropatterns), so we use plain repeat without seam-mitigation
   layering. Background base is #3b3644 per the user's palette spec. */
const TOPOGRAPHY_BG = `#2d2c2f url("${TOPOGRAPHY_DATA_URL}") repeat`


/* Polka — formal-invitation scrollwork pattern. 100x18 tile, dark
   green motif on a blush base. Opacity dialed down to 0.25 (was
   0.4) so the pattern reads as a subtle texture rather than a hard
   stripe — the user's call after seeing it land. No overlay. */
const DOTS_BG =
  `#f6eded url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='18' viewBox='0 0 100 18'%3E%3Cpath fill='%2306661d' fill-opacity='0.25' d='M61.82 18c3.47-1.45 6.86-3.78 11.3-7.34C78 6.76 80.34 5.1 83.87 3.42 88.56 1.16 93.75 0 100 0v6.16C98.76 6.05 97.43 6 96 6c-9.59 0-14.23 2.23-23.13 9.34-1.28 1.03-2.39 1.9-3.4 2.66h-7.65zm-23.64 0H22.52c-1-.76-2.1-1.63-3.4-2.66C11.57 9.3 7.08 6.78 0 6.16V0c6.25 0 11.44 1.16 16.14 3.42 3.53 1.7 5.87 3.35 10.73 7.24 4.45 3.56 7.84 5.9 11.31 7.34zM61.82 0h7.66a39.57 39.57 0 0 1-7.34 4.58C57.44 6.84 52.25 8 46 8S34.56 6.84 29.86 4.58A39.57 39.57 0 0 1 22.52 0h15.66C41.65 1.44 45.21 2 50 2c4.8 0 8.35-.56 11.82-2z'%3E%3C/path%3E%3C/svg%3E")`

/* Clouds — brick wall pattern (replaces cloud silhouettes). 42x44
   tile, cream brick outlines on a terracotta base. */
const CLOUDS_BG =
  `#692d13 url("data:image/svg+xml,%3Csvg width='42' height='44' viewBox='0 0 42 44' xmlns='http://www.w3.org/2000/svg'%3E%3Cg id='Page-1' fill='none' fill-rule='evenodd'%3E%3Cg id='brick-wall' fill='%23f2e9e6' fill-opacity='0.33'%3E%3Cpath d='M0 0h42v44H0V0zm1 1h40v20H1V1zM0 23h20v20H0V23zm22 0h20v20H22V23z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

/* Clouds on sky - illustrated layered cumulus from deep blue at the
   top to white at the bottom. No comments / non-ASCII chars / id
   references inside the data URL so the SVG is rock-solid encoded
   inline gradient via stop colors instead of <linearGradient> defs. */
const CLOUDS_PATTERN =
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C5C95"/><stop offset="1" stop-color="#7AB5E8"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><path fill="#3D7BC9" d="M0 200 C 30 168 70 220 110 196 C 145 174 180 218 215 196 C 250 174 285 218 320 196 C 355 174 388 218 400 200 L 400 0 L 0 0 Z"/><path fill="#7AB5E8" d="M0 340 C 35 308 80 360 120 336 C 160 314 200 360 240 336 C 280 314 320 360 360 336 C 384 322 400 358 400 344 L 400 200 C 380 220 350 184 320 200 C 290 220 260 184 230 200 C 200 220 170 184 140 200 C 110 220 80 184 50 200 C 30 212 0 184 0 200 Z"/><path fill="#B7DAF0" d="M0 460 C 40 432 80 476 120 458 C 160 440 200 476 240 458 C 280 442 320 476 360 458 C 380 448 400 476 400 462 L 400 340 C 372 360 340 324 308 340 C 274 360 244 324 212 340 C 180 360 152 324 118 340 C 86 360 56 324 24 340 C 12 348 0 324 0 340 Z"/><path fill="#FFFFFF" d="M0 600 L 400 600 L 400 460 C 372 480 340 446 308 460 C 274 478 244 446 212 460 C 180 478 152 446 118 460 C 86 478 56 446 24 460 C 12 468 0 446 0 460 Z"/></svg>`
  )}") center/cover no-repeat`

/* Forest - palm fronds in 4 corners of a soft cream card. All paths
   inlined (no symbol/use refs which were breaking in data-URL
   contexts). Each frond is a curved spine + 8 stroked leaflet
   paths fanning to one side, mirrored for the other side. */
const GRASS_PATTERN =
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice"><rect width="400" height="600" fill="#F0EFE0"/><g fill="none" stroke="#2D6B3D" stroke-width="3" stroke-linecap="round" stroke-opacity="0.85"><g transform="translate(30 50) rotate(40)"><path d="M0 0 C 20 50 30 110 20 170"/><path d="M2 14 q 28 -12 60 -38"/><path d="M5 30 q 32 -6 70 -22"/><path d="M9 48 q 34 4 76 -6"/><path d="M14 68 q 36 14 76 14"/><path d="M18 88 q 32 22 68 32"/><path d="M21 108 q 28 30 56 50"/><path d="M22 128 q 22 36 40 64"/></g><g transform="translate(370 50) rotate(140)"><path d="M0 0 C 20 50 30 110 20 170"/><path d="M2 14 q 28 -12 60 -38"/><path d="M5 30 q 32 -6 70 -22"/><path d="M9 48 q 34 4 76 -6"/><path d="M14 68 q 36 14 76 14"/><path d="M18 88 q 32 22 68 32"/><path d="M21 108 q 28 30 56 50"/><path d="M22 128 q 22 36 40 64"/></g><g transform="translate(30 550) rotate(-40)"><path d="M0 0 C 20 50 30 110 20 170"/><path d="M2 14 q 28 -12 60 -38"/><path d="M5 30 q 32 -6 70 -22"/><path d="M9 48 q 34 4 76 -6"/><path d="M14 68 q 36 14 76 14"/><path d="M18 88 q 32 22 68 32"/><path d="M21 108 q 28 30 56 50"/><path d="M22 128 q 22 36 40 64"/></g><g transform="translate(370 550) rotate(-140)"><path d="M0 0 C 20 50 30 110 20 170"/><path d="M2 14 q 28 -12 60 -38"/><path d="M5 30 q 32 -6 70 -22"/><path d="M9 48 q 34 4 76 -6"/><path d="M14 68 q 36 14 76 14"/><path d="M18 88 q 32 22 68 32"/><path d="M21 108 q 28 30 56 50"/><path d="M22 128 q 22 36 40 64"/></g></g></svg>`
  )}") center/cover no-repeat`

/* ────────────────────────────────────────────────────────────────
   The 12 palettes
   ──────────────────────────────────────────────────────────────── */
export const PALETTES: Palette[] = [
  // ── 1–3: LIGHT ──────────────────────────────────────────────
  // Card is light. Surround is a darker shade of the same hue —
  // reads as the card "casting a shadow" onto its surround.
  {
    id: 'cream',
    name: 'Cream',
    vibe: 'Warm, indie',
    pageCanvas: '#E8E4DA',
    cardBg: '#FAFAF8',
    surroundBg: '#E8E4DA',
    textPrimary: '#0A0E17',
    textSecondary: '#3A3F4A',
    textMuted: '#6B6F7A',
    accent: '#D94A1F',
    accentInk: '#FFFFFF',
    border: 'rgba(10,14,23,0.12)',
    savedBg: '#34C759',
    savedInk: '#FFFFFF',
  },
  {
    id: 'coastal',
    name: 'Coastal',
    vibe: 'Cool, breezy',
    pageCanvas: '#D8E2EA',
    cardBg: '#F2F6FA',
    surroundBg: '#D8E2EA',
    textPrimary: '#102A43',
    textSecondary: '#395066',
    textMuted: '#7A8794',
    accent: '#2E73B8',
    accentInk: '#FFFFFF',
    border: 'rgba(16,42,67,0.12)',
    savedBg: '#2E73B8',
    savedInk: '#FFFFFF',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    vibe: 'Soft, romantic',
    pageCanvas: '#E8CED2',
    cardBg: '#FCF1F2',
    surroundBg: '#E8CED2',
    textPrimary: '#3A1822',
    textSecondary: '#6B3A48',
    textMuted: '#9A6E7A',
    accent: '#B53D5B',
    accentInk: '#FFFFFF',
    border: 'rgba(58,24,34,0.12)',
    savedBg: '#B53D5B',
    savedInk: '#FFFFFF',
  },

  // ── 4–6: DARK ───────────────────────────────────────────────
  // Card is deep. Surround is even deeper. Accent + accentInk
  // sit comfortably with the darkness (no harsh whites).
  {
    id: 'midnight',
    name: 'Midnight',
    vibe: 'Tech-forward dark',
    pageCanvas: '#08090E',
    cardBg: '#15161D',
    surroundBg: '#08090E',
    textPrimary: '#F5F5F7',
    textSecondary: '#B5B7C0',
    textMuted: '#7A7C85',
    accent: '#5BA8FF',
    accentInk: '#0A0A0F',
    border: 'rgba(255,255,255,0.10)',
    savedBg: '#5BA8FF',
    savedInk: '#0A0A0F',
    shadowColor: LIGHT_HALO,
  },
  {
    id: 'espresso',
    name: 'Espresso',
    vibe: 'Refined, classic',
    pageCanvas: '#120A07',
    cardBg: '#221814',
    surroundBg: '#120A07',
    textPrimary: '#F0E8E0',
    textSecondary: '#C2B5A8',
    textMuted: '#8A7E70',
    accent: '#E89947',
    accentInk: '#1F1410',
    border: 'rgba(255,236,210,0.10)',
    savedBg: '#E89947',
    savedInk: '#1F1410',
    shadowColor: LIGHT_HALO,
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    vibe: 'Bold, electric',
    pageCanvas: '#0D0A12',
    cardBg: '#1A1622',
    surroundBg: '#0D0A12',
    textPrimary: '#F2EFF8',
    textSecondary: '#B8B0CC',
    textMuted: '#7E768F',
    accent: '#E04AC9',
    accentInk: '#1A1622',
    border: 'rgba(255,255,255,0.10)',
    savedBg: '#E04AC9',
    savedInk: '#1A1622',
    shadowColor: LIGHT_HALO,
  },

  // ── 7–9: GRADIENT (2 light + 1 dark) ───────────────────────
  // Card has a gradient. Surround uses the SAME gradient direction
  // with each stop pushed darker — a "shadow gradient".
  {
    id: 'sunrise',
    name: 'Sunrise',
    vibe: 'Peach to pink (light)',
    pageCanvas: 'linear-gradient(135deg, #E2C4B0 0%, #DEA8B8 100%)',
    cardBg: 'linear-gradient(135deg, #FFE5D5 0%, #FFCAD8 100%)',
    surroundBg: 'linear-gradient(135deg, #E2C4B0 0%, #DEA8B8 100%)',
    textPrimary: '#3A1822',
    textSecondary: '#6B3A48',
    textMuted: '#9A6E7A',
    accent: '#D94A1F',
    accentInk: '#FFFFFF',
    border: 'rgba(58,24,34,0.14)',
    savedBg: '#D94A1F',
    savedInk: '#FFFFFF',
    patterned: true,
  },
  {
    id: 'vapor',
    name: 'Vapor',
    vibe: 'Pink → cyan dream (light)',
    pageCanvas: 'linear-gradient(160deg, #D896B5 0%, #9F8DD5 50%, #65B8D8 100%)',
    cardBg: 'linear-gradient(160deg, #FFB8D9 0%, #C8B4FF 50%, #8FE3FF 100%)',
    surroundBg: 'linear-gradient(160deg, #D896B5 0%, #9F8DD5 50%, #65B8D8 100%)',
    textPrimary: '#1F1442',
    textSecondary: '#3D2F65',
    textMuted: '#6B5C8F',
    accent: '#E04AC9',
    accentInk: '#FFFFFF',
    border: 'rgba(31,20,66,0.14)',
    savedBg: '#E04AC9',
    savedInk: '#FFFFFF',
    patterned: true,
  },
  {
    id: 'acid',
    name: 'Acid',
    vibe: 'Deep purple → magenta (dark)',
    pageCanvas: 'linear-gradient(135deg, #1A0640 0%, #4A0E82 50%, #882B9C 100%)',
    cardBg: 'linear-gradient(135deg, #2D0B5E 0%, #6A1FB5 50%, #B544D4 100%)',
    surroundBg: 'linear-gradient(135deg, #1A0640 0%, #4A0E82 50%, #882B9C 100%)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E8DCF5',
    textMuted: '#B8A8D8',
    accent: '#FFD23F',
    accentInk: '#2D0B5E',
    border: 'rgba(255,255,255,0.16)',
    savedBg: '#FFD23F',
    savedInk: '#2D0B5E',
    patterned: true,
    shadowColor: LIGHT_HALO,
  },

  // ── 10–12: PATTERN ─────────────────────────────────────────
  // Card carries a real motif. Surround = solid deep tone that
  // reads as the pattern's "shadow base".
  // Lavender-gray pattern family (#DFDBE5 base, #9C92AC motif).
  // All three share the same color story; the motif is what
  // differentiates them. Surround is the same shadowy lavender
  // across all three so the card pattern reads as the focal layer.
  {
    id: 'topography',
    name: 'Topography',
    vibe: 'Lavender contours on graphite',
    // Surround = shadowy version of the card's solid base color
    // (#2d2c2f), matching the rule used by every other palette.
    pageCanvas: '#1A1A1C',
    cardBg: TOPOGRAPHY_BG,
    surroundBg: '#1A1A1C',
    // Light text family that picks up the contour-line color so the
    // typography reads as a coherent extension of the pattern.
    textPrimary: '#EDE3F8',
    textSecondary: '#C7BBDB',
    textMuted: '#8C8395',
    accent: '#E6DBF8',
    accentInk: '#2d2c2f',
    border: 'rgba(230,219,248,0.18)',
    savedBg: '#E6DBF8',
    savedInk: '#2d2c2f',
    patterned: true,
    shadowColor: LIGHT_HALO,
  },
  {
    // id `polka` retained for save-state continuity; visual is the
    // formal-invitation scrollwork (blush + dark green) at lowered
    // opacity per the user's spec.
    id: 'polka',
    name: 'Formal',
    vibe: 'Botanical scrollwork on blush',
    pageCanvas: '#E8D9D9',
    cardBg: DOTS_BG,
    surroundBg: '#E8D9D9',
    textPrimary: '#1F2D22',
    textSecondary: '#46524A',
    textMuted: '#7A857F',
    accent: '#06661d',
    accentInk: '#FFFFFF',
    border: 'rgba(31,45,34,0.18)',
    savedBg: '#06661d',
    savedInk: '#FFFFFF',
    patterned: true,
  },
  {
    // id `clouds` retained for save-state continuity; visual is now
    // a brick wall — terracotta base with cream mortar lines.
    id: 'clouds',
    name: 'Brick',
    vibe: 'Cream mortar on terracotta',
    pageCanvas: '#4A1F0D',
    cardBg: CLOUDS_BG,
    surroundBg: '#4A1F0D',
    textPrimary: '#F4E8DD',
    textSecondary: '#D6BFA8',
    textMuted: '#A38972',
    accent: '#F2E9E6',
    accentInk: '#692d13',
    border: 'rgba(244,232,221,0.18)',
    savedBg: '#F2E9E6',
    savedInk: '#692d13',
    patterned: true,
    shadowColor: LIGHT_HALO,
  },
]

export const PALETTE_BY_ID: Record<string, Palette> = Object.fromEntries(
  PALETTES.map((p) => [p.id, p])
)

export const DEFAULT_PALETTE_ID = 'cream'

export function getPalette(id: string | undefined | null): Palette {
  return PALETTE_BY_ID[id || DEFAULT_PALETTE_ID] || PALETTE_BY_ID[DEFAULT_PALETTE_ID]
}

/** Returns the resolved shadow color for a palette — falls back to a
 *  pronounced dark halo for any palette that hasn't explicitly opted
 *  into a different shadow tint. */
export function paletteShadowColor(p: Palette): string {
  return p.shadowColor || DEFAULT_DARK_SHADOW
}
