import { useState, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/config/firebase'

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
        const snap = await getDoc(doc(db, 'usernames', cleaned))
        setAvailable(!snap.exists())
      } catch {
        setAvailable(null)
      } finally {
        setChecking(false)
      }
    }, 300)
  }, [])

  const claim = useCallback(async (username: string, uid: string) => {
    const cleaned = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
    await setDoc(doc(db, 'usernames', cleaned), {
      uid,
      createdAt: serverTimestamp(),
    })
  }, [])

  return { available, checking, check, claim }
}
