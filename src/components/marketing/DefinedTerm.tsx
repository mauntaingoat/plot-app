import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Inline brand-vocabulary term with a hover (desktop) / tap (mobile)
 * tooltip. Use sparingly — only for product names that don't define
 * themselves (Save, Wave, Spotlight).
 *
 * - Dotted underline uses `currentColor` so it inherits the
 *   surrounding text color (dark on light hero, white on dark
 *   feature section).
 * - The tooltip clamps its horizontal position so it never bleeds
 *   off the viewport edge. Measured after open via useLayoutEffect
 *   so the first paint already shows the corrected position.
 */
export function DefinedTerm({ term, def }: { term: string; def: string }) {
  const [open, setOpen] = useState(false)
  const tipRef = useRef<HTMLSpanElement>(null)
  const [tipShift, setTipShift] = useState(0) // px to add to the centered transform

  useLayoutEffect(() => {
    if (!open || !tipRef.current) {
      setTipShift(0)
      return
    }
    const el = tipRef.current
    const r = el.getBoundingClientRect()
    const margin = 8
    const vw = window.innerWidth
    if (r.left < margin) {
      setTipShift(margin - r.left)
    } else if (r.right > vw - margin) {
      setTipShift(vw - margin - r.right)
    } else {
      setTipShift(0)
    }
  }, [open, term, def])

  // Close on viewport resize / scroll so the clamped position doesn't
  // go stale while the tooltip is sitting open.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
      className="relative inline-block cursor-help"
      style={{
        textDecoration: 'underline dotted',
        textUnderlineOffset: '4px',
        textDecorationThickness: '2px',
        textDecorationColor: 'currentColor',
        WebkitTextDecorationLine: 'underline',
        WebkitTextDecorationStyle: 'dotted',
        WebkitTextDecorationColor: 'currentColor',
      }}
    >
      {term}
      {open && (
        <span
          ref={tipRef}
          role="tooltip"
          className="absolute bottom-full mb-2 z-30 rounded-[10px] bg-ivory text-ink text-[12.5px] leading-[1.45] font-normal px-3 py-2 shadow-xl pointer-events-none"
          style={{
            fontFamily: 'var(--font-humanist)',
            left: '50%',
            transform: `translateX(calc(-50% + ${tipShift}px))`,
            width: 'min(240px, calc(100vw - 16px))',
          }}
        >
          {def}
        </span>
      )}
    </span>
  )
}
