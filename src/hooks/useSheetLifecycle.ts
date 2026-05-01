import { useEffect, useRef, useState } from 'react'

/**
 * Bottom-sheet mount/visible lifecycle, mirroring the pattern used by
 * BottomSheet + ListingModal. Drives the CSS `data-visible` attribute
 * that controls slide-up/slide-down transitions, so swipe-to-dismiss
 * (which mutates `transform` directly) stays consistent — no
 * framer-motion exit animation racing the inline transform = no
 * flicker on dismissal.
 *
 * Returns:
 *   mounted — whether to render the sheet at all
 *   visible — value to set on `data-visible`. CSS transitions handle
 *             the actual slide.
 *
 * `closeMs` — how long to keep the element in the DOM after closing
 * so the slide-down transition completes before unmount. Default 300.
 */
export function useSheetLifecycle(isOpen: boolean, closeMs = 300) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)
  // Hold the unmount timer in a ref so re-renders triggered *during*
  // the close transition (e.g. by `setVisible(false)`) don't cancel
  // the timer via effect-cleanup. We only clear it when a fresh
  // open/close cycle starts or on component unmount.
  const closeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    // Open path
    if (isOpen) {
      // If we were mid-close, abort it: cancel the pending unmount
      // and reopen from current visual state.
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
        closingRef.current = false
      }
      if (!mounted) {
        setMounted(true)
      }
      if (!visible) {
        // Two RAFs so the initial `data-visible='false'` styles
        // have been committed before flipping to true — otherwise
        // the browser collapses both states into one frame and the
        // transition doesn't animate.
        const r1 = requestAnimationFrame(() =>
          requestAnimationFrame(() => setVisible(true)),
        )
        return () => cancelAnimationFrame(r1)
      }
      return
    }

    // Close path — only schedule once per close cycle. The
    // `closingRef` guard prevents the re-render caused by
    // `setVisible(false)` from re-entering this branch.
    if (mounted && !closingRef.current) {
      closingRef.current = true
      setVisible(false)
      closeTimerRef.current = window.setTimeout(() => {
        setMounted(false)
        closingRef.current = false
        closeTimerRef.current = null
      }, closeMs)
    }
  }, [isOpen, mounted, visible, closeMs])

  // Component-unmount cleanup only.
  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  return { mounted, visible }
}
