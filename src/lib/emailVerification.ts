import { app } from '@/config/firebase'

/**
 * Calls the sendAuthEmail Cloud Function, which generates the
 * Firebase action link, renders the branded HTML, and sends via
 * Workspace SMTP. We bypass Firebase Auth's built-in templated
 * emails because their default sender (noreply@<project>.firebaseapp.com)
 * lands in spam — see functions/src/sendAuthEmail.ts.
 */
async function callSendAuthEmail(kind: 'verify' | 'reset', email: string): Promise<{ ok: boolean }> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://reel.st'
  const continueUrl = kind === 'verify' ? `${origin}/dashboard` : `${origin}/sign-in`
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const functions = getFunctions(app ?? undefined)
  const fn = httpsCallable<
    { kind: 'verify' | 'reset'; email: string; continueUrl: string },
    { ok: boolean }
  >(functions, 'sendAuthEmail')
  const res = await fn({ kind, email, continueUrl })
  return res.data
}

export async function sendVerificationEmail(emailOrUser: string | { email: string | null }): Promise<void> {
  const email = typeof emailOrUser === 'string' ? emailOrUser : emailOrUser.email || ''
  if (!email) throw new Error('No email on user')
  await callSendAuthEmail('verify', email)
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  await callSendAuthEmail('reset', email)
}

/** Time the cleanup cron will reclaim a user's username + email +
 *  license unless they verify in the meantime. Six hours from now. */
export function verificationDeadline(): Date {
  return new Date(Date.now() + 6 * 60 * 60 * 1000)
}
