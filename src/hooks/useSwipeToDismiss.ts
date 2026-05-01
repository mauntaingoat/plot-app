import { useEffect, useRef, type RefObject } from 'react'

/**
 * Scroll-aware swipe-to-dismiss for bottom-sheets. Mirrors the behavior
 * already used by ListingModal + BottomSheet so every sheet on the
 * agent profile feels the same: pull down from anywhere on the sheet
 * (only when the inner scroll is at the top), with a resistance curve
 * for natural feel, and dismiss past 80px or with a flick.
 *
 * `sheetRef`  — the element that visually translates while dragging
 * `scrollRef` — the inner scroll container (optional). When omitted,
 *               drag is always allowed (sheets without scrollable content)
 * `active`    — wire the listeners only while the sheet is open
 * `onDismiss` — called once the user releases past the threshold
 */
export function useSwipeToDismiss(
  sheetRef: RefObject<HTMLDivElement | null>,
  scrollRef: RefObject<HTMLElement | null> | null,
  active: boolean,
  onDismiss: () => void,
) {
  const touchStartY = useRef(0)
  const translateY = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || !active) return

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      translateY.current = 0
      isDragging.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - touchStartY.current
      const scrollEl = scrollRef?.current ?? null
      const atTop = !scrollEl || scrollEl.scrollTop <= 1

      if (atTop && dy > 0) {
        if (!isDragging.current) isDragging.current = true
        translateY.current = dy
        const resistance = Math.min(dy, dy * 0.6 + 40)
        sheet.style.transform = `translateY(${resistance}px) translateZ(0)`
        sheet.style.transition = 'none'
        e.preventDefault()
      } else if (isDragging.current && dy <= 0) {
        isDragging.current = false
        translateY.current = 0
        sheet.style.transform = 'translateY(0) translateZ(0)'
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
      }
    }

    const onTouchEnd = () => {
      if (isDragging.current) {
        if (translateY.current > 80) {
          sheet.style.transform = 'translateY(100%) translateZ(0)'
          sheet.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)'
          window.setTimeout(onDismiss, 280)
        } else {
          sheet.style.transform = 'translateY(0) translateZ(0)'
          sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
        }
      }
      isDragging.current = false
      translateY.current = 0
    }

    sheet.addEventListener('touchstart', onTouchStart, { passive: true })
    sheet.addEventListener('touchmove', onTouchMove, { passive: false })
    sheet.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      sheet.removeEventListener('touchstart', onTouchStart)
      sheet.removeEventListener('touchmove', onTouchMove)
      sheet.removeEventListener('touchend', onTouchEnd)
    }
  }, [sheetRef, scrollRef, active, onDismiss])
}
