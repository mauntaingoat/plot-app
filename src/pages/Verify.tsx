import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Envelope as Mail, ArrowsClockwise as RefreshCw, SignOut as LogOut, Check, Warning as AlertTriangle } from '@phosphor-icons/react'
import { signOut } from 'firebase/auth'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/authStore'
import { auth, db } from '@/config/firebase'
import { sendVerificationEmail } from '@/lib/emailVerification'

/**
 * Email verification gate. Reachable from /verify when a signed-in
 * user lands anywhere `<RequireVerified>` protects without having
 * verified their email yet. Polls `firebaseUser.reload()` on focus and
 * every 5s; once `emailVerified` flips true, mirrors that to the user
 * doc (clearing `expiresAt` so the cleanup cron skips them) and
 * redirects to /dashboard.
 */
export default function Verify() {
  const navigate = useNavigate()
  const { firebaseUser, userDoc } = useAuthStore()
  const [resending, setResending] = useState(false)
  const [resentAt, setResentAt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  // Countdown — drives the "Xh Ym left" hint. Computed from the
  // user's expiresAt (set at signup to createdAt + 6h).
  useEffect(() => {
    const expiresAt = userDoc?.expiresAt?.toMillis?.()
    if (!expiresAt) { setRemaining(null); return }
    const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()))
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [userDoc?.expiresAt])

  // If we land here without a signed-in user, bounce to sign-in.
  useEffect(() => {
    if (!firebaseUser) navigate('/sign-in', { replace: true })
  }, [firebaseUser, navigate])

  // Polling: reload() pulls the latest emailVerified flag from
  // Firebase Auth. Fires on focus + every 5s while the page is open.
  const checkVerified = useCallback(async () => {
    if (!firebaseUser || !db) return
    try {
      await firebaseUser.reload()
      if (firebaseUser.emailVerified) {
        // Mirror to Firestore so:
        //   1. Public profile reads can gate on emailVerified server-side.
        //   2. Cleanup cron skips this user (expiresAt no longer matters).
        try {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            emailVerified: true,
            expiresAt: null,
            verifiedAt: serverTimestamp(),
          })
        } catch (err) {
          console.warn('[verify] mirror failed:', err)
        }
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      console.warn('[verify] reload failed:', err)
    }
  }, [firebaseUser, navigate])

  useEffect(() => {
    if (!firebaseUser) return
    if (firebaseUser.emailVerified) { void checkVerified(); return }
    const onFocus = () => { void checkVerified() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const id = window.setInterval(() => void checkVerified(), 5000)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      window.clearInterval(id)
    }
  }, [firebaseUser, checkVerified])

  const handleResend = async () => {
    if (!firebaseUser || resending) return
    setResending(true); setError(null)
    try {
      await sendVerificationEmail(firebaseUser)
      setResentAt(Date.now())
    } catch (err) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'auth/too-many-requests') {
        setError('Too many resend attempts — wait a minute and try again.')
      } else {
        setError(e.message || 'Failed to send the email.')
      }
    } finally {
      setResending(false)
    }
  }

  const handleSignOut = async () => {
    if (!auth) return
    await signOut(auth)
    navigate('/', { replace: true })
  }

  const remainingLabel = (() => {
    if (remaining === null) return null
    if (remaining <= 0) return 'Expired'
    const hours = Math.floor(remaining / (60 * 60 * 1000))
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
    if (hours > 0) return `${hours}h ${minutes}m left`
    return `${minutes}m left`
  })()

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-[440px] bg-warm-white rounded-[24px] p-7 shadow-xl border border-border-light text-center"
      >
        <div className="w-14 h-14 rounded-[16px] bg-tangerine/10 flex items-center justify-center mx-auto mb-5">
          <Mail size={26} className="text-tangerine" weight="bold" />
        </div>

        <h1 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">
          Verify your email
        </h1>
        <p className="text-[14px] text-graphite leading-snug mb-1.5">
          We sent a confirmation link to
        </p>
        <p className="text-[15px] font-bold text-ink mb-5 truncate">
          {firebaseUser?.email}
        </p>

        {remainingLabel && (
          <p className={`text-[12.5px] font-semibold mb-5 ${remaining && remaining < 60 * 60 * 1000 ? 'text-live-red' : 'text-smoke'}`}>
            {remainingLabel === 'Expired'
              ? 'This window has expired — sign up again.'
              : `${remainingLabel} to verify before your username is released`}
          </p>
        )}

        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full h-12 rounded-full bg-tangerine text-white font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-2.5"
        >
          {resending ? (
            <RefreshCw size={14} weight="bold" className="animate-spin" />
          ) : resentAt > 0 && Date.now() - resentAt < 4000 ? (
            <><Check size={14} weight="bold" /> Sent — check your inbox</>
          ) : (
            <><RefreshCw size={14} weight="bold" /> Resend email</>
          )}
        </button>

        <button
          onClick={handleSignOut}
          className="w-full h-11 rounded-full text-graphite font-semibold text-[13.5px] flex items-center justify-center gap-2 cursor-pointer hover:text-ink hover:bg-cream transition-colors"
        >
          <LogOut size={13} weight="bold" /> Sign out
        </button>

        {error && (
          <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-[10px] bg-live-red/10 text-left">
            <AlertTriangle size={13} className="text-live-red shrink-0 mt-0.5" weight="bold" />
            <p className="text-[12px] text-live-red font-medium">{error}</p>
          </div>
        )}

        <p className="text-[11.5px] text-ash mt-6 leading-relaxed">
          Didn't get it? Check your spam folder. The link in the email
          will bring you straight back here.
        </p>
      </motion.div>
    </div>
  )
}
