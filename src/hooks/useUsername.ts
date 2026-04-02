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
      try {
        if (!firebaseConfigured || !db) {
          // No Firebase — assume available (demo mode)
          setAvailable(true)
          setChecking(false)
          return
        }
        const snap = await getDoc(doc(db, 'usernames', cleaned))
        setAvailable(!snap.exists())
      } catch (e) {
        console.warn('Username check failed:', e)
        // If Firestore fails (permissions, network), assume available
        // Real validation happens on claim
        setAvailable(true)
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
