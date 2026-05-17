import { useEffect, useRef } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from '@/config/firebase'
import { useAuthStore } from '@/stores/authStore'
import { setAdminFromClaims } from '@/lib/admin'
import type { UserDoc } from '@/lib/types'

/** Self-heal a missing Firestore user doc. SignUp swallows
 *  `createUserDoc` errors (network/rules/App Check), so a Firebase
 *  Auth account can exist with no matching Firestore doc — sign-in
 *  then leaves the user stuck on the dashboard spinner forever. This
 *  uses a transaction (only-create-if-missing) so it can't clobber
 *  an in-flight signup write that's racing this listener. */
async function selfHealUserDoc(user: User): Promise<void> {
  if (!db) return
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db!, 'users', user.uid)
      const existing = await tx.get(ref)
      if (existing.exists()) return
      tx.set(ref, {
        uid: user.uid,
        email: user.email ?? '',
        role: 'agent',
        createdAt: serverTimestamp(),
        username: null,
        displayName: user.displayName ?? '',
        photoURL: user.photoURL ?? null,
        bio: '',
        brokerage: null,
        licenseNumber: null,
        licenseState: null,
        licenseName: null,
        verificationStatus: 'unverified',
        fairHousingAccepted: false,
        dataSecurityAccepted: false,
        emailVerified: !!user.emailVerified,
        tier: 'free',
        brandColor: null,
        platforms: [],
        onboardingComplete: false,
        onboardingStep: 0,
        setupPercent: 0,
      })
    })
  } catch (err) {
    console.warn('[auth] self-heal user doc failed:', err)
  }
}

export function useAuthListener() {
  const { setFirebaseUser, setUserDoc, setLoading, setInitialized } = useAuthStore()
  // One self-heal attempt per uid per session. The snapshot listener
  // fires repeatedly; without this we'd loop trying to heal on every
  // empty snapshot.
  const healedUidsRef = useRef<Set<string>>(new Set())
  // Uids whose user doc we've observed to exist at least once in this
  // session. Used to distinguish "doc never existed" (broken signup
  // — self-heal makes sense) from "doc was just intentionally
  // deleted" (account deletion in flight — self-heal would resurrect
  // the stub mid-delete and leave a ghost doc behind).
  const seenUidsRef = useRef<Set<string>>(new Set())

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

      // Pull custom claims out of the ID token so isAdmin() works
      // synchronously across the app. Cleared on sign-out so a stale
      // admin flag can't leak across user switches.
      if (user) {
        user.getIdTokenResult().then((r) => setAdminFromClaims(r.claims)).catch(() => setAdminFromClaims(null))
      } else {
        setAdminFromClaims(null)
      }

      if (user) {
        unsubUserDoc = onSnapshot(
          doc(db!, 'users', user.uid),
          (snap) => {
            if (snap.exists()) {
              seenUidsRef.current.add(user.uid)
              setUserDoc({ uid: snap.id, ...snap.data() } as UserDoc)
            } else {
              setUserDoc(null)
              const previouslySeen = seenUidsRef.current.has(user.uid)
              const alreadyHealed = healedUidsRef.current.has(user.uid)
              // Only self-heal if the doc has NEVER existed in this
              // session. If we'd seen it before, this empty snapshot
              // is a deletion-in-flight, not a broken signup.
              if (!previouslySeen && !alreadyHealed) {
                healedUidsRef.current.add(user.uid)
                void selfHealUserDoc(user)
              }
            }
            setLoading(false)
            setInitialized(true)
          },
          (err) => {
            console.warn('[auth] user doc subscription error:', err.message)
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
