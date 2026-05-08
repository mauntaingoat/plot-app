/* ════════════════════════════════════════════════════════════════
   REELST LOGO — canonical lockup component
   ────────────────────────────────────────────────────────────────
   Renders the icon (`/reelst-logo.png`) + the "Reelst" wordmark
   with consistent typography, color, gap, and proportion across
   the app. Sizes scale icon + text + gap together so the lockup
   reads identically at any size.

   Use this in the nav, footer, dashboard sidebar, auth pages,
   loading screens — anywhere the logo lockup appears. Wrap in a
   Link/anchor if the lockup should be tappable; this component
   stays a pure visual element (a span) so it composes cleanly.
   ──────────────────────────────────────────────────────────────── */

export type ReelstLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

/** Size table — keys map to (icon px, text px, gap px). The
 *  text/icon ratio holds steady around 0.62–0.68 across sizes so
 *  the lockup feels visually consistent at every scale. */
const SIZES: Record<ReelstLogoSize, { icon: number; text: number; gap: number }> = {
  xs:  { icon: 22, text: 14, gap: 6 },
  sm:  { icon: 28, text: 18, gap: 8 },
  md:  { icon: 32, text: 20, gap: 8 },
  lg:  { icon: 40, text: 26, gap: 10 },
  xl:  { icon: 48, text: 32, gap: 12 },
  xxl: { icon: 56, text: 38, gap: 14 },
}

interface Props {
  size?: ReelstLogoSize
  /** Color treatment.
   *  - `ink`: dark text on light background (default)
   *  - `white`: white text on dark background (loading screens, dark pages)
   *  - `inherit`: use the surrounding element's color — for palette-themed
   *    surfaces like the agent-profile loading screen, where the logo
   *    color is driven by `--text-primary`. */
  color?: 'ink' | 'white' | 'inherit'
  className?: string
}

export function ReelstLogo({ size = 'md', color = 'ink', className = '' }: Props) {
  const s = SIZES[size]
  const colorStyle =
    color === 'ink' ? { color: 'var(--color-ink, #0A0E17)' }
      : color === 'white' ? { color: '#FFFFFF' }
      : { color: 'inherit' }
  return (
    <span
      className={`inline-flex items-center shrink-0 ${className}`}
      style={{ gap: s.gap, ...colorStyle }}
    >
      <img
        src="/reelst-logo.png"
        alt=""
        width={s.icon}
        height={s.icon}
        style={{ display: 'block', flexShrink: 0 }}
      />
      <span
        style={{
          fontFamily: 'var(--font-humanist)',
          fontSize: s.text,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        Reelst
      </span>
    </span>
  )
}
