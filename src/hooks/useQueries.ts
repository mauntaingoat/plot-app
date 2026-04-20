import { useQuery } from '@tanstack/react-query'
import { firebaseConfigured } from '@/config/firebase'
import { getUserByUsername, getAgentPins } from '@/lib/firestore'
import type { UserDoc, Pin } from '@/lib/types'

export function useAgent(username: string | undefined) {
  return useQuery<UserDoc | null>({
    queryKey: ['agent', username],
    queryFn: async () => {
      if (!username) return null

      // Try Firebase with timeout
      if (firebaseConfigured) {
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
        return Promise.race([getUserByUsername(username).catch(() => null), timeout])
      }

      return null
    },
    enabled: !!username,
  })
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
