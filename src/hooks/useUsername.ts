import { useState, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, firebaseConfigured } from '@/config/firebase'

export function useUsername() {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const check = useCallback((username: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const cleaned = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleaned.length < 3) {
      setAvailable(null)
      return
    }

    setChecking(true)
    timeoutRef.current = setTimeout(() => {
      if (!firebaseConfigured || !db) {
        setAvailable(true)
        setChecking(false)
        return
      }

      // Hard timeout — if Firestore doesn't respond in 2s, assume available
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
    const cleaned = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
    await setDoc(doc(db, 'usernames', cleaned), {
      uid,
      createdAt: serverTimestamp(),
    })
  }, [])

  return { available, checking, check, claim }
}
