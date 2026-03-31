import { create } from 'zustand'
import type { User } from 'firebase/auth'
import type { UserDoc } from '@/lib/types'

interface AuthState {
  firebaseUser: User | null
  userDoc: UserDoc | null
  loading: boolean
  initialized: boolean

  setFirebaseUser: (user: User | null) => void
  setUserDoc: (doc: UserDoc | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  userDoc: null,
  loading: true,
  initialized: false,

  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setUserDoc: (userDoc) => set({ userDoc }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set({ firebaseUser: null, userDoc: null, loading: false }),
}))
