import { useState, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, firebaseConfigured } from '@/config/firebase'
import { cleanUsername, isReservedUsername } from '@/lib/reservedUsernames'

export type UsernameStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken' }
  | { state: 'reserved' }
  | { state: 'too-short' }

export function useUsername() {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [reserved, setReserved] = useState(false)
  const [checking, setChecking] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const check = useCallback((username: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const cleaned = cleanUsername(username)
    if (cleaned.length < 3) {
      setAvailable(null)
      setReserved(false)
      return
    }

    if (isReservedUsername(cleaned)) {
      setAvailable(false)
      setReserved(true)
      setChecking(false)
      return
    }
    setReserved(false)

    setChecking(true)
    timeoutRef.current = setTimeout(() => {
      if (!firebaseConfigured || !db) {
        setAvailable(true)
        setChecking(false)
        return
      }

      let resolved = false
      const hardTimeout = setTimeout(() => {
        if (!resolved) { resolved = true; setAvailable(true); setChecking(false) }
      }, 2000)

      getDoc(doc(db, 'usernames', cleaned))
        .then((snap) => {
          if (!resolved) { resolved = true; clearTimeout(hardTimeout); setAvailable(!snap.exists()); setChecking(false) }
        })
        .catch(() => {
          if (!resolved) { resolved = true; clearTimeout(hardTimeout); setAvailable(true); setChecking(false) }
        })
    }, 300)
  }, [])

  const claim = useCallback(async (username: string, uid: string) => {
    if (!db) return
    const cleaned = cleanUsername(username)
    if (cleaned.length < 3) throw new Error('Username must be at least 3 letters')
    if (isReservedUsername(cleaned)) throw new Error('That username is reserved')
    await setDoc(doc(db, 'usernames', cleaned), {
      uid,
      createdAt: serverTimestamp(),
    })
  }, [])

  return { available, checking, reserved, check, claim }
}
