import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { firebaseConfigured, db } from '@/config/firebase'
import { getUserByUsername, getAgentPins } from '@/lib/firestore'
import { doc, onSnapshot } from 'firebase/firestore'
import type { UserDoc, Pin } from '@/lib/types'

export function useAgent(username: string | undefined) {
  const [liveAgent, setLiveAgent] = useState<UserDoc | null>(null)

  const { data: fetchedAgent = null, isLoading } = useQuery<UserDoc | null>({
    queryKey: ['agent', username],
    queryFn: async () => {
      if (!username) return null
      if (firebaseConfigured) {
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
        return Promise.race([getUserByUsername(username).catch(() => null), timeout])
      }
      return null
    },
    enabled: !!username,
  })

  // Real-time listener for the agent doc — keeps followerCount etc. live
  useEffect(() => {
    if (!fetchedAgent?.uid || !db) return
    const unsub = onSnapshot(
      doc(db, 'users', fetchedAgent.uid),
      (snap) => {
        if (snap.exists()) setLiveAgent({ uid: snap.id, ...snap.data() } as UserDoc)
      },
      () => {},
    )
    return unsub
  }, [fetchedAgent?.uid])

  return { data: liveAgent || fetchedAgent, isLoading }
}

export function useAgentPins(agent: UserDoc | null | undefined) {
  return useQuery<Pin[]>({
    queryKey: ['agentPins', agent?.uid],
    queryFn: async () => {
      if (!agent) return []
      if (firebaseConfigured) {
        return getAgentPins(agent.uid).catch(() => [])
      }
      return []
    },
    enabled: !!agent,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })
}
