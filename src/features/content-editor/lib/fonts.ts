/**
 * On-demand Google Fonts loader for the text overlay tool.
 *
 * The editor only needs these fonts when the user is actively editing text,
 * so we lazy-inject one <link> tag per font instead of bundling them up
 * front. Idempotent: each font is only injected once per page lifecycle.
 */
import { FONT_OPTIONS, type FontKey } from '../state/types'

const loaded = new Set<FontKey>()

export function loadFont(key: FontKey): void {
  if (typeof document === 'undefined') return
  if (loaded.has(key)) return

  const def = FONT_OPTIONS.find((f) => f.key === key)
  if (!def) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${def.googleFontName}&display=swap`
  link.dataset.editorFont = def.key
  document.head.appendChild(link)
  loaded.add(key)
}

/** Load every editor font in one shot — used when entering Text mode for the first time. */
export function loadAllFonts(): void {
  for (const f of FONT_OPTIONS) loadFont(f.key)
}
