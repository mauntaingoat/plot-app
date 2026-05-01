import {
  Children,
  isValidElement,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react'

/* ════════════════════════════════════════════════════════════════
   ScrollFadeText
   ────────────────────────────────────────────────────────────────
   Splits its children into per-word spans (and per-element spans
   for inline icons), then on scroll flips a `data-revealed` flag
   on each one as it passes the reveal trigger line. CSS transitions
   handle the visuals:
     • Words: soft tangerine (opacity 0.4) → full tangerine
     • Icons: width 0 + scale 0.5 + opacity 0 → natural width +
       scale 1 + opacity 1, with a slight overshoot. The width
       transition is what physically pushes the next word to the
       right as the icon "pops in".
   The reveal is one-shot — once a word/icon has been revealed it
   stays revealed (no flicker on scroll-back).
   ════════════════════════════════════════════════════════════════ */

interface ScrollFadeTextProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  /** Where the reveal trigger sits inside the viewport (0 = top, 1 = bottom). */
  trigger?: number
}

const SPLIT_RX = /(\s+)/

export function ScrollFadeText({
  children,
  className,
  style,
  trigger = 0.45,
}: ScrollFadeTextProps) {
  const ref = useRef<HTMLDivElement>(null)

  const tokens: ReactNode[] = []
  let key = 0

  function process(node: ReactNode) {
    if (node === null || node === undefined || node === false) return
    if (typeof node === 'string') {
      const parts = node.split(SPLIT_RX)
      for (const part of parts) {
        if (!part) continue
        if (/^\s+$/.test(part)) {
          tokens.push(<span key={key++}>{part}</span>)
        } else {
          tokens.push(
            <span key={key++} className="sft-word" data-fade="word" data-revealed="false">
              {part}
            </span>,
          )
        }
      }
    } else if (typeof node === 'number') {
      tokens.push(
        <span key={key++} className="sft-word" data-fade="word" data-revealed="false">
          {node}
        </span>,
      )
    } else if (Array.isArray(node)) {
      for (const child of node) process(child)
    } else if (isValidElement(node)) {
      tokens.push(
        <span key={key++} className="sft-icon" data-fade="icon" data-revealed="false">
          {node}
        </span>,
      )
    }
  }

  Children.forEach(children, process)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-fade]'))

    let raf = 0
    const update = () => {
      const vw = window.innerWidth || 1
      const triggerY = (window.innerHeight || 1) * trigger
      // Diagonal trigger: words with higher X need to scroll further before
      // crossing, so on a single line the left-most word reveals first and
      // the right-most last — yielding a word-by-word sweep instead of a
      // line-by-line flash.
      // Tilt MUST stay below the prose's line-height so a line finishes
      // revealing left-to-right before the next line starts. With body
      // text line-height ~32–50px, a 24px tilt yields a clean zig-zag
      // cadence: across, drop, across, drop. Bumping this above lineH
      // re-introduces inter-line bleed (lower line lights up before the
      // upper line is finished).
      const tilt = 24
      for (const el of els) {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const effectiveY = cy + (cx / vw) * tilt
        const next = effectiveY < triggerY ? 'true' : 'false'
        if (el.dataset.revealed !== next) el.dataset.revealed = next
      }
      raf = 0
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [trigger])

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, textWrap: 'pretty' as const }}
    >
      {tokens}
    </div>
  )
}

/* ── Inline tangerine glyph used inside ScrollFadeText. ──
   Width-driven reveal: while the parent .sft-icon span is collapsed
   (max-width: 0) the SVG is fully clipped via overflow:hidden on the
   span, so the icon truly takes no horizontal space and the text
   that follows sits flush. On reveal the span animates to its
   natural width, physically pushing the next word to the right. */

import {
  FilmStrip as Film,
  MapTrifold as MapIcon,
  TrendUp as TrendingUp,
  Robot as Bot,
  Link as LinkIcon,
} from '@phosphor-icons/react'
import type { Icon as LucideIcon } from '@phosphor-icons/react'

const TANGERINE = '#FF6B3D'

/* Stylised chess pawn glyph — head + neck + body + base. Reads as
   a chess piece even at small inline sizes. */
function ChessPawnSvg() {
  return (
    <svg
      width="0.66em"
      height="0.66em"
      viewBox="0 0 24 24"
      fill={TANGERINE}
      aria-hidden
      style={{ display: 'block' }}
    >
      <circle cx="12" cy="6" r="3" />
      <ellipse cx="12" cy="9" rx="3" ry="0.7" />
      <path d="M9.6 9.5 L14.4 9.5 L16 18 L8 18 Z" />
      <rect x="6" y="18" width="12" height="2.6" rx="0.5" />
      <ellipse cx="12" cy="20.2" rx="7" ry="0.7" />
    </svg>
  )
}

const GLYPHS: Record<string, LucideIcon> = {
  reel: Film,
  map: MapIcon,
  chart: TrendingUp,
  robot: Bot,
  link: LinkIcon,
}

export type GlyphName = 'reel' | 'map' | 'chart' | 'chess' | 'robot' | 'link'

/* Inline glyph framed in a soft cream squircle. All sizes are em-
   relative so the frame stays anchored to the parent font-size and
   never pushes the line-height taller than the surrounding text. */
export function Glyph({ name }: { name: GlyphName }) {
  const inner =
    name === 'chess' ? (
      <ChessPawnSvg />
    ) : (
      (() => {
        const Icon = GLYPHS[name]
        return (
          <Icon
            width="0.78em"
            height="0.78em"
            color={TANGERINE}
            weight="bold"
            style={{ display: 'block' }}
          />
        )
      })()
    )

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1em',
        height: '1em',
        borderRadius: '0.24em',
        background: 'rgba(255,255,255,0.88)',
        border: '1px solid rgba(217,74,31,0.18)',
        boxShadow:
          '0 3px 8px -3px rgba(217,74,31,0.18), 0 1px 0 rgba(255,255,255,0.85) inset',
        lineHeight: 1,
      }}
    >
      {inner}
    </span>
  )
}
