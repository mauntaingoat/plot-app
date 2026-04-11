import { useEffect } from 'react'

/**
 * Locks body scroll when `locked` is true.
 * Used by modals and bottom sheets to prevent background scrolling.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [locked])
}
