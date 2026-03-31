import { create } from 'zustand'
import type { AgentType, Platform } from '@/lib/types'

export const ONBOARDING_STEPS = [
  'username',
  'auth',
  'role',
  'platforms',
  'links',
  'profile',
  'first-pin',
  'complete',
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

interface OnboardingState {
  isOpen: boolean
  currentStep: number
  direction: 1 | -1

  // Form data
  username: string
  usernameAvailable: boolean | null
  email: string
  password: string
  agentType: AgentType | null
  selectedPlatforms: string[]
  platformLinks: Record<string, string>
  licenseState: string
  licenseNumber: string
  displayName: string
  bio: string
  photoFile: File | null
  photoPreview: string | null

  // Actions
  open: () => void
  close: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  setUsername: (username: string) => void
  setUsernameAvailable: (available: boolean | null) => void
  setEmail: (email: string) => void
  setPassword: (password: string) => void
  setAgentType: (type: AgentType | null) => void
  togglePlatform: (platform: string) => void
  setPlatformLink: (platform: string, link: string) => void
  setLicenseState: (state: string) => void
  setLicenseNumber: (number: string) => void
  setDisplayName: (name: string) => void
  setBio: (bio: string) => void
  setPhotoFile: (file: File | null) => void
  setPhotoPreview: (url: string | null) => void
  reset: () => void
}

const initialState = {
  isOpen: false,
  currentStep: 0,
  direction: 1 as const,
  username: '',
  usernameAvailable: null,
  email: '',
  password: '',
  agentType: null,
  selectedPlatforms: [] as string[],
  platformLinks: {} as Record<string, string>,
  licenseState: '',
  licenseNumber: '',
  displayName: '',
  bio: '',
  photoFile: null,
  photoPreview: null,
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, ONBOARDING_STEPS.length - 1), direction: 1 })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0), direction: -1 })),
  goToStep: (step) => set((s) => ({ currentStep: step, direction: step > s.currentStep ? 1 : -1 })),
  setUsername: (username) => set({ username }),
  setUsernameAvailable: (usernameAvailable) => set({ usernameAvailable }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setAgentType: (agentType) => set({ agentType }),
  togglePlatform: (platform) => set((s) => ({
    selectedPlatforms: s.selectedPlatforms.includes(platform)
      ? s.selectedPlatforms.filter((p) => p !== platform)
      : s.selectedPlatforms.length < 5
        ? [...s.selectedPlatforms, platform]
        : s.selectedPlatforms,
  })),
  setPlatformLink: (platform, link) => set((s) => ({
    platformLinks: { ...s.platformLinks, [platform]: link },
  })),
  setLicenseState: (licenseState) => set({ licenseState }),
  setLicenseNumber: (licenseNumber) => set({ licenseNumber }),
  setDisplayName: (displayName) => set({ displayName }),
  setBio: (bio) => set({ bio }),
  setPhotoFile: (photoFile) => set({ photoFile }),
  setPhotoPreview: (photoPreview) => set({ photoPreview }),
  reset: () => set(initialState),
}))
