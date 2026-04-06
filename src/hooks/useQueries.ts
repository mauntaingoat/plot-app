import { useQuery } from '@tanstack/react-query'
import { firebaseConfigured } from '@/config/firebase'
import { getUserByUsername, getAgentPins } from '@/lib/firestore'
import { getMockAgent, getMockPins } from '@/lib/mock'
import type { UserDoc, Pin } from '@/lib/types'

export function useAgent(username: string | undefined) {
  return useQuery<UserDoc | null>({
    queryKey: ['agent', username],
    queryFn: async () => {
      if (!username) return null

      // Check mock data first
      const mockAgent = getMockAgent(username)
      if (mockAgent) return mockAgent

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

      // Check mock data first
      const mockPins = getMockPins(agent.uid)
      if (mockPins.length > 0) return mockPins

      // Try Firebase
      if (firebaseConfigured) {
        return getAgentPins(agent.uid).catch(() => [])
      }

      return []
    },
    enabled: !!agent,
  })
}
