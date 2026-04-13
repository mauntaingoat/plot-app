import { useEffect, useRef } from 'react'

/**
 * Locks body scroll when `locked` is true.
 * Uses position:fixed trick for mobile Safari compatibility.
 * Tracks lock count so multiple overlays don't fight.
 */
let lockCount = 0
let savedScrollY = 0

export function useScrollLock(locked: boolean) {
  const wasLocked = useRef(false)

  useEffect(() => {
    if (locked && !wasLocked.current) {
      wasLocked.current = true
      if (lockCount === 0) {
        savedScrollY = window.scrollY
        document.body.style.position = 'fixed'
        document.body.style.top = `-${savedScrollY}px`
        document.body.style.left = '0'
        document.body.style.right = '0'
        document.body.style.overflow = 'hidden'
      }
      lockCount++
    }

    if (!locked && wasLocked.current) {
      wasLocked.current = false
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.left = ''
        document.body.style.right = ''
        document.body.style.overflow = ''
        window.scrollTo(0, savedScrollY)
      }
    }

    return () => {
      if (wasLocked.current) {
        wasLocked.current = false
        lockCount = Math.max(0, lockCount - 1)
        if (lockCount === 0) {
          document.body.style.position = ''
          document.body.style.top = ''
          document.body.style.left = ''
          document.body.style.right = ''
          document.body.style.overflow = ''
          window.scrollTo(0, savedScrollY)
        }
      }
    }
  }, [locked])
}
