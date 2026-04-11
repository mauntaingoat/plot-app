import { useEffect } from 'react'

/**
 * Locks body scroll when `locked` is true.
 * Explicitly restores when locked becomes false or component unmounts.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (locked) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [locked])
}
