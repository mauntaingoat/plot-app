import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Lock, ArrowRight, Warning, Eye, EyeSlash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ReelstLogo } from '@/components/ui/ReelstLogo'
import { auth, firebaseConfigured } from '@/config/firebase'
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth'

/**
 * Lands here from a Firebase auth action URL: /auth/action?mode=...&oobCode=...
 *
 * Two modes are handled:
 *   - verifyEmail: applies the code, mirrors emailVerified to the user
 *     doc via the Verify page's existing flow (we just redirect to
 *     continueUrl which is /dashboard).
 *   - resetPassword: shows a new-password form, calls confirmPasswordReset,
 *     redirects to /sign-in.
 *
 * For this page to receive the link, Firebase Console → Authentication →
 * Templates → Customize action URL must point here. Otherwise links use
 * Firebase's default hosted UI.
 */

type Mode = 'verifyEmail' | 'resetPassword' | 'unknown'

export default function AuthAction() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const rawMode = params.get('mode')
  const oobCode = params.get('oobCode') || ''
  const continueUrl = params.get('continueUrl') || ''

  const mode: Mode =
    rawMode === 'verifyEmail' ? 'verifyEmail'
    : rawMode === 'resetPassword' ? 'resetPassword'
    : 'unknown'

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4 py-10" style={{ fontFamily: 'var(--font-humanist)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-[440px] bg-warm-white rounded-[22px] shadow-sm border border-border-light p-7"
      >
        <Link to="/" className="mb-6 inline-block">
          <ReelstLogo size="sm" />
        </Link>

        {mode === 'verifyEmail' && (
          <VerifyEmailFlow oobCode={oobCode} continueUrl={continueUrl} onDone={() => navigate(continueUrl ? safePath(continueUrl) : '/dashboard')} />
        )}
        {mode === 'resetPassword' && (
          <ResetPasswordFlow oobCode={oobCode} onDone={() => navigate('/sign-in')} />
        )}
        {mode === 'unknown' && (
          <ErrorBlock
            title="That link isn't valid"
            body="The link you used wasn't a Reelst auth link. Try signing in or requesting a new email."
          />
        )}
      </motion.div>
    </div>
  )
}

/* ─────────────── Verify email ─────────────── */

function VerifyEmailFlow({ oobCode, continueUrl, onDone }: { oobCode: string; continueUrl: string; onDone: () => void }) {
  const [state, setState] = useState<'pending' | 'success' | 'error'>('pending')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!firebaseConfigured || !auth || !oobCode) {
      setState('error'); setErrorMsg('Missing verification code'); return
    }
    let cancelled = false
    ;(async () => {
      try {
        await checkActionCode(auth!, oobCode)
        await applyActionCode(auth!, oobCode)
        if (!cancelled) setState('success')
      } catch (e: unknown) {
        if (cancelled) return
        const code = (e as { code?: string })?.code || ''
        setState('error')
        if (code === 'auth/expired-action-code') setErrorMsg('This link expired. Request a new verification email from your dashboard.')
        else if (code === 'auth/invalid-action-code') setErrorMsg('This link was already used or is no longer valid.')
        else setErrorMsg('We couldn\'t verify your email. Try requesting a new link.')
      }
    })()
    return () => { cancelled = true }
  }, [oobCode])

  if (state === 'pending') {
    return (
      <div className="text-center py-8">
        <span className="inline-block w-7 h-7 border-2 border-tangerine border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[14px] text-graphite">Confirming your email…</p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-tangerine/15 items-center justify-center mb-4">
          <CheckCircle weight="fill" size={28} className="text-tangerine" />
        </div>
        <h1 className="text-[22px] font-semibold text-ink tracking-tight mb-1">Email verified</h1>
        <p className="text-[14px] text-graphite mb-6 leading-relaxed">
          You're all set. Your Reelst dashboard is ready.
        </p>
        <button
          onClick={onDone}
          className="brand-btn brand-btn--no-tilt w-full h-12 px-6 rounded-full text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontWeight: 600,
            boxShadow: '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
          }}
        >
          Continue to dashboard <ArrowRight weight="bold" size={16} />
        </button>
        {continueUrl && (
          <p className="text-[11.5px] text-smoke mt-3">Redirecting to {prettyDomain(continueUrl)}</p>
        )}
      </div>
    )
  }

  return <ErrorBlock title="Couldn't verify" body={errorMsg} />
}

/* ─────────────── Reset password ─────────────── */

function ResetPasswordFlow({ oobCode, onDone }: { oobCode: string; onDone: () => void }) {
  const [state, setState] = useState<'checking' | 'form' | 'success' | 'error'>('checking')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!firebaseConfigured || !auth || !oobCode) {
      setState('error'); setErrorMsg('Missing reset code'); return
    }
    let cancelled = false
    ;(async () => {
      try {
        const e = await verifyPasswordResetCode(auth!, oobCode)
        if (cancelled) return
        setEmail(e); setState('form')
      } catch (e: unknown) {
        if (cancelled) return
        const code = (e as { code?: string })?.code || ''
        setState('error')
        if (code === 'auth/expired-action-code') setErrorMsg('This reset link expired. Request a new one from sign-in.')
        else if (code === 'auth/invalid-action-code') setErrorMsg('This link was already used or is no longer valid.')
        else setErrorMsg('We couldn\'t verify the reset code.')
      }
    })()
    return () => { cancelled = true }
  }, [oobCode])

  const handleSubmit = async () => {
    setErrorMsg('')
    if (pw.length < 8) { setErrorMsg('Use at least 8 characters'); return }
    if (pw !== pw2) { setErrorMsg('Passwords don\'t match'); return }
    setSubmitting(true)
    try {
      await confirmPasswordReset(auth!, oobCode, pw)
      setState('success')
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code || ''
      if (code === 'auth/weak-password') setErrorMsg('Password too weak — try a longer one')
      else setErrorMsg('Could not reset password — try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (state === 'checking') {
    return (
      <div className="text-center py-8">
        <span className="inline-block w-7 h-7 border-2 border-tangerine border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[14px] text-graphite">Checking reset link…</p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-tangerine/15 items-center justify-center mb-4">
          <CheckCircle weight="fill" size={28} className="text-tangerine" />
        </div>
        <h1 className="text-[22px] font-semibold text-ink tracking-tight mb-1">Password reset</h1>
        <p className="text-[14px] text-graphite mb-6 leading-relaxed">
          Sign in with your new password.
        </p>
        <button
          onClick={onDone}
          className="brand-btn brand-btn--no-tilt w-full h-12 px-6 rounded-full text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontWeight: 600,
            boxShadow: '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
          }}
        >
          Sign in <ArrowRight weight="bold" size={16} />
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return <ErrorBlock title="Couldn't reset password" body={errorMsg} />
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
      <h1 className="text-[22px] font-semibold text-ink tracking-tight mb-1">Choose a new password</h1>
      <p className="text-[13.5px] text-graphite mb-5 leading-relaxed">
        For <span className="font-semibold text-ink">{email}</span>
      </p>

      <div className="space-y-3">
        <div className="relative">
          <Input
            placeholder="New password"
            type={showPw ? 'text' : 'password'}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            icon={<Lock size={16} />}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="new-password"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-smoke hover:text-graphite cursor-pointer"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeSlash size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <Input
          placeholder="Confirm new password"
          type={showPw ? 'text' : 'password'}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          icon={<Lock size={16} />}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="new-password"
        />
        {errorMsg && <p className="text-[12px] text-live-red">{errorMsg}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="brand-btn brand-btn--no-tilt w-full h-12 px-6 rounded-full text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontWeight: 600,
            boxShadow: '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
          }}
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>Set new password <ArrowRight weight="bold" size={16} /></>
          )}
        </button>
      </div>
    </form>
  )
}

/* ─────────────── Shared error UI ─────────────── */

function ErrorBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex w-12 h-12 rounded-full bg-live-red/12 items-center justify-center mb-4">
        <Warning weight="fill" size={26} className="text-live-red" />
      </div>
      <h1 className="text-[20px] font-semibold text-ink tracking-tight mb-1">{title}</h1>
      <p className="text-[13.5px] text-graphite mb-5 leading-relaxed">{body}</p>
      <Link
        to="/sign-in"
        className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full bg-cream text-ink text-[14px] font-semibold hover:bg-pearl transition-colors"
      >
        Back to sign in
      </Link>
    </div>
  )
}

/* ─────────────── helpers ─────────────── */

// Only follow continueUrl if it's same-origin; otherwise drop to /dashboard
// to avoid open-redirect.
function safePath(url: string): string {
  try {
    const u = new URL(url, window.location.origin)
    if (u.origin === window.location.origin) return u.pathname + u.search + u.hash
    return '/dashboard'
  } catch {
    return '/dashboard'
  }
}

function prettyDomain(url: string): string {
  try { return new URL(url).host } catch { return url }
}
