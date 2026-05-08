/* ════════════════════════════════════════════════════════════════
   PRO-FEATURE AUDIT
   ────────────────────────────────────────────────────────────────
   When a paid (gifted) agent reverts to the Free tier, we don't
   delete or rewrite their style/pin data — we surface a checklist
   of every Pro feature still in use and lock the public profile
   until they either re-upgrade or downgrade their picks.

   Two consumers:
     - Dashboard sticky banner (lists each item, links to the right
       tab/section so the agent can fix it inline).
     - AgentProfile lockout screen (mirrors the pre-verification
       disabled state — profile is hidden from the public until
       the audit clears).

   Insights / email-notif gates are NOT in this audit because they
   silently revert at render time (the dashboard tab itself flips to
   the locked variant when tier=free). Only features that leave
   visible artifacts on the public profile or have user-authored
   data attached get audited.
   ──────────────────────────────────────────────────────────────── */

import type { UserDoc, Pin } from './types'
import { getUserTier, isPinActive, countActivePins, TIERS } from './tiers'
import {
  PALETTES,
  FONTS,
  SHAPES,
  resolveStyle,
  FREE_PALETTE_COUNT,
  FREE_FONT_COUNT,
  FREE_SHAPE_COUNT,
} from './style'

export type ProAuditKind =
  | 'style.palette'
  | 'style.font'
  | 'style.shape'
  | 'style.customAccent'
  | 'style.customFont'
  | 'style.customBg'
  | 'style.customBgImage'
  | 'style.customTicker'
  | 'openHouses'
  | 'activePinsOver3'

export interface ProAuditItem {
  kind: ProAuditKind
  /** Short headline for the banner row. */
  label: string
  /** One-line description of what they need to do to clear it. */
  detail: string
  /** Where in the dashboard the fix lives. The banner uses this to
   *  jump the agent straight to the relevant tab. */
  fixTab: 'reelst' | 'style'
}

export interface ProAuditResult {
  items: ProAuditItem[]
  /** True when the agent is on Free AND has at least one Pro feature
   *  still in use — i.e. the dashboard banner + profile lockout
   *  should both render. */
  blocked: boolean
}

const EMPTY: ProAuditResult = { items: [], blocked: false }

/** Run the audit for an agent. Returns the empty result when the
 *  agent is on Pro (or is null) — only Free agents accrue items.
 *  Pins should be the agent's own pins (the dashboard subscribes
 *  via `subscribeToAllAgentPins`). */
export function auditProUsage(user: UserDoc | null, pins: Pin[]): ProAuditResult {
  if (!user) return EMPTY
  if (getUserTier(user) === 'pro') return EMPTY

  const items: ProAuditItem[] = []
  const style = resolveStyle(user.style)

  // ── Style: Pro palette ──
  const paletteIdx = PALETTES.findIndex((p) => p.id === style.paletteId)
  if (paletteIdx >= FREE_PALETTE_COUNT) {
    const palette = PALETTES[paletteIdx]
    items.push({
      kind: 'style.palette',
      label: 'Pro color palette',
      detail: `"${palette.name}" is a Pro palette — switch to one of the first ${FREE_PALETTE_COUNT} in Style → Color palette.`,
      fixTab: 'style',
    })
  }

  // ── Style: Pro font ──
  const fontIdx = FONTS.findIndex((f) => f.id === style.fontId)
  if (fontIdx >= FREE_FONT_COUNT) {
    const font = FONTS[fontIdx]
    items.push({
      kind: 'style.font',
      label: 'Pro font pairing',
      detail: `"${font.name}" is a Pro font — switch to one of the first ${FREE_FONT_COUNT} in Style → Font.`,
      fixTab: 'style',
    })
  }

  // ── Style: Pro map shape ──
  const shapeIdx = SHAPES.findIndex((s) => s.id === style.shapeId)
  if (shapeIdx >= FREE_SHAPE_COUNT) {
    const shape = SHAPES[shapeIdx]
    const freeNames = SHAPES.slice(0, FREE_SHAPE_COUNT).map((s) => s.name).join(', ')
    items.push({
      kind: 'style.shape',
      label: 'Pro map shape',
      detail: `"${shape.name}" is a Pro shape — switch to ${freeNames} in Style → Map shape.`,
      fixTab: 'style',
    })
  }

  // ── Style: custom accent / font / bg color overrides ──
  if (style.customAccentColor) {
    items.push({
      kind: 'style.customAccent',
      label: 'Custom accent color',
      detail: 'Reset the custom accent override in Style → Color palette.',
      fixTab: 'style',
    })
  }
  if (style.customFontColor) {
    items.push({
      kind: 'style.customFont',
      label: 'Custom heading color',
      detail: 'Reset the custom heading-color override in Style → Font.',
      fixTab: 'style',
    })
  }
  if (style.customBackgroundColor) {
    items.push({
      kind: 'style.customBg',
      label: 'Custom profile background',
      detail: 'Reset the custom background override in Style → Color palette.',
      fixTab: 'style',
    })
  }
  if (style.customBackgroundImage) {
    items.push({
      kind: 'style.customBgImage',
      label: 'Custom background image',
      detail: 'Remove the uploaded background image in Style → Color palette.',
      fixTab: 'style',
    })
  }

  // ── Style: custom ticker items ──
  if (style.tickerCustom && style.tickerCustom.length > 0) {
    const n = style.tickerCustom.length
    items.push({
      kind: 'style.customTicker',
      label: `${n} custom ticker item${n === 1 ? '' : 's'}`,
      detail: `Remove your custom ticker ${n === 1 ? 'item' : 'items'} in Style → Ticker stats.`,
      fixTab: 'style',
    })
  }

  // ── Pins: open houses scheduled ──
  const pinsWithOpenHouse = pins.filter(
    (p) => p.type === 'for_sale' && (p as any).openHouse?.sessions?.length,
  )
  if (pinsWithOpenHouse.length > 0) {
    const n = pinsWithOpenHouse.length
    items.push({
      kind: 'openHouses',
      label: `Open houses on ${n} pin${n === 1 ? '' : 's'}`,
      detail: `Clear the open-house schedule on ${n === 1 ? 'the affected pin' : 'each affected pin'} in My Pins.`,
      fixTab: 'reelst',
    })
  }

  // ── Pins: active count over Free cap ──
  const freeCap = TIERS.free.maxActivePins
  const activeCount = countActivePins(pins.filter((p) => p.agentId === user.uid))
  if (activeCount > freeCap) {
    const over = activeCount - freeCap
    items.push({
      kind: 'activePinsOver3',
      label: `${activeCount} active pins (free limit: ${freeCap})`,
      detail: `Deactivate ${over} pin${over === 1 ? '' : 's'} in My Pins to bring your active count to ${freeCap}.`,
      fixTab: 'reelst',
    })
  }

  return { items, blocked: items.length > 0 }
}

/** Re-export for convenience — used by the AgentProfile lockout
 *  screen which only needs to know whether the audit is non-empty,
 *  not the items themselves. Keeps the import surface tidy. */
export { isPinActive }
