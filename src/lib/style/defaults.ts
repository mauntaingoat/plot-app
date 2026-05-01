/* Defaults for AgentStyle — used when a userDoc has no `style`
   field set yet (i.e., agents created before customization shipped).
   Everything here matches the pre-customization defaults so existing
   profiles render identically with no migration. */

import type { AgentStyle } from './types'
import { DEFAULT_PALETTE_ID } from './palettes'
import { DEFAULT_FONT_ID } from './fonts'
import { DEFAULT_SHAPE_ID } from './shapes'

export const DEFAULT_TICKER_ORDER = ['for_sale', 'sold', 'open_houses', 'spotlights']

export const DEFAULT_STYLE: AgentStyle = {
  paletteId: DEFAULT_PALETTE_ID,
  fontId: DEFAULT_FONT_ID,
  shapeId: DEFAULT_SHAPE_ID,
  frames: {
    avatar: 'shadow',
    map: 'none',
    listings: 'none',
  },
  sections: {
    bio: true,
    ticker: true,
    social: true,
    map: true,
  },
  tickerAuto: {
    for_sale: true,
    sold: true,
    open_houses: true,
    spotlights: true,
  },
  tickerCustom: [],
  tickerOrder: DEFAULT_TICKER_ORDER,
  ctaLabels: {
    wave: 'Wave',
    save: 'Save',
  },
}

/** Merge a partial style (from Firestore) onto the defaults so we
 *  never read an undefined field. Used everywhere we resolve the
 *  active style from a userDoc. */
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
  }
}
