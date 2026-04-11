import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useAuthModalStore } from '@/stores/authModalStore'
import { followAgent as followFs, unfollowAgent as unfollowFs, isFollowing as isFollowingFs } from '@/lib/firestore'
import { firebaseConfigured } from '@/config/firebase'

// Hook for managing follow relationships.
// Backed by Firestore in production, localStorage in demo mode.

const DEMO_KEY = 'reelst-demo-follows'

export function useFollow(targetAgentUid: string | null | undefined) {
  const { userDoc } = useAuthStore()
  const { open: openAuth } = useAuthModalStore()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!targetAgentUid) { setLoaded(true); return }

    // Demo mode (or signed out) — read from localStorage
    if (!userDoc || !firebaseConfigured) {
      try {
        const raw = localStorage.getItem(DEMO_KEY)
        const list: string[] = raw ? JSON.parse(raw) : []
        setIsFollowing(list.includes(targetAgentUid))
      } catch {
        setIsFollowing(false)
      }
      setLoaded(true)
      return
    }

    // Firestore lookup
    isFollowingFs(userDoc.uid, targetAgentUid)
      .then((result) => setIsFollowing(result))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [userDoc, targetAgentUid])

  const toggle = useCallback(async () => {
    if (!targetAgentUid) return false

    // If sign-in required, prompt for auth
    if (!userDoc && firebaseConfigured) {
      openAuth('signup')
      return false
    }

    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)

    if (userDoc && firebaseConfigured) {
      try {
        if (wasFollowing) await unfollowFs(userDoc.uid, targetAgentUid)
        else await followFs(userDoc.uid, targetAgentUid)
      } catch {
        setIsFollowing(wasFollowing)
        return false
      }
    } else {
      // Demo mode — persist to localStorage
      try {
        const raw = localStorage.getItem(DEMO_KEY)
        const list: string[] = raw ? JSON.parse(raw) : []
        const next = wasFollowing
          ? list.filter((id) => id !== targetAgentUid)
          : [...list, targetAgentUid]
        localStorage.setItem(DEMO_KEY, JSON.stringify(next))
      } catch {}
    }

    return true
  }, [isFollowing, userDoc, targetAgentUid, openAuth])

  return { isFollowing, loaded, toggle, needsAuth: !userDoc && firebaseConfigured }
}

// Hook for getting all agents a user is currently following
export function useFollowingList(): { followingIds: string[]; loaded: boolean } {
  const { userDoc } = useAuthStore()
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Demo mode (or signed out) — read from localStorage
    if (!userDoc || !firebaseConfigured) {
      try {
        const raw = localStorage.getItem(DEMO_KEY)
        setFollowingIds(raw ? JSON.parse(raw) : [])
      } catch {
        setFollowingIds([])
      }
      setLoaded(true)
      return
    }

    // Firestore — query follows where followerUid == userDoc.uid
    import('@/config/firebase').then(({ db }) => {
      if (!db) { setLoaded(true); return }
      import('firebase/firestore').then(({ collection, query, where, getDocs, limit }) => {
        const q = query(collection(db, 'follows'), where('followerUid', '==', userDoc.uid), limit(200))
        getDocs(q).then((snap) => {
          setFollowingIds(snap.docs.map((d) => d.data().followedUid as string))
          setLoaded(true)
        }).catch(() => setLoaded(true))
      })
    })
  }, [userDoc])

  return { followingIds, loaded }
}
