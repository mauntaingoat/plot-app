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
    timeoutRef.current = setTimeout(async () => {
      if (!firebaseConfigured || !db) {
        setAvailable(true)
        setChecking(false)
        return
      }

      // Race the Firestore read against a 3s timeout
      try {
        const result = await Promise.race([
          getDoc(doc(db, 'usernames', cleaned)).then((snap) => !snap.exists()),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3000)), // timeout = assume available
        ])
        setAvailable(result)
      } catch {
        setAvailable(true) // On error, assume available
      } finally {
        setChecking(false)
      }
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
