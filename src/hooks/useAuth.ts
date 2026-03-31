import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from '@/config/firebase'
import { useAuthStore } from '@/stores/authStore'
import type { UserDoc } from '@/lib/types'

export function useAuthListener() {
  const { setFirebaseUser, setUserDoc, setLoading, setInitialized } = useAuthStore()

  useEffect(() => {
    // If Firebase isn't configured, skip auth and let the app render
    if (!firebaseConfigured || !auth || !db) {
      setLoading(false)
      setInitialized(true)
      return
    }

    let unsubUserDoc: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)

      if (unsubUserDoc) {
        unsubUserDoc()
        unsubUserDoc = null
      }

      if (user) {
        unsubUserDoc = onSnapshot(
          doc(db!, 'users', user.uid),
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
