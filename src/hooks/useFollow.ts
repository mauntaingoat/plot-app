import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useAuthModalStore } from '@/stores/authModalStore'
import { followAgent as followFs, unfollowAgent as unfollowFs, isFollowing as isFollowingFs } from '@/lib/firestore'
import { firebaseConfigured } from '@/config/firebase'

const DEMO_KEY = 'reelst-demo-follows'

// Global shared follow state so all hook instances see the same data
const globalFollowState = new Map<string, boolean>()
const globalListeners = new Set<() => void>()
let globalFollowingIds: string[] = []
let globalFollowingLoaded = false

function notifyFollowListeners() {
  globalListeners.forEach((fn) => fn())
}

export function useFollow(targetAgentUid: string | null | undefined) {
  const { userDoc } = useAuthStore()
  const { open: openAuth } = useAuthModalStore()
  const [, forceUpdate] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1)
    globalListeners.add(listener)
    return () => { globalListeners.delete(listener) }
  }, [])

  useEffect(() => {
    if (!targetAgentUid) { setLoaded(true); return }
    if (globalFollowState.has(targetAgentUid)) { setLoaded(true); return }

    if (!userDoc || !firebaseConfigured) {
      try {
        const raw = localStorage.getItem(DEMO_KEY)
        const list: string[] = raw ? JSON.parse(raw) : []
        globalFollowState.set(targetAgentUid, list.includes(targetAgentUid))
      } catch {
        globalFollowState.set(targetAgentUid, false)
      }
      setLoaded(true)
      notifyFollowListeners()
      return
    }

    isFollowingFs(userDoc.uid, targetAgentUid)
      .then((result) => {
        globalFollowState.set(targetAgentUid, result)
        notifyFollowListeners()
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [userDoc, targetAgentUid])

  const isFollowing = targetAgentUid ? (globalFollowState.get(targetAgentUid) ?? false) : false

  const toggle = useCallback(async () => {
    if (!targetAgentUid) return false

    if (!userDoc && firebaseConfigured) {
      openAuth('signup')
      return false
    }

    const wasFollowing = globalFollowState.get(targetAgentUid) ?? false
    globalFollowState.set(targetAgentUid, !wasFollowing)
    notifyFollowListeners()

    if (userDoc && firebaseConfigured) {
      try {
        if (wasFollowing) await unfollowFs(userDoc.uid, targetAgentUid)
        else await followFs(userDoc.uid, targetAgentUid)
      } catch {
        globalFollowState.set(targetAgentUid, wasFollowing)
        notifyFollowListeners()
        return false
      }
    } else {
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
  }, [userDoc, targetAgentUid, openAuth])

  return { isFollowing, loaded, toggle, needsAuth: !userDoc && firebaseConfigured }
}

export function useFollowingList(): { followingIds: string[]; loaded: boolean } {
  const { userDoc } = useAuthStore()
  const [followingIds, setFollowingIds] = useState<string[]>(globalFollowingIds)
  const [loaded, setLoaded] = useState(globalFollowingLoaded)

  useEffect(() => {
    const listener = () => setFollowingIds([...globalFollowingIds])
    globalListeners.add(listener)
    return () => { globalListeners.delete(listener) }
  }, [])

  useEffect(() => {
    if (!userDoc || !firebaseConfigured) {
      try {
        const raw = localStorage.getItem(DEMO_KEY)
        globalFollowingIds = raw ? JSON.parse(raw) : []
      } catch {
        globalFollowingIds = []
      }
      globalFollowingLoaded = true
      setFollowingIds([...globalFollowingIds])
      setLoaded(true)
      return
    }

    let unsub: (() => void) | null = null
    let cancelled = false
    import('@/config/firebase').then(({ db }) => {
      if (!db || cancelled) { setLoaded(true); return }
      import('firebase/firestore').then(({ collection, query, where, onSnapshot, limit }) => {
        if (cancelled) return
        const q = query(collection(db, 'follows'), where('followerUid', '==', userDoc.uid), limit(1000))
        unsub = onSnapshot(q, (snap) => {
          globalFollowingIds = snap.docs.map((d) => d.data().followedUid as string)
          globalFollowingLoaded = true
          globalFollowingIds.forEach((uid) => globalFollowState.set(uid, true))
          setFollowingIds([...globalFollowingIds])
          setLoaded(true)
          notifyFollowListeners()
        }, () => setLoaded(true))
      })
    })

    return () => { cancelled = true; unsub?.() }
  }, [userDoc])

  return { followingIds, loaded }
}
