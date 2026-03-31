import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import { useAuthStore } from '@/stores/authStore'
import type { UserDoc } from '@/lib/types'

export function useAuthListener() {
  const { setFirebaseUser, setUserDoc, setLoading, setInitialized } = useAuthStore()

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)

      // Clean up previous user doc listener
      if (unsubUserDoc) {
        unsubUserDoc()
        unsubUserDoc = null
      }

      if (user) {
        // Listen to user doc in real-time
        unsubUserDoc = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (snap.exists()) {
              setUserDoc({ uid: snap.id, ...snap.data() } as UserDoc)
            } else {
              setUserDoc(null)
            }
            setLoading(false)
            setInitialized(true)
          },
          () => {
            setLoading(false)
            setInitialized(true)
          }
        )
      } else {
        setUserDoc(null)
        setLoading(false)
        setInitialized(true)
      }
    })

    return () => {
      unsubAuth()
      if (unsubUserDoc) unsubUserDoc()
    }
  }, [setFirebaseUser, setUserDoc, setLoading, setInitialized])
}
