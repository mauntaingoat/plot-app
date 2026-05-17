import { useAuthStore } from '@/stores/authStore'

/**
 * Returns where a "Sign in" / "Sign up" / "Claim your Reelst" CTA
 * should route based on the user's current auth state.
 *
 *   not signed in       → `notSignedInPath` (caller's default)
 *   signed in, mid-onboarding → '/welcome' (resume onboarding)
 *   signed in, onboarded     → '/dashboard'
 *
 * Use this everywhere a marketing/footer/landing CTA points at
 * /sign-in, /sign-up, or /welcome so signed-in users never get sent
 * back through an auth flow.
 */
export function useAuthedDestination(notSignedInPath: string): string {
  const { userDoc } = useAuthStore()
  if (!userDoc) return notSignedInPath
  if (!userDoc.onboardingComplete) return '/welcome'
  return '/dashboard'
}
