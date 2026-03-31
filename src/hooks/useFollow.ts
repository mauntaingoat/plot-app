import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc, deleteDoc, increment, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useAuthStore } from '@/stores/authStore'

export function useFollow(targetUid: string | null) {
  const { firebaseUser } = useAuthStore()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  const followDocId = firebaseUser && targetUid ? `${firebaseUser.uid}_${targetUid}` : null

  useEffect(() => {
    if (!followDocId) {
      setIsFollowing(false)
      return
    }

    getDoc(doc(db, 'follows', followDocId)).then((snap) => {
      setIsFollowing(snap.exists())
    })
  }, [followDocId])

  const toggle = useCallback(async () => {
    if (!firebaseUser || !targetUid || !followDocId) return false // needs auth
    setLoading(true)

    try {
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', followDocId))
        await updateDoc(doc(db, 'users', targetUid), { followerCount: increment(-1) })
        await updateDoc(doc(db, 'users', firebaseUser.uid), { followingCount: increment(-1) })
        setIsFollowing(false)
      } else {
        await setDoc(doc(db, 'follows', followDocId), {
          followerUid: firebaseUser.uid,
          followedUid: targetUid,
          createdAt: serverTimestamp(),
        })
        await updateDoc(doc(db, 'users', targetUid), { followerCount: increment(1) })
        await updateDoc(doc(db, 'users', firebaseUser.uid), { followingCount: increment(1) })
        setIsFollowing(true)
      }
    } finally {
      setLoading(false)
    }

    return true
  }, [firebaseUser, targetUid, followDocId, isFollowing])

  return { isFollowing, loading, toggle, needsAuth: !firebaseUser }
}
