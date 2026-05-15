import type { ReactNode } from 'react'

/**
 * Layered-reveal CTA — the beehiiv-style stacked-card hover used on
 * the homepage hero "Claim it" button, extracted so the rest of the
 * marketing primary CTAs share the same look.
 *
 * Three layers at the same position in rest state. On hover the
 * foreground brand-gradient button shifts 18px up-right; the two
 * pastel reveal layers behind step 12px and 6px so they stay evenly
 * spaced (6px between each).
 *
 * Sizing is locked to two presets (`sm` / `md`) that match the
 * existing brand-btn heights used on marketing surfaces.
 */
export type LayeredCTASize = 'sm' | 'md'

interface LayeredCTAProps {
  onClick?: () => void
  children: ReactNode
  size?: LayeredCTASize
  fullWidth?: boolean
  type?: 'button' | 'submit'
  /** Extra class names applied to the foreground button (e.g. for
   *  custom font sizing in special contexts). Avoid overriding
   *  background or border-radius — those are the layered look. */
  className?: string
}

const SIZES: Record<LayeredCTASize, { h: string; px: string; text: string; gap: string }> = {
  sm: { h: 'h-11', px: 'px-5', text: 'text-[13px] md:text-[14px]', gap: 'gap-1.5' },
  md: { h: 'h-12', px: 'px-6', text: 'text-[14px] md:text-[15px]', gap: 'gap-2' },
}

export function LayeredCTA({
  onClick,
  children,
  size = 'md',
  fullWidth = false,
  type = 'button',
  className = '',
}: LayeredCTAProps) {
  const s = SIZES[size]
  return (
    <div className={`relative inline-flex shrink-0 group ${fullWidth ? 'w-full' : ''}`}>
      {/* Layer 3 — deepest reveal, moves least (6px) */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[8px] border-[0.5px] border-ink transition-transform duration-200 ease-out group-hover:translate-x-[6px] group-hover:-translate-y-[6px]"
        style={{ background: 'rgb(239, 139, 94)' }}
      />
      {/* Layer 2 — middle reveal, moves a step more (12px) */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[8px] border-[0.5px] border-ink transition-transform duration-200 ease-out group-hover:translate-x-[12px] group-hover:-translate-y-[12px]"
        style={{ background: 'rgb(248, 214, 181)' }}
      />
      {/* Layer 1 — foreground button, moves the most (18px) */}
      <button
        type={type}
        onClick={onClick}
        className={`relative ${s.h} ${s.px} ${s.text} rounded-[8px] flex items-center justify-center ${s.gap} cursor-pointer transition-transform duration-200 ease-out group-hover:translate-x-[18px] group-hover:-translate-y-[18px] ${fullWidth ? 'w-full' : ''} ${className}`}
        style={{
          background: 'var(--brand-grad)',
          color: '#fff',
          fontFamily: 'var(--font-humanist)',
          fontWeight: 600,
          boxShadow: '0 6px 16px -6px rgba(217,74,31,0.40), inset 0 1px 0 rgba(255,255,255,0.24)',
        }}
      >
        {children}
      </button>
    </div>
  )
}
