import { sendEmailVerification, type ActionCodeSettings, type User } from 'firebase/auth'

/**
 * Send the Firebase email-verification email with a `continueUrl` that
 * drops the user back on /dashboard once they click the link. The
 * dashboard's verification check then sees `emailVerified === true` and
 * lets them through (instead of bouncing them to /verify).
 *
 * Firebase requires the continueUrl's domain to be in the Firebase
 * Console → Authentication → Settings → Authorized domains list.
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://reelst.co'
  const settings: ActionCodeSettings = {
    url: `${origin}/dashboard`,
    handleCodeInApp: false,
  }
  await sendEmailVerification(user, settings)
}

/** Time the cleanup cron will reclaim a user's username + email +
 *  license unless they verify in the meantime. Six hours from now. */
export function verificationDeadline(): Date {
  return new Date(Date.now() + 6 * 60 * 60 * 1000)
}
