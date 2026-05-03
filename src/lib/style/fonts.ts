/* ════════════════════════════════════════════════════════════════
   FONTS — 6 named pairings
   ────────────────────────────────────────────────────────────────
   Each pairing defines a display font (name, headers) plus a body
   font. Fonts are loaded on-demand via Google Fonts <link> tags
   injected only when the active palette needs them — so we don't
   ship 6 font families to every visitor.
   ──────────────────────────────────────────────────────────────── */

export interface FontPairing {
  id: string
  name: string
  vibe: string

  /** CSS font-family value used on the display name + section heads. */
  display: string
  /** CSS font-family value used on body text + ticker. */
  body: string

  /** Comma-separated list of Google-Font URL "family" params, e.g.
   *  `"Fraunces:wght@500;700&family=Inter:wght@400;500"`. Empty
   *  string means the fonts are already loaded by the base CSS
   *  (system / default Reelst fonts). */
  googleFamilies: string
}

export const FONTS: FontPairing[] = [
  {
    id: 'humanist',
    name: 'Humanist',
    vibe: 'Clean, modern (default)',
    display: '"General Sans", "Outfit", system-ui, sans-serif',
    body: '"General Sans", "Outfit", system-ui, sans-serif',
    googleFamilies: '', // shipped via base CSS already
  },
  {
    id: 'editorial',
    name: 'Editorial',
    vibe: 'Magazine, refined serif',
    display: '"Fraunces", "Times New Roman", serif',
    body: '"Inter", system-ui, sans-serif',
    googleFamilies: 'Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600',
  },
  {
    id: 'classic',
    name: 'Classic',
    vibe: 'Traditional luxury realtor',
    display: '"Playfair Display", "Times New Roman", serif',
    body: '"Lora", Georgia, serif',
    googleFamilies: 'Playfair+Display:wght@500;700&family=Lora:wght@400;500',
  },
  {
    id: 'geometric',
    name: 'Geometric',
    vibe: 'Modern, sharp tech',
    display: '"Space Grotesk", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    googleFamilies: 'Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600',
  },
  {
    id: 'soft',
    name: 'Soft',
    vibe: 'Friendly, rounded',
    display: '"Quicksand", system-ui, sans-serif',
    body: '"Open Sans", system-ui, sans-serif',
    googleFamilies: 'Quicksand:wght@500;700&family=Open+Sans:wght@400;500;600',
  },
  {
    id: 'mono',
    name: 'Mono',
    vibe: 'Distinctive, indie',
    display: '"IBM Plex Mono", ui-monospace, monospace',
    body: '"Inter", system-ui, sans-serif',
    googleFamilies: 'IBM+Plex+Mono:wght@500;700&family=Inter:wght@400;500;600',
  },
  {
    id: 'boutique',
    name: 'Boutique',
    vibe: 'Elegant luxury',
    display: '"DM Serif Display", "Times New Roman", serif',
    body: '"DM Sans", system-ui, sans-serif',
    googleFamilies: 'DM+Serif+Display&family=DM+Sans:wght@400;500;600',
  },
  {
    id: 'bold',
    name: 'Bold',
    vibe: 'Big statement, confident',
    display: '"Archivo Black", "Helvetica Neue", sans-serif',
    body: '"Archivo", system-ui, sans-serif',
    googleFamilies: 'Archivo+Black&family=Archivo:wght@400;500;600',
  },
  {
    id: 'handwritten',
    name: 'Handwritten',
    vibe: 'Personal, warm',
    display: '"Caveat", "Bradley Hand", cursive',
    body: '"Nunito", system-ui, sans-serif',
    googleFamilies: 'Caveat:wght@500;700&family=Nunito:wght@400;500;600',
  },
  {
    id: 'slab',
    name: 'Slab',
    vibe: 'Grounded, structured',
    display: '"Roboto Slab", "Rockwell", serif',
    body: '"Roboto", system-ui, sans-serif',
    googleFamilies: 'Roboto+Slab:wght@500;700&family=Roboto:wght@400;500;600',
  },
]

export const FONT_BY_ID: Record<string, FontPairing> = Object.fromEntries(
  FONTS.map((f) => [f.id, f])
)

export const DEFAULT_FONT_ID = 'humanist'

export function getFont(id: string | undefined | null): FontPairing {
  return FONT_BY_ID[id || DEFAULT_FONT_ID] || FONT_BY_ID[DEFAULT_FONT_ID]
}

/* Stylesheet loader. Idempotent — re-calling with the same id is a
 * no-op so font flips are cheap. The link element gets a stable id
 * so the page never accumulates duplicate stylesheet tags. */
export function ensureFontLoaded(fontId: string) {
  if (typeof document === 'undefined') return
  const font = getFont(fontId)
  if (!font.googleFamilies) return

  const linkId = `reelst-font-${font.id}`
  if (document.getElementById(linkId)) return

  // Preconnect to Google Fonts on first use — small but real win.
  if (!document.getElementById('reelst-fonts-preconnect')) {
    const pre = document.createElement('link')
    pre.id = 'reelst-fonts-preconnect'
    pre.rel = 'preconnect'
    pre.href = 'https://fonts.gstatic.com'
    pre.crossOrigin = 'anonymous'
    document.head.appendChild(pre)
  }

  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleFamilies}&display=swap`
  document.head.appendChild(link)
}
