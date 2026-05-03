import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, X, Envelope as Mail, Check, Sparkle as Sparkles } from '@phosphor-icons/react'
import { subscribeToAgentDigest } from '@/lib/firestore'
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss'
import { useSheetLifecycle } from '@/hooks/useSheetLifecycle'

/* ════════════════════════════════════════════════════════════════
   SAVE AGENT MODAL — email-only digest signup
   ────────────────────────────────────────────────────────────────
   Opens when the buyer taps "Save Maya". One field (email), a
   warm explainer above it, and a confirmation state on success.
   No account creation. Phase 1 just persists to Firestore + fires
   an inbox notification on the agent's dashboard. Phase 2 ships
   the actual weekly digest.
   ──────────────────────────────────────────────────────────────── */

interface SaveAgentModalProps {
  isOpen: boolean
  onClose: () => void
  agentId: string
  agentName: string
  agentPhotoURL?: string | null
  /** Where the save originated — drives subscription `source` field
   *  for funnel attribution later. */
  source?: 'profile' | 'listing' | 'reels'
  /** Called after a successful subscription so the parent can flip
   *  the SaveAgentPill into its "Saved" state. */
  onSubscribed?: (email: string) => void
}

export function SaveAgentModal({
  isOpen,
  onClose,
  agentId,
  agentName,
  agentPhotoURL,
  source = 'profile',
  onSubscribed,
}: SaveAgentModalProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  // CSS data-visible lifecycle so swipe-to-dismiss (which mutates
  // transform) and the entry/exit animation share the same CSS
  // transitions — no flicker from competing motion + inline-style
  // transforms during dismissal.
  const { mounted, visible } = useSheetLifecycle(isOpen, 320)
  // Mobile only: scroll-aware swipe-down-to-dismiss. SaveAgentModal
  // has no inner scroll so we pass null for scrollRef — drag fires
  // from anywhere on the sheet. Active only while visible (don't
  // dismiss while the sheet is already animating away).
  useSwipeToDismiss(sheetRef, null, mounted && visible, () => onClose())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim()
    if (!isValidEmail(cleanEmail)) {
      setError('That email doesn\'t look right.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await subscribeToAgentDigest({ agentId, email: cleanEmail, source })
      setAlreadySubscribed(res.alreadyExisted)
      setSuccess(true)
      onSubscribed?.(cleanEmail)
    } catch (err: any) {
      console.warn('[SaveAgentModal] subscribe failed:', { code: err?.code, message: err?.message, details: err?.details, raw: err })
      const friendly = err?.code === 'functions/resource-exhausted'
        ? 'You\'ve already saved this agent recently.'
        : err?.code === 'functions/not-found'
        ? 'This agent isn\'t available anymore.'
        : err?.code === 'functions/invalid-argument'
        ? (err?.message || 'Please check your email.')
        : err?.code === 'functions/internal'
        ? 'Something went wrong on our end. Try again in a moment.'
        : err?.message || 'Something went wrong. Try again.'
      setError(friendly)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    onClose()
    // Keep the success state if the user closes after submit, but
    // reset on next reopen so they can subscribe with another email.
    setTimeout(() => {
      if (!isOpen) {
        setEmail('')
        setError(null)
        setSuccess(false)
        setAlreadySubscribed(false)
      }
    }, 300)
  }

  if (!mounted) return null

  return (
    <div
      data-visible={visible}
      className="sheet-stack fixed inset-0 z-[160] flex items-end md:items-center justify-center px-0 md:px-4"
    >
      {/* Scrim — fades independently from the sheet so swipe-down
          doesn't fight the scrim's own opacity transition. */}
      <div
        data-visible={visible}
        onClick={handleClose}
        className="sheet-scrim absolute inset-0"
      />
      <div
        ref={sheetRef}
        data-visible={visible}
        onClick={(e) => e.stopPropagation()}
        className="capture-sheet relative w-full md:max-w-[440px] rounded-t-[28px] md:rounded-[28px] overflow-hidden"
        style={{
          background: 'var(--page-canvas)',
          color: 'var(--text-primary)',
          boxShadow: '0 -20px 60px -16px rgba(10,14,23,0.35), 0 30px 80px -30px rgba(10,14,23,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          touchAction: 'pan-y',
        }}
      >
        {/* Drag handle — mobile only. Visual affordance for the
            swipe-down gesture; the actual drag listens on the
            whole sheet via useSwipeToDismiss. */}
        <div className="md:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-black/15" />
        </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream flex items-center justify-center text-ink hover:bg-pearl transition-colors cursor-pointer z-10"
            >
              <X size={15} />
            </button>

            <AnimatePresence mode="wait">
              {!success ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 md:px-8 pt-6 md:pt-8 pb-6 md:pb-8"
                >
                  {/* Hero motif */}
                  <div className="flex items-center gap-3 mb-5">
                    {agentPhotoURL ? (
                      <img src={agentPhotoURL} alt="" className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                      >
                        <Heart weight="fill" size={22} />
                      </div>
                    )}
                    <div className="flex-1">
                      <p
                        style={{
                          color: 'var(--accent)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Save Agent
                      </p>
                      <h2
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: '22px',
                          fontWeight: 600,
                          letterSpacing: '-0.025em',
                          lineHeight: 1.15,
                        }}
                      >
                        Stay in the loop with {agentName}.
                      </h2>
                    </div>
                  </div>

                  <p
                    className="mb-5"
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '14.5px',
                      fontWeight: 400,
                      lineHeight: 1.55,
                    }}
                  >
                    Drop your email and get a weekly digest of new listings,
                    reels, and updates from {agentName}. No account needed.
                    Unsubscribe anytime.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-smoke pointer-events-none"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null) }}
                        placeholder="you@example.com"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete="email"
                        inputMode="email"
                        className="w-full h-12 pl-11 pr-4 rounded-[14px] bg-cream border border-border-light text-[15px] text-ink placeholder:text-ash outline-none focus:border-tangerine/40 transition-colors"
                      />
                    </div>

                    {error && (
                      <p className="text-[12.5px] text-live-red px-1">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !email}
                      className="brand-btn-flat w-full h-12 rounded-full inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        boxShadow: '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
                      }}
                    >
                      {submitting ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Heart weight="fill" size={15} />
                          Save {agentName}
                        </>
                      )}
                    </button>
                  </form>

                  <p
                    className="mt-4 text-center"
                    style={{ color: 'var(--text-muted)', fontSize: '11.5px', fontWeight: 400 }}
                  >
                    By subscribing, you agree to receive emails from {agentName} via Reelst.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                  className="px-6 md:px-8 pt-10 md:pt-12 pb-8 md:pb-10 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.05, type: 'spring', stiffness: 420, damping: 22 }}
                    className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                    style={{
                      background: alreadySubscribed
                        ? 'linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)'
                        : 'linear-gradient(135deg, #34C759 0%, #1F8E3D 100%)',
                      boxShadow: alreadySubscribed
                        ? '0 12px 28px -10px rgba(217,74,31,0.5)'
                        : '0 12px 28px -10px rgba(52,199,89,0.5)',
                    }}
                  >
                    {alreadySubscribed
                      ? <Heart weight="fill" size={28} className="text-white" />
                      : <Check weight="bold" size={28} className="text-white" />}
                  </motion.div>

                  <h2
                    className="mb-2"
                    style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 600, letterSpacing: '-0.025em' }}
                  >
                    {alreadySubscribed ? "You're already subscribed." : "You're on the list."}
                  </h2>
                  <p
                    className="mb-6"
                    style={{ color: 'var(--text-secondary)', fontSize: '14.5px', fontWeight: 400, lineHeight: 1.55 }}
                  >
                    {alreadySubscribed
                      ? <>This email is already on {agentName}'s digest list. You'll get the next update when it goes out.</>
                      : <>We'll email you when {agentName} has fresh listings or reels. Look out for the first digest soon.</>}
                  </p>

                  <button
                    onClick={handleClose}
                    className="brand-btn-flat h-11 px-6 rounded-full inline-flex items-center gap-1.5 cursor-pointer"
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      boxShadow: '0 6px 18px -4px rgba(217,74,31,0.4), inset 0 1px 0 rgba(255,255,255,0.24)',
                    }}
                  >
                    <Sparkles weight="bold" size={14} />
                    Keep exploring
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
      </div>
    </div>
  )
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}
