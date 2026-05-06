import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Envelope as Mail, CheckCircle, ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useScrollLock } from '@/hooks/useScrollLock'
import { sendPasswordResetEmail } from '@/lib/emailVerification'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  /** Email pre-fill from the sign-in form if the user typed one. */
  initialEmail?: string
}

export function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }: ForgotPasswordModalProps) {
  useScrollLock(isOpen)
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    const clean = email.trim().toLowerCase()
    if (!clean) { setError('Enter your email'); return }
    setLoading(true); setError('')
    try {
      await sendPasswordResetEmail(clean)
      setSent(true)
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code || ''
      if (code === 'functions/not-found') setError('No account found with that email')
      else if (code === 'functions/invalid-argument') setError('Invalid email')
      else setError('Could not send the reset email — try again in a moment')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    // Reset success state on next open so a re-open shows the form again.
    setTimeout(() => { setSent(false); setError(''); setEmail(initialEmail) }, 200)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-ink/40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-32px)] max-w-[440px] bg-warm-white rounded-[22px] shadow-2xl overflow-hidden"
            style={{ fontFamily: 'var(--font-humanist)' }}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="text-[18px] font-semibold text-ink tracking-tight">
                {sent ? 'Check your email' : 'Forgot password?'}
              </h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-cream flex items-center justify-center cursor-pointer hover:bg-pearl transition-colors"
                aria-label="Close"
              >
                <X size={15} className="text-graphite" />
              </button>
            </div>

            {sent ? (
              <div className="px-6 pb-6">
                <div className="flex items-start gap-3 bg-tangerine/5 border border-tangerine/15 rounded-[14px] p-4 mb-5">
                  <CheckCircle weight="fill" size={20} className="text-tangerine shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink">Reset link sent</p>
                    <p className="text-[12.5px] text-graphite mt-0.5 leading-relaxed">
                      We sent a link to <span className="font-semibold text-ink">{email}</span>. Tap it to set a new password. The link expires in an hour.
                    </p>
                  </div>
                </div>
                <p className="text-[12px] text-smoke mb-4 leading-relaxed">
                  Didn't get it? Check your spam folder, or wait a minute and try again.
                </p>
                <Button variant="primary" size="md" fullWidth onClick={handleClose}>
                  Done
                </Button>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
                className="px-6 pb-6 space-y-4"
              >
                <p className="text-[13.5px] text-graphite leading-relaxed">
                  Enter the email on your account and we'll send you a link to reset your password.
                </p>
                <Input
                  placeholder="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail size={16} />}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="email"
                  inputMode="email"
                  autoFocus
                />
                {error && <p className="text-[12px] text-live-red">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="brand-btn brand-btn--no-tilt w-full h-12 px-6 rounded-full text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: 'var(--font-humanist)',
                    fontWeight: 600,
                    boxShadow: '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
                  }}
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Send reset link <ArrowRight weight="bold" size={16} /></>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
