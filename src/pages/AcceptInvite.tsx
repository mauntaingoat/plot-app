/**
 * AcceptInvite — landing page for /invite/:token.
 *
 * Three states:
 *   1) loading — fetch the invite doc to read org name + expiry
 *   2) unauthenticated — show org name + "Sign in / sign up" CTA. The
 *      sign-in flow (auth modal) returns the user here after success.
 *   3) authenticated — show "Accept" button → calls
 *      redeemOrganizationInvite callable → on success, navigates to
 *      /dashboard with a success toast (or to the verify page if the
 *      account is unverified).
 *
 * Failure modes (invite expired / already redeemed / email mismatch /
 * already in another org / no seats) all render an inline explanatory
 * panel — no automatic retry, just a message + a way out.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { db } from '@/config/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useAuthStore } from '@/stores/authStore'
import { useAuthModalStore } from '@/stores/authModalStore'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/config/firebase'

interface InviteData {
  organizationId: string
  organizationName: string
  email: string
  status: 'pending' | 'redeemed' | 'expired' | 'revoked'
  expiresAt?: { toMillis(): number } | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'invite_not_found' }
  | { kind: 'expired'; orgName: string }
  | { kind: 'revoked'; orgName: string }
  | { kind: 'already_redeemed'; orgName: string }
  | { kind: 'ready'; orgName: string; email: string }

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const userDoc = useAuthStore((s) => s.userDoc)
  const openAuth = useAuthModalStore((s) => s.open)

  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState(false)

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invite_not_found' })
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        if (!db) {
          setState({ kind: 'invite_not_found' })
          return
        }
        const snap = await getDoc(doc(db, 'organizationInvites', token))
        if (cancelled) return
        if (!snap.exists()) {
          setState({ kind: 'invite_not_found' })
          return
        }
        const data = snap.data() as InviteData
        const orgName = data.organizationName || 'Unnamed organization'
        if (data.status === 'redeemed') {
          setState({ kind: 'already_redeemed', orgName })
          return
        }
        if (data.status === 'revoked') {
          setState({ kind: 'revoked', orgName })
          return
        }
        const expiresAtMs = data.expiresAt?.toMillis?.() ?? 0
        if (data.status === 'expired' || (expiresAtMs > 0 && expiresAtMs < Date.now())) {
          setState({ kind: 'expired', orgName })
          return
        }
        setState({ kind: 'ready', orgName, email: data.email })
      } catch (e) {
        // Permission denied probably means the doc doesn't exist —
        // surface as not-found rather than a scary error.
        console.warn('AcceptInvite fetch failed', e)
        if (!cancelled) setState({ kind: 'invite_not_found' })
      }
    })()
    return () => { cancelled = true }
  }, [token])

  // Email-match preflight: if the user is signed in but their email
  // doesn't match the invite, show a clear "wrong account" message
  // BEFORE they click Accept — saves a server roundtrip + makes the
  // recovery action obvious.
  const wrongAccount = useMemo(() => {
    if (state.kind !== 'ready') return false
    if (!firebaseUser?.email) return false
    return firebaseUser.email.toLowerCase() !== state.email.toLowerCase()
  }, [state, firebaseUser?.email])

  const alreadyInOrg = useMemo(() => {
    if (state.kind !== 'ready') return false
    return !!userDoc?.organizationId
  }, [state, userDoc?.organizationId])

  const handleAccept = async () => {
    if (state.kind !== 'ready' || !token) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const functions = getFunctions(app ?? undefined)
      const fn = httpsCallable<{ token: string }, { ok: boolean; organizationId: string }>(
        functions,
        'redeemOrganizationInvite'
      )
      await fn({ token })
      setRedeemed(true)
      // Give a moment for the success state to render before bouncing.
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch (e) {
      const err = e as { message?: string; details?: { message?: string } }
      setErrorMsg(err?.details?.message || err?.message || 'Could not accept invite. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MarketingLayout>
      <SEOHead
        title="Team invite"
        description="Accept your invite to join a Reelst team plan."
        path="/invite"
      />
      <div className="bg-marketing min-h-[80vh] flex items-center justify-center px-5 py-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[480px] bg-white rounded-[24px] p-8 md:p-10"
          style={{
            border: '1px solid rgba(255,133,82,0.22)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.85) inset, 0 30px 80px -30px rgba(217,74,31,0.20), 0 10px 32px -16px rgba(10,14,23,0.08)',
          }}
        >
          {/* Loading skeleton */}
          {state.kind === 'loading' && (
            <div className="py-8 text-center">
              <div className="inline-block w-8 h-8 rounded-full border-2 border-tangerine border-t-transparent animate-spin" />
              <p className="mt-4 text-smoke" style={{ fontFamily: 'var(--font-humanist)', fontSize: 13.5 }}>
                Looking up your invite…
              </p>
            </div>
          )}

          {/* Failure states */}
          {(state.kind === 'invite_not_found'
            || state.kind === 'expired'
            || state.kind === 'revoked'
            || state.kind === 'already_redeemed') && (
            <div>
              <div className="w-12 h-12 rounded-full bg-tangerine/10 flex items-center justify-center mb-5">
                <WarningCircle size={22} weight="bold" className="text-tangerine" />
              </div>
              <h1
                className="text-ink mb-3"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: '1.7rem',
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.1,
                }}
              >
                {state.kind === 'invite_not_found' && 'Invite not found'}
                {state.kind === 'expired' && 'Invite expired'}
                {state.kind === 'revoked' && 'Invite revoked'}
                {state.kind === 'already_redeemed' && 'Invite already used'}
              </h1>
              <p
                className="text-graphite"
                style={{ fontFamily: 'var(--font-humanist)', fontSize: 14.5, lineHeight: 1.55 }}
              >
                {state.kind === 'invite_not_found' && (
                  <>The link you used isn't valid. Double-check the URL or ask the brokerage owner to resend.</>
                )}
                {state.kind === 'expired' && (
                  <>Your invite to <strong className="text-ink">{state.orgName}</strong> has expired. Ask them to send a fresh one.</>
                )}
                {state.kind === 'revoked' && (
                  <>The invite to <strong className="text-ink">{state.orgName}</strong> was withdrawn. Contact them if this seems wrong.</>
                )}
                {state.kind === 'already_redeemed' && (
                  <>This invite to <strong className="text-ink">{state.orgName}</strong> has already been accepted. Sign in to your dashboard to see your status.</>
                )}
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 mt-6 text-tangerine font-semibold"
                style={{ fontFamily: 'var(--font-humanist)', fontSize: 14 }}
              >
                Back to Reelst <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          )}

          {/* Ready state — success after redeem, or pending */}
          {state.kind === 'ready' && (
            <>
              {redeemed ? (
                <div className="py-2">
                  <div className="w-14 h-14 rounded-full bg-sold-green/10 flex items-center justify-center mb-5">
                    <CheckCircle size={26} weight="fill" className="text-sold-green" />
                  </div>
                  <h1
                    className="text-ink mb-3"
                    style={{
                      fontFamily: 'var(--font-humanist)',
                      fontSize: '1.7rem',
                      fontWeight: 500,
                      letterSpacing: '-0.025em',
                      lineHeight: 1.1,
                    }}
                  >
                    You're in.
                  </h1>
                  <p
                    className="text-graphite"
                    style={{ fontFamily: 'var(--font-humanist)', fontSize: 14.5, lineHeight: 1.55 }}
                  >
                    Welcome to {state.orgName}. Taking you to your dashboard…
                  </p>
                </div>
              ) : (
                <>
                  <p
                    className="text-tangerine mb-3"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Team invite
                  </p>
                  <h1
                    className="text-ink mb-3"
                    style={{
                      fontFamily: 'var(--font-humanist)',
                      fontSize: 'clamp(1.7rem, 3.6vw, 2.2rem)',
                      fontWeight: 500,
                      letterSpacing: '-0.03em',
                      lineHeight: 1.05,
                    }}
                  >
                    Join{' '}
                    <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                      {state.orgName}
                    </span>{' '}
                    on Reelst.
                  </h1>
                  <p
                    className="text-graphite mb-6"
                    style={{ fontFamily: 'var(--font-humanist)', fontSize: 14.5, lineHeight: 1.6 }}
                  >
                    They've reserved a Pro seat for{' '}
                    <strong className="text-ink">{state.email}</strong>. Your profile stays yours — pins, content, leads, inbox.
                    They cover the bill.
                  </p>

                  {/* Wrong-account block — the signed-in user's email doesn't match
                      the invite. Tell them clearly + give them a sign-out path. */}
                  {wrongAccount && firebaseUser && (
                    <div
                      className="rounded-xl px-4 py-3 mb-5"
                      style={{
                        background: 'rgba(217,74,31,0.06)',
                        border: '1px solid rgba(217,74,31,0.18)',
                      }}
                    >
                      <p className="text-ink mb-1" style={{ fontFamily: 'var(--font-humanist)', fontSize: 13, fontWeight: 600 }}>
                        Signed in as the wrong account
                      </p>
                      <p className="text-graphite" style={{ fontFamily: 'var(--font-humanist)', fontSize: 13, lineHeight: 1.5 }}>
                        This invite is for <strong>{state.email}</strong>, but you're signed in as <strong>{firebaseUser.email}</strong>. Sign out and accept again from the right account.
                      </p>
                    </div>
                  )}

                  {/* Already-in-an-org block */}
                  {alreadyInOrg && (
                    <div
                      className="rounded-xl px-4 py-3 mb-5"
                      style={{
                        background: 'rgba(217,74,31,0.06)',
                        border: '1px solid rgba(217,74,31,0.18)',
                      }}
                    >
                      <p className="text-ink mb-1" style={{ fontFamily: 'var(--font-humanist)', fontSize: 13, fontWeight: 600 }}>
                        Already in an organization
                      </p>
                      <p className="text-graphite" style={{ fontFamily: 'var(--font-humanist)', fontSize: 13, lineHeight: 1.5 }}>
                        Leave your current org from Dashboard → Team before accepting this invite.
                      </p>
                    </div>
                  )}

                  {errorMsg && (
                    <div
                      className="rounded-xl px-4 py-3 mb-5"
                      style={{
                        background: 'rgba(217,74,31,0.06)',
                        border: '1px solid rgba(217,74,31,0.18)',
                      }}
                    >
                      <p className="text-graphite" style={{ fontFamily: 'var(--font-humanist)', fontSize: 13, lineHeight: 1.5 }}>
                        {errorMsg}
                      </p>
                    </div>
                  )}

                  {!firebaseUser ? (
                    <button
                      onClick={() => openAuth('login')}
                      className="brand-btn-flat w-full py-3.5 text-[14.5px] font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      style={{ fontFamily: 'var(--font-humanist)' }}
                    >
                      Sign in to accept <ArrowRight size={15} weight="bold" />
                    </button>
                  ) : wrongAccount ? null : alreadyInOrg ? null : (
                    <button
                      onClick={handleAccept}
                      disabled={submitting}
                      className="brand-btn-flat w-full py-3.5 text-[14.5px] font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      style={{ fontFamily: 'var(--font-humanist)' }}
                    >
                      {submitting ? 'Joining…' : <>Accept invite <ArrowRight size={15} weight="bold" /></>}
                    </button>
                  )}

                  <p
                    className="text-smoke text-center mt-4"
                    style={{ fontFamily: 'var(--font-humanist)', fontSize: 11.5, lineHeight: 1.5 }}
                  >
                    By accepting, your account flips to Pro under {state.orgName}'s billing. Either of you can release the seat anytime.
                  </p>
                </>
              )}
            </>
          )}
        </motion.div>
      </div>
    </MarketingLayout>
  )
}
