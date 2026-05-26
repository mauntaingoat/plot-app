import { useEffect, useState } from 'react'

/**
 * Reactive matchMedia hook — true when the viewport is narrow enough
 * we treat the browser as "mobile" for dashboard-gating purposes.
 *
 * Used by `RequireVerified` and the auth screens (SignIn/Welcome) so
 * signed-in agents on phones see the MobileBlockPage instead of the
 * dashboard — the dashboard's interaction model (drag-to-arrange pins,
 * style customization, multi-panel editors) doesn't translate to a
 * 375px viewport. Agents get pushed to the native iOS app when it
 * launches; for now they see a "use desktop" page.
 *
 * Breakpoint is 767px to match Tailwind's `md:` boundary that the
 * rest of the marketing site already uses for navbar / hero layout.
 */
const BREAKPOINT = '(max-width: 767px)'

export function useIsMobileBrowser(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(BREAKPOINT).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(BREAKPOINT)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    // addEventListener is the modern API; older Safari only has
    // addListener (deprecated but still works). Use whichever exists.
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mq as any).addListener(onChange)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return () => (mq as any).removeListener(onChange)
    }
  }, [])

  return isMobile
}
