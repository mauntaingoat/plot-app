import { type ReactNode, useEffect } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

interface MarketingLayoutProps {
  children: ReactNode
  noFooter?: boolean
}

/* Direction-aware brand-btn tilt. On the moment the cursor enters the
   pill, set --btn-tilt to a clockwise (+1.5°) or counter-clockwise
   (-1.5°) angle based on whether the entry point was right or left of
   the pill's horizontal center. The tilt is locked for the entire hover
   session — the relatedTarget check ignores subsequent mouseover events
   that fire as the cursor moves within the button. Centered or unknown
   entries default to +1.5° (right). */
function useBrandBtnTilt() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest('.brand-btn') as HTMLElement | null
      if (!target) return
      // Only set tilt on the FIRST entry into the button — if relatedTarget
      // is a descendant of (or is) the button, the cursor was already
      // hovering and we should leave the tilt direction alone.
      const related = e.relatedTarget as Node | null
      if (related && target.contains(related)) return
      const rect = target.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      const tilt = e.clientX < center ? '-1.5deg' : '1.5deg'
      target.style.setProperty('--btn-tilt', tilt)
    }
    document.addEventListener('mouseover', handler)
    return () => document.removeEventListener('mouseover', handler)
  }, [])
}

export function MarketingLayout({ children, noFooter }: MarketingLayoutProps) {
  useBrandBtnTilt()
  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      {!noFooter && <Footer />}
    </div>
  )
}
