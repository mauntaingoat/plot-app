import { useEffect, useState } from 'react'
import { subscribeAgentPins } from './firestoreDb'
import { currentUser } from './firebaseAuth'
import type { Pin } from '../types'

/**
 * Hook: live subscription to the current agent's pins.
 * Mirrors the web `useAgentPins` hook. Returns { pins, loading, error }.
 */
export function usePins() {
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    const user = currentUser()
    if (!user) {
      setPins([])
      setLoading(false)
      return
    }
    const unsub = subscribeAgentPins(
      user.uid,
      (next) => {
        setPins(next)
        setLoading(false)
      },
      (e) => {
        setError(e)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  return { pins, loading, error }
}
