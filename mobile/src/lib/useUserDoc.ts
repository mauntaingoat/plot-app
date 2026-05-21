import { useEffect, useState } from 'react'
import { subscribeUserDoc, type UserDocLite } from './firestoreDb'
import { currentUser } from './firebaseAuth'

/** Hook: live subscription to the current user's Firestore doc. */
export function useUserDoc() {
  const [userDoc, setUserDoc] = useState<UserDocLite | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = currentUser()
    if (!user) {
      setUserDoc(null)
      setLoading(false)
      return
    }
    return subscribeUserDoc(user.uid, (d) => {
      setUserDoc(d)
      setLoading(false)
    })
  }, [])

  return { userDoc, loading }
}

/** Format big numbers compactly: 1234 → "1.2K", 12345 → "12K", 1234567 → "1.2M". */
export function formatCompact(n: number | null | undefined): string {
  const v = n ?? 0
  if (v < 1000) return String(v)
  if (v < 10_000) return `${(v / 1000).toFixed(1)}K`
  if (v < 1_000_000) return `${Math.round(v / 1000)}K`
  return `${(v / 1_000_000).toFixed(1)}M`
}
