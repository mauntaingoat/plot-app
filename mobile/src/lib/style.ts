/**
 * Reelst style system — mobile port of `src/lib/style/` (web).
 *
 * Mirrors PALETTES, FONTS, SHAPES, DEFAULT_STYLE and the helpers the
 * Style tab needs. The agent's PUBLIC profile is still rendered by
 * the web app (loaded into a WebView for preview); this file only
 * powers the picker UI + the Firestore write shape, so we keep
 * data only — no rendering helpers, no Google Fonts loader.
 *
 * Numerical helpers (`darkenHex`, `readableInkOnHex`) are ported
 * verbatim from web so any preview that derives a canvas shade or
 * picks an ink-on-accent matches what the public profile will use.
 *
 * Pattern palettes (topography, polka, clouds) carry a CSS data-URL
 * background on web. iOS can't render those; the picker shows the
 * palette's solid base color from `patternBase` so the swatch still
 * communicates the vibe.
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type FrameStyle = 'none' | 'border' | 'shadow' | 'border_shadow'
export type ListingsLayout = 'scroller' | 'grid'
export type TickerAutoKey = 'for_sale' | 'sold' | 'open_houses' | 'spotlights'

export interface TickerCustomItem {
  id: string
  label: string
}

export interface CustomLink {
  id: string
  title: string
  url: string
  thumbnailUrl?: string | null
}
export type CustomLinksPosition = 'above' | 'below'
export const MAX_LINK_TITLE_LEN = 60

export interface AgentStyle {
  paletteId: string
  fontId: string
  shapeId: string
  frames: { avatar: FrameStyle; map: FrameStyle; listings: FrameStyle; links: FrameStyle }
  sections: { bio: boolean; ticker: boolean; social: boolean; map: boolean; content: boolean; links: boolean }
  tickerAuto: Record<TickerAutoKey, boolean>
  tickerCustom: TickerCustomItem[]
  tickerOrder: string[]
  ctaLabels: { wave: string; save: string }
  listingsLayout: ListingsLayout
  customAccentColor?: string | null
  customFontColor?: string | null
  customBackgroundColor?: string | null
  customBackgroundImage?: string | null
  customLinks: CustomLink[]
  customLinksPosition: CustomLinksPosition
}

export interface Palette {
  id: string
  name: string
  vibe: string
  /** Solid hex for swatch preview. On web this may be a gradient or
   *  CSS data-URL; we extract a solid base for the iOS picker. */
  cardBg: string
  /** Optional gradient stops — when present, the picker renders a
   *  LinearGradient swatch instead of a flat color. */
  cardGradient?: { from: string; to: string; mid?: string; angleDeg?: number }
  pageCanvas: string
  surroundBg: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  accent: string
  accentInk: string
  border: string
  savedBg?: string
  savedInk?: string
  patterned?: boolean
}

export interface FontPairing {
  id: string
  name: string
  vibe: string
  /** RN font family used for the "Aa" preview. Falls back to system
   *  fonts when the named family isn't loaded — the public profile
   *  always uses the web-side CSS family for actual rendering. */
  previewFamily?: string
}

export interface MapShape {
  id: string
  name: string
  vibe: string
  /** Raw SVG `d` for the shape inside a unit-square bbox at
   *  (cx=0.5, cy=0.5, size=1). Caller scales by viewBox/size. */
  d: string
}

// ─────────────────────────────────────────────────────────────────
// PALETTES — 12 themes (Free: 0–5, Pro: 6–11)
// ─────────────────────────────────────────────────────────────────

export const PALETTES: Palette[] = [
  {
    id: 'cream', name: 'Cream', vibe: 'Warm, indie',
    pageCanvas: '#E8E4DA', cardBg: '#FAFAF8', surroundBg: '#E8E4DA',
    textPrimary: '#0A0E17', textSecondary: '#3A3F4A', textMuted: '#6B6F7A',
    accent: '#D94A1F', accentInk: '#FFFFFF', border: 'rgba(10,14,23,0.12)',
    savedBg: '#34C759', savedInk: '#FFFFFF',
  },
  {
    id: 'coastal', name: 'Coastal', vibe: 'Cool, breezy',
    pageCanvas: '#D8E2EA', cardBg: '#F2F6FA', surroundBg: '#D8E2EA',
    textPrimary: '#102A43', textSecondary: '#395066', textMuted: '#7A8794',
    accent: '#2E73B8', accentInk: '#FFFFFF', border: 'rgba(16,42,67,0.12)',
    savedBg: '#2E73B8', savedInk: '#FFFFFF',
  },
  {
    id: 'bloom', name: 'Bloom', vibe: 'Soft, romantic',
    pageCanvas: '#E8CED2', cardBg: '#FCF1F2', surroundBg: '#E8CED2',
    textPrimary: '#3A1822', textSecondary: '#6B3A48', textMuted: '#9A6E7A',
    accent: '#B53D5B', accentInk: '#FFFFFF', border: 'rgba(58,24,34,0.12)',
    savedBg: '#B53D5B', savedInk: '#FFFFFF',
  },
  {
    id: 'midnight', name: 'Midnight', vibe: 'Tech-forward dark',
    pageCanvas: '#08090E', cardBg: '#15161D', surroundBg: '#08090E',
    textPrimary: '#F5F5F7', textSecondary: '#B5B7C0', textMuted: '#7A7C85',
    accent: '#5BA8FF', accentInk: '#0A0A0F', border: 'rgba(255,255,255,0.10)',
    savedBg: '#5BA8FF', savedInk: '#0A0A0F',
  },
  {
    id: 'espresso', name: 'Espresso', vibe: 'Refined, classic',
    pageCanvas: '#120A07', cardBg: '#221814', surroundBg: '#120A07',
    textPrimary: '#F0E8E0', textSecondary: '#C2B5A8', textMuted: '#8A7E70',
    accent: '#E89947', accentInk: '#1F1410', border: 'rgba(255,236,210,0.10)',
    savedBg: '#E89947', savedInk: '#1F1410',
  },
  {
    id: 'obsidian', name: 'Obsidian', vibe: 'Bold, electric',
    pageCanvas: '#0D0A12', cardBg: '#1A1622', surroundBg: '#0D0A12',
    textPrimary: '#F2EFF8', textSecondary: '#B8B0CC', textMuted: '#7E768F',
    accent: '#E04AC9', accentInk: '#1A1622', border: 'rgba(255,255,255,0.10)',
    savedBg: '#E04AC9', savedInk: '#1A1622',
  },
  // ── Pro tier ──
  {
    id: 'sunrise', name: 'Sunrise', vibe: 'Peach to pink (light)',
    cardBg: '#FFE5D5',
    cardGradient: { from: '#FFE5D5', to: '#FFCAD8', angleDeg: 135 },
    pageCanvas: '#E2C4B0', surroundBg: '#E2C4B0',
    textPrimary: '#3A1822', textSecondary: '#6B3A48', textMuted: '#9A6E7A',
    accent: '#D94A1F', accentInk: '#FFFFFF', border: 'rgba(58,24,34,0.14)',
    savedBg: '#D94A1F', savedInk: '#FFFFFF', patterned: true,
  },
  {
    id: 'vapor', name: 'Vapor', vibe: 'Pink → cyan dream (light)',
    cardBg: '#FFB8D9',
    cardGradient: { from: '#FFB8D9', mid: '#C8B4FF', to: '#8FE3FF', angleDeg: 160 },
    pageCanvas: '#9F8DD5', surroundBg: '#9F8DD5',
    textPrimary: '#1F1442', textSecondary: '#3D2F65', textMuted: '#6B5C8F',
    accent: '#E04AC9', accentInk: '#FFFFFF', border: 'rgba(31,20,66,0.14)',
    savedBg: '#E04AC9', savedInk: '#FFFFFF', patterned: true,
  },
  {
    id: 'acid', name: 'Acid', vibe: 'Deep purple → magenta (dark)',
    cardBg: '#2D0B5E',
    cardGradient: { from: '#2D0B5E', mid: '#6A1FB5', to: '#B544D4', angleDeg: 135 },
    pageCanvas: '#1A0640', surroundBg: '#1A0640',
    textPrimary: '#FFFFFF', textSecondary: '#E8DCF5', textMuted: '#B8A8D8',
    accent: '#FFD23F', accentInk: '#2D0B5E', border: 'rgba(255,255,255,0.16)',
    savedBg: '#FFD23F', savedInk: '#2D0B5E', patterned: true,
  },
  {
    id: 'topography', name: 'Topography', vibe: 'Lavender contours on graphite',
    pageCanvas: '#1A1A1C', cardBg: '#2d2c2f', surroundBg: '#1A1A1C',
    textPrimary: '#EDE3F8', textSecondary: '#C7BBDB', textMuted: '#8C8395',
    accent: '#E6DBF8', accentInk: '#2d2c2f', border: 'rgba(230,219,248,0.18)',
    savedBg: '#E6DBF8', savedInk: '#2d2c2f', patterned: true,
  },
  {
    id: 'polka', name: 'Formal', vibe: 'Botanical scrollwork on blush',
    pageCanvas: '#E8D9D9', cardBg: '#f6eded', surroundBg: '#E8D9D9',
    textPrimary: '#1F2D22', textSecondary: '#46524A', textMuted: '#7A857F',
    accent: '#06661d', accentInk: '#FFFFFF', border: 'rgba(31,45,34,0.18)',
    savedBg: '#06661d', savedInk: '#FFFFFF', patterned: true,
  },
  {
    id: 'clouds', name: 'Brick', vibe: 'Cream mortar on terracotta',
    pageCanvas: '#4A1F0D', cardBg: '#692d13', surroundBg: '#4A1F0D',
    textPrimary: '#F4E8DD', textSecondary: '#D6BFA8', textMuted: '#A38972',
    accent: '#F2E9E6', accentInk: '#692d13', border: 'rgba(244,232,221,0.18)',
    savedBg: '#F2E9E6', savedInk: '#692d13', patterned: true,
  },
]

export const DEFAULT_PALETTE_ID = 'cream'
export const PALETTE_BY_ID = Object.fromEntries(PALETTES.map((p) => [p.id, p])) as Record<string, Palette>
export function getPalette(id: string | null | undefined): Palette {
  return PALETTE_BY_ID[id || DEFAULT_PALETTE_ID] || PALETTE_BY_ID[DEFAULT_PALETTE_ID]
}

// ─────────────────────────────────────────────────────────────────
// FONTS — 14 pairings (Free: 0–5, Pro: 6–13)
// previewFamily uses what's already loaded in the iOS app (Outfit +
// Fraunces). For other fonts the picker falls back to system.
// ─────────────────────────────────────────────────────────────────

export const FONTS: FontPairing[] = [
  { id: 'humanist',    name: 'Humanist',    vibe: 'Clean, modern (default)', previewFamily: 'Outfit_700Bold' },
  { id: 'editorial',   name: 'Editorial',   vibe: 'Magazine, refined serif', previewFamily: 'Fraunces_700Bold' },
  { id: 'classic',     name: 'Classic',     vibe: 'Traditional luxury realtor', previewFamily: 'Fraunces_700Bold' },
  { id: 'geometric',   name: 'Geometric',   vibe: 'Modern, sharp tech',        previewFamily: 'Outfit_700Bold' },
  { id: 'soft',        name: 'Soft',        vibe: 'Friendly, rounded',         previewFamily: 'Outfit_500Medium' },
  { id: 'mono',        name: 'Mono',        vibe: 'Distinctive, indie',        previewFamily: 'Menlo' },
  { id: 'boutique',    name: 'Boutique',    vibe: 'Elegant luxury',            previewFamily: 'Fraunces_700Bold' },
  { id: 'bold',        name: 'Bold',        vibe: 'Big statement, confident',  previewFamily: 'Outfit_700Bold' },
  { id: 'handwritten', name: 'Handwritten', vibe: 'Personal, warm',            previewFamily: 'Snell Roundhand' },
  { id: 'slab',        name: 'Slab',        vibe: 'Grounded, structured',      previewFamily: 'Outfit_700Bold' },
  { id: 'bricolage',   name: 'Bricolage',   vibe: 'Gritty, modern, character', previewFamily: 'Outfit_700Bold' },
  { id: 'funnel',      name: 'Funnel',      vibe: 'Punchy, hand-cut',          previewFamily: 'Outfit_700Bold' },
  { id: 'caprasimo',   name: 'Caprasimo',   vibe: 'Retro warmth, rounded',     previewFamily: 'Georgia' },
  { id: 'journal',     name: 'Journal',     vibe: 'Modern editorial, op-ed',   previewFamily: 'Fraunces_700Bold' },
]

export const DEFAULT_FONT_ID = 'humanist'
export const FONT_BY_ID = Object.fromEntries(FONTS.map((f) => [f.id, f])) as Record<string, FontPairing>
export function getFont(id: string | null | undefined): FontPairing {
  return FONT_BY_ID[id || DEFAULT_FONT_ID] || FONT_BY_ID[DEFAULT_FONT_ID]
}

// ─────────────────────────────────────────────────────────────────
// SHAPES — 9 geometric (Free: 0–2, Pro: 3–8)
// Paths use the same generators as web `src/lib/style/shapes.ts`,
// emitted at (cx=0.5, cy=0.5, size=1) so the resulting `d` lives in
// a 0–1 unit bbox. Render with <Svg viewBox="0 0 1 1"><Path d=...>.
// ─────────────────────────────────────────────────────────────────

type ShapeBuilder = (cx: number, cy: number, size: number) => string

function fmt(n: number) { return n.toFixed(4) }

function frame(cx: number, cy: number, size: number) {
  const x0 = cx - size / 2
  const y0 = cy - size / 2
  return { X: (n: number) => fmt(x0 + n * size), Y: (n: number) => fmt(y0 + n * size) }
}

function roundedPolygon(verts: Array<[number, number]>, cornerR: number): string {
  const n = verts.length
  const cmds: string[] = []
  for (let i = 0; i < n; i++) {
    const v = verts[i]
    const prev = verts[(i - 1 + n) % n]
    const next = verts[(i + 1) % n]
    const upDx = v[0] - prev[0], upDy = v[1] - prev[1]
    const upLen = Math.hypot(upDx, upDy) || 1
    const upR = Math.min(cornerR, upLen / 2)
    const dnDx = next[0] - v[0], dnDy = next[1] - v[1]
    const dnLen = Math.hypot(dnDx, dnDy) || 1
    const dnR = Math.min(cornerR, dnLen / 2)
    const ax = v[0] - (upDx / upLen) * upR
    const ay = v[1] - (upDy / upLen) * upR
    const dx = v[0] + (dnDx / dnLen) * dnR
    const dy = v[1] + (dnDy / dnLen) * dnR
    cmds.push(i === 0 ? `M ${fmt(ax)} ${fmt(ay)}` : `L ${fmt(ax)} ${fmt(ay)}`)
    cmds.push(`C ${fmt(v[0])} ${fmt(v[1])}, ${fmt(v[0])} ${fmt(v[1])}, ${fmt(dx)} ${fmt(dy)}`)
  }
  cmds.push('Z')
  return cmds.join(' ')
}

const rectangleBuilder: ShapeBuilder = (cx, cy, size) => {
  const { X, Y } = frame(cx, cy, size)
  const top = 0.13, bot = 0.87, r = 0.082
  return [
    `M ${X(r)} ${Y(top)}`,
    `L ${X(1 - r)} ${Y(top)}`,
    `Q ${X(1)} ${Y(top)}, ${X(1)} ${Y(top + r)}`,
    `L ${X(1)} ${Y(bot - r)}`,
    `Q ${X(1)} ${Y(bot)}, ${X(1 - r)} ${Y(bot)}`,
    `L ${X(r)} ${Y(bot)}`,
    `Q ${X(0)} ${Y(bot)}, ${X(0)} ${Y(bot - r)}`,
    `L ${X(0)} ${Y(top + r)}`,
    `Q ${X(0)} ${Y(top)}, ${X(r)} ${Y(top)} Z`,
  ].join(' ')
}

const squircleBuilder: ShapeBuilder = (cx, cy, size) => {
  const { X, Y } = frame(cx, cy, size)
  const k = 0.42
  return [
    `M ${X(0.5)} ${Y(0)}`,
    `C ${X(0.5 + k)} ${Y(0)}, ${X(1)} ${Y(0.5 - k)}, ${X(1)} ${Y(0.5)}`,
    `C ${X(1)} ${Y(0.5 + k)}, ${X(0.5 + k)} ${Y(1)}, ${X(0.5)} ${Y(1)}`,
    `C ${X(0.5 - k)} ${Y(1)}, ${X(0)} ${Y(0.5 + k)}, ${X(0)} ${Y(0.5)}`,
    `C ${X(0)} ${Y(0.5 - k)}, ${X(0.5 - k)} ${Y(0)}, ${X(0.5)} ${Y(0)} Z`,
  ].join(' ')
}

const circleBuilder: ShapeBuilder = (cx, cy, size) => {
  const r = size / 2
  const c = r * 0.5523
  return [
    `M ${fmt(cx)} ${fmt(cy - r)}`,
    `C ${fmt(cx + c)} ${fmt(cy - r)}, ${fmt(cx + r)} ${fmt(cy - c)}, ${fmt(cx + r)} ${fmt(cy)}`,
    `C ${fmt(cx + r)} ${fmt(cy + c)}, ${fmt(cx + c)} ${fmt(cy + r)}, ${fmt(cx)} ${fmt(cy + r)}`,
    `C ${fmt(cx - c)} ${fmt(cy + r)}, ${fmt(cx - r)} ${fmt(cy + c)}, ${fmt(cx - r)} ${fmt(cy)}`,
    `C ${fmt(cx - r)} ${fmt(cy - c)}, ${fmt(cx - c)} ${fmt(cy - r)}, ${fmt(cx)} ${fmt(cy - r)} Z`,
  ].join(' ')
}

const hexBuilder: ShapeBuilder = (cx, cy, size) => {
  const r = size / 2
  const w = r * (Math.sqrt(3) / 2)
  const verts: Array<[number, number]> = [
    [cx, cy - r], [cx + w, cy - r / 2], [cx + w, cy + r / 2],
    [cx, cy + r], [cx - w, cy + r / 2], [cx - w, cy - r / 2],
  ]
  return roundedPolygon(verts, size * 0.08)
}

const heartBuilder: ShapeBuilder = (cx, cy, size) => {
  const { X, Y } = frame(cx, cy, size)
  return [
    `M ${X(0.5)} ${Y(0.86)}`,
    `C ${X(0.5)} ${Y(0.86)}, ${X(0.07)} ${Y(0.6)}, ${X(0.07)} ${Y(0.3)}`,
    `C ${X(0.07)} ${Y(0.15)}, ${X(0.18)} ${Y(0.05)}, ${X(0.3)} ${Y(0.05)}`,
    `C ${X(0.4)} ${Y(0.05)}, ${X(0.47)} ${Y(0.11)}, ${X(0.5)} ${Y(0.18)}`,
    `C ${X(0.53)} ${Y(0.11)}, ${X(0.6)} ${Y(0.05)}, ${X(0.7)} ${Y(0.05)}`,
    `C ${X(0.82)} ${Y(0.05)}, ${X(0.93)} ${Y(0.15)}, ${X(0.93)} ${Y(0.3)}`,
    `C ${X(0.93)} ${Y(0.6)}, ${X(0.5)} ${Y(0.86)}, ${X(0.5)} ${Y(0.86)} Z`,
  ].join(' ')
}

const houseBuilder: ShapeBuilder = (cx, cy, size) => {
  const { X, Y } = frame(cx, cy, size)
  return [
    `M ${X(0.42)} ${Y(0.10)}`,
    `Q ${X(0.50)} ${Y(0.00)}, ${X(0.58)} ${Y(0.10)}`,
    `L ${X(0.93)} ${Y(0.39)}`,
    `Q ${X(0.97)} ${Y(0.42)}, ${X(0.97)} ${Y(0.46)}`,
    `L ${X(0.97)} ${Y(0.91)}`,
    `Q ${X(0.97)} ${Y(0.95)}, ${X(0.93)} ${Y(0.95)}`,
    `L ${X(0.60)} ${Y(0.95)}`,
    `L ${X(0.60)} ${Y(0.71)}`,
    `Q ${X(0.60)} ${Y(0.68)}, ${X(0.57)} ${Y(0.68)}`,
    `L ${X(0.43)} ${Y(0.68)}`,
    `Q ${X(0.40)} ${Y(0.68)}, ${X(0.40)} ${Y(0.71)}`,
    `L ${X(0.40)} ${Y(0.95)}`,
    `L ${X(0.07)} ${Y(0.95)}`,
    `Q ${X(0.03)} ${Y(0.95)}, ${X(0.03)} ${Y(0.91)}`,
    `L ${X(0.03)} ${Y(0.46)}`,
    `Q ${X(0.03)} ${Y(0.42)}, ${X(0.07)} ${Y(0.39)} Z`,
  ].join(' ')
}

const quatrefoilBuilder: ShapeBuilder = (cx, cy, size) => {
  const { X, Y } = frame(cx, cy, size)
  return [
    `M ${X(0.5)} ${Y(0)}`,
    `C ${X(0.5769)} ${Y(0)}, ${X(0.6408)} ${Y(0.0555)}, ${X(0.6538)} ${Y(0.1286)}`,
    `C ${X(0.7148)} ${Y(0.0861)}, ${X(0.7992)} ${Y(0.0921)}, ${X(0.8536)} ${Y(0.1465)}`,
    `C ${X(0.9079)} ${Y(0.2008)}, ${X(0.9138)} ${Y(0.2853)}, ${X(0.8713)} ${Y(0.3462)}`,
    `C ${X(0.9445)} ${Y(0.3592)}, ${X(1)} ${Y(0.4231)}, ${X(1)} ${Y(0.5)}`,
    `C ${X(1)} ${Y(0.5769)}, ${X(0.9445)} ${Y(0.6408)}, ${X(0.8713)} ${Y(0.6538)}`,
    `C ${X(0.9138)} ${Y(0.7148)}, ${X(0.9079)} ${Y(0.7992)}, ${X(0.8536)} ${Y(0.8536)}`,
    `C ${X(0.7992)} ${Y(0.9079)}, ${X(0.7148)} ${Y(0.9138)}, ${X(0.6538)} ${Y(0.8713)}`,
    `C ${X(0.6408)} ${Y(0.9445)}, ${X(0.5769)} ${Y(1)}, ${X(0.5)} ${Y(1)}`,
    `C ${X(0.4231)} ${Y(1)}, ${X(0.3592)} ${Y(0.9445)}, ${X(0.3462)} ${Y(0.8713)}`,
    `C ${X(0.2852)} ${Y(0.9138)}, ${X(0.2008)} ${Y(0.9079)}, ${X(0.1465)} ${Y(0.8536)}`,
    `C ${X(0.0921)} ${Y(0.7992)}, ${X(0.0862)} ${Y(0.7148)}, ${X(0.1287)} ${Y(0.6538)}`,
    `C ${X(0.0555)} ${Y(0.6408)}, ${X(0)} ${Y(0.5769)}, ${X(0)} ${Y(0.5)}`,
    `C ${X(0)} ${Y(0.4231)}, ${X(0.0555)} ${Y(0.3592)}, ${X(0.1287)} ${Y(0.3462)}`,
    `C ${X(0.0862)} ${Y(0.2853)}, ${X(0.0921)} ${Y(0.2008)}, ${X(0.1465)} ${Y(0.1465)}`,
    `C ${X(0.2008)} ${Y(0.0921)}, ${X(0.2852)} ${Y(0.0862)}, ${X(0.3462)} ${Y(0.1287)}`,
    `C ${X(0.3592)} ${Y(0.0555)}, ${X(0.4231)} ${Y(0)}, ${X(0.5)} ${Y(0)} Z`,
  ].join(' ')
}

const bloomBuilder: ShapeBuilder = (cx, cy, size) => {
  const { X, Y } = frame(cx, cy, size)
  return [
    `M ${X(0.3047)} ${Y(0)}`,
    `C ${X(0.4126)} ${Y(0)}, ${X(0.5)} ${Y(0.0874)}, ${X(0.5)} ${Y(0.1953)}`,
    `C ${X(0.5)} ${Y(0.0874)}, ${X(0.5874)} ${Y(0)}, ${X(0.6953)} ${Y(0)}`,
    `L ${X(1)} ${Y(0)}`,
    `L ${X(1)} ${Y(0.3047)}`,
    `C ${X(1)} ${Y(0.4126)}, ${X(0.9126)} ${Y(0.5)}, ${X(0.8047)} ${Y(0.5)}`,
    `C ${X(0.9126)} ${Y(0.5)}, ${X(1)} ${Y(0.5874)}, ${X(1)} ${Y(0.6953)}`,
    `L ${X(1)} ${Y(1)}`,
    `L ${X(0.6953)} ${Y(1)}`,
    `C ${X(0.5874)} ${Y(1)}, ${X(0.5)} ${Y(0.9126)}, ${X(0.5)} ${Y(0.8047)}`,
    `C ${X(0.5)} ${Y(0.9126)}, ${X(0.4126)} ${Y(1)}, ${X(0.3047)} ${Y(1)}`,
    `L ${X(0)} ${Y(1)}`,
    `L ${X(0)} ${Y(0.6953)}`,
    `C ${X(0)} ${Y(0.5874)}, ${X(0.0874)} ${Y(0.5)}, ${X(0.1953)} ${Y(0.5)}`,
    `C ${X(0.0874)} ${Y(0.5)}, ${X(0)} ${Y(0.4126)}, ${X(0)} ${Y(0.3047)}`,
    `L ${X(0)} ${Y(0)} Z`,
  ].join(' ')
}

const beadsBuilder: ShapeBuilder = (cx, cy, size) => {
  const { X, Y } = frame(cx, cy, size)
  return [
    `M ${X(1)} ${Y(0)}`,
    `C ${X(1)} ${Y(0.1381)}, ${X(0.8881)} ${Y(0.25)}, ${X(0.75)} ${Y(0.25)}`,
    `C ${X(0.8881)} ${Y(0.25)}, ${X(1)} ${Y(0.3619)}, ${X(1)} ${Y(0.5)}`,
    `C ${X(1)} ${Y(0.6381)}, ${X(0.8881)} ${Y(0.75)}, ${X(0.75)} ${Y(0.75)}`,
    `C ${X(0.8881)} ${Y(0.75)}, ${X(1)} ${Y(0.8619)}, ${X(1)} ${Y(1)}`,
    `L ${X(0)} ${Y(1)}`,
    `C ${X(0)} ${Y(0.8619)}, ${X(0.1119)} ${Y(0.75)}, ${X(0.25)} ${Y(0.75)}`,
    `C ${X(0.1119)} ${Y(0.75)}, ${X(0)} ${Y(0.6381)}, ${X(0)} ${Y(0.5)}`,
    `C ${X(0)} ${Y(0.3619)}, ${X(0.1119)} ${Y(0.25)}, ${X(0.25)} ${Y(0.25)}`,
    `C ${X(0.1119)} ${Y(0.25)}, ${X(0)} ${Y(0.1381)}, ${X(0)} ${Y(0)} Z`,
  ].join(' ')
}

export const SHAPES: MapShape[] = [
  { id: 'rectangle',  name: 'Rectangle',  vibe: 'Hard-edged, editorial',     d: rectangleBuilder(0.5, 0.5, 1) },
  { id: 'squircle',   name: 'Squircle',   vibe: 'Soft, premium',             d: squircleBuilder(0.5, 0.5, 1) },
  { id: 'circle',     name: 'Circle',     vibe: 'Clean',                     d: circleBuilder(0.5, 0.5, 1) },
  { id: 'hex',        name: 'Hex',        vibe: 'Architectural',             d: hexBuilder(0.5, 0.5, 1) },
  { id: 'heart',      name: 'Heart',      vibe: 'Signature',                 d: heartBuilder(0.5, 0.5, 1) },
  { id: 'house',      name: 'House',      vibe: 'Literal, playful',          d: houseBuilder(0.5, 0.5, 1) },
  { id: 'quatrefoil', name: 'Quatrefoil', vibe: 'Floral, decorative',        d: quatrefoilBuilder(0.5, 0.5, 1) },
  { id: 'bloom',      name: 'Bloom',      vibe: 'Cushion, four-cornered',    d: bloomBuilder(0.5, 0.5, 1) },
  { id: 'beads',      name: 'Beads',      vibe: 'Pinched, stacked column',   d: beadsBuilder(0.5, 0.5, 1) },
]

export const DEFAULT_SHAPE_ID = 'heart'
export const SHAPE_BY_ID = Object.fromEntries(SHAPES.map((s) => [s.id, s])) as Record<string, MapShape>
export function getShape(id: string | null | undefined): MapShape {
  return SHAPE_BY_ID[id || DEFAULT_SHAPE_ID] || SHAPE_BY_ID[DEFAULT_SHAPE_ID]
}
export function isStateShape(id: string): boolean { return id.startsWith('state_') }

// ─────────────────────────────────────────────────────────────────
// Defaults + free-tier gates
// ─────────────────────────────────────────────────────────────────

export const FREE_PALETTE_COUNT = 6
export const FREE_FONT_COUNT = 6
export const FREE_SHAPE_COUNT = 3

export const DEFAULT_TICKER_ORDER: string[] = ['for_sale', 'sold', 'open_houses', 'spotlights']

export const DEFAULT_STYLE: AgentStyle = {
  paletteId: DEFAULT_PALETTE_ID,
  fontId: DEFAULT_FONT_ID,
  shapeId: DEFAULT_SHAPE_ID,
  frames: { avatar: 'border_shadow', map: 'border_shadow', listings: 'border_shadow', links: 'border_shadow' },
  sections: { bio: true, ticker: true, social: true, map: true, content: true, links: true },
  tickerAuto: { for_sale: true, sold: true, open_houses: true, spotlights: true },
  tickerCustom: [],
  tickerOrder: DEFAULT_TICKER_ORDER,
  ctaLabels: { wave: 'Wave', save: 'Subscribe' },
  listingsLayout: 'scroller',
  customAccentColor: null,
  customFontColor: null,
  customBackgroundColor: null,
  customBackgroundImage: null,
  customLinks: [],
  customLinksPosition: 'below',
}

export function resolveStyle(partial: Partial<AgentStyle> | null | undefined): AgentStyle {
  if (!partial) return DEFAULT_STYLE
  return {
    paletteId: partial.paletteId || DEFAULT_STYLE.paletteId,
    fontId: partial.fontId || DEFAULT_STYLE.fontId,
    shapeId: partial.shapeId || DEFAULT_STYLE.shapeId,
    frames: { ...DEFAULT_STYLE.frames, ...(partial.frames || {}) },
    sections: { ...DEFAULT_STYLE.sections, ...(partial.sections || {}) },
    tickerAuto: { ...DEFAULT_STYLE.tickerAuto, ...(partial.tickerAuto || {}) },
    tickerCustom: partial.tickerCustom || DEFAULT_STYLE.tickerCustom,
    tickerOrder: partial.tickerOrder || DEFAULT_STYLE.tickerOrder,
    ctaLabels: { ...DEFAULT_STYLE.ctaLabels, ...(partial.ctaLabels || {}) },
    listingsLayout: partial.listingsLayout || DEFAULT_STYLE.listingsLayout,
    customAccentColor: partial.customAccentColor ?? DEFAULT_STYLE.customAccentColor,
    customFontColor: partial.customFontColor ?? DEFAULT_STYLE.customFontColor,
    customBackgroundColor: partial.customBackgroundColor ?? DEFAULT_STYLE.customBackgroundColor,
    customBackgroundImage: partial.customBackgroundImage ?? DEFAULT_STYLE.customBackgroundImage,
    customLinks: partial.customLinks || DEFAULT_STYLE.customLinks,
    customLinksPosition: partial.customLinksPosition || DEFAULT_STYLE.customLinksPosition,
  }
}

// ─────────────────────────────────────────────────────────────────
// Color helpers — verbatim port from web palettes.ts
// ─────────────────────────────────────────────────────────────────

export function darkenHex(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const rN = r / 255, gN = g / 255, bN = b / 255
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break
      case gN: h = (bN - rN) / d + 2; break
      case bN: h = (rN - gN) / d + 4; break
    }
    h /= 6
  }
  const newL = Math.max(0, Math.min(1, l - amount))
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let nr: number, ng: number, nb: number
  if (s === 0) { nr = ng = nb = newL } else {
    const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s
    const p = 2 * newL - q
    nr = hue2rgb(p, q, h + 1 / 3); ng = hue2rgb(p, q, h); nb = hue2rgb(p, q, h - 1 / 3)
  }
  r = Math.round(nr * 255); g = Math.round(ng * 255); b = Math.round(nb * 255)
  const toHex = (v: number) => v.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function readableInkOnHex(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#FFFFFF'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const ch = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
  const L = 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
  return L > 0.5 ? '#0A0E17' : '#FFFFFF'
}
