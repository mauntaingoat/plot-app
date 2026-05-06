import { useState, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, firebaseConfigured } from '@/config/firebase'

// Build the canonical lookup key for a license. State + number
// together form the globally unique identity (different states can
// reissue the same number). Doc IDs are constrained by Firestore to
// the printable-ASCII subset, so we strip whitespace and uppercase
// for stability across the various input forms in the UI.
export function licenseDocId(licenseNumber: string, licenseState: string): string {
  const num = licenseNumber.replace(/\s+/g, '').toUpperCase()
  const state = licenseState.trim().toUpperCase()
  if (!num || !state) return ''
  return `${state}_${num}`
}

export function useLicense() {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [takenBy, setTakenBy] = useState<{ uid?: string; username?: string } | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const check = useCallback((licenseNumber: string, licenseState: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    const id = licenseDocId(licenseNumber, licenseState)
    if (!id) {
      setAvailable(null); setTakenBy(null); setChecking(false)
      return
    }

    setChecking(true)
    timeoutRef.current = setTimeout(() => {
      if (!firebaseConfigured || !db) {
        setAvailable(true); setTakenBy(null); setChecking(false)
        return
      }

      let resolved = false
      const hardTimeout = setTimeout(() => {
        if (!resolved) { resolved = true; setAvailable(true); setChecking(false) }
      }, 2000)

      getDoc(doc(db, 'licenses', id))
        .then(async (snap) => {
          if (resolved) return
          if (snap.exists()) {
            resolved = true
            clearTimeout(hardTimeout)
            const data = snap.data() as { uid?: string; username?: string }
            setAvailable(false); setTakenBy({ uid: data.uid, username: data.username })
            setChecking(false)
            return
          }
          // Fall back to a users-collection scan to catch agents who
          // predate the `licenses` table. Without this, a brand-new
          // signup using a legacy agent's license would clear the
          // live check (since nobody has claimed the lookup doc yet).
          try {
            const { checkLicenseDuplicate } = await import('@/lib/firestore')
            const result = await checkLicenseDuplicate(licenseNumber, licenseState)
            if (resolved) return
            resolved = true
            clearTimeout(hardTimeout)
            if (result.exists) {
              setAvailable(false); setTakenBy({ uid: result.uid, username: result.username })
            } else {
              setAvailable(true); setTakenBy(null)
            }
            setChecking(false)
          } catch {
            if (resolved) return
            resolved = true
            clearTimeout(hardTimeout)
            setAvailable(true); setTakenBy(null); setChecking(false)
          }
        })
        .catch(() => {
          if (resolved) return
          resolved = true
          clearTimeout(hardTimeout)
          // Fail open — Firestore hiccups shouldn't block onboarding.
          // The atomic claim at signup time is the real enforcement.
          setAvailable(true); setTakenBy(null); setChecking(false)
        })
    }, 300)
  }, [])

  const claim = useCallback(async (licenseNumber: string, licenseState: string, uid: string, username?: string | null) => {
    if (!db) return
    const id = licenseDocId(licenseNumber, licenseState)
    if (!id) return
    await setDoc(doc(db, 'licenses', id), {
      uid,
      username: username || null,
      createdAt: serverTimestamp(),
    })
  }, [])

  return { available, checking, takenBy, check, claim }
}
