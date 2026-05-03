import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HandWaving as Hand, X, Envelope as Mail, User, Phone, Check, ChatCircle as MessageCircle } from '@phosphor-icons/react'
import { createWave } from '@/lib/firestore'
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss'
import { useSheetLifecycle } from '@/hooks/useSheetLifecycle'

/* ════════════════════════════════════════════════════════════════
   WAVE MODAL — buyer's question on a listing
   ────────────────────────────────────────────────────────────────
   Replaces the public comment system. A wave captures name + email
   (+ optional phone) + question, lands in the agent's dashboard
   inbox as a new notification type, and the agent responds via
   the captured email/phone externally — Reelst stays out of being
   a messaging platform.
   ──────────────────────────────────────────────────────────────── */

interface WaveModalProps {
  isOpen: boolean
  onClose: () => void
  pinId: string
  pinAddress: string
  agentId: string
  agentName?: string
}

export function WaveModal({ isOpen, onClose, pinId, pinAddress, agentId, agentName }: WaveModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [question, setQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const { mounted, visible } = useSheetLifecycle(isOpen, 320)
  useSwipeToDismiss(sheetRef, null, mounted && visible, () => onClose())

  const canSubmit = name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && question.trim().length >= 4

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) {
      setError('Fill in your name, email, and a quick question.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createWave({
        pinId,
        agentId,
        pinAddress,
        visitorName: name,
        visitorEmail: email,
        visitorPhone: phone || undefined,
        question,
      })
      setSuccess(true)
    } catch (err: any) {
      console.warn('[WaveModal] createWave failed:', { code: err?.code, message: err?.message, details: err?.details, raw: err })
      const friendly = err?.code === 'functions/resource-exhausted'
        ? 'Slow down a sec — too many waves recently.'
        : err?.code === 'functions/not-found'
        ? 'This listing isn\'t available anymore.'
        : err?.code === 'functions/invalid-argument'
        ? (err?.message || 'Please check your details.')
        : err?.code === 'functions/internal'
        ? 'Something went wrong on our end. Try again in a moment.'
        : err?.message || 'Couldn\'t send your wave — try again.'
      setError(friendly)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      if (!isOpen) {
        setName(''); setEmail(''); setPhone(''); setQuestion('')
        setError(null); setSuccess(false)
      }
    }, 300)
  }

  if (!mounted) return null

  return (
    <div
      data-visible={visible}
      className="sheet-stack fixed inset-0 z-[170] flex items-end md:items-center justify-center px-0 md:px-4"
    >
      <div
        data-visible={visible}
        onClick={handleClose}
        className="sheet-scrim absolute inset-0"
      />
      <div
        ref={sheetRef}
        data-visible={visible}
        onClick={(e) => e.stopPropagation()}
        className="capture-sheet relative w-full md:max-w-[460px] rounded-t-[28px] md:rounded-[28px] overflow-hidden"
        style={{
          background: 'var(--page-canvas)',
          color: 'var(--text-primary)',
          boxShadow: '0 -20px 60px -16px rgba(10,14,23,0.35), 0 30px 80px -30px rgba(10,14,23,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          touchAction: 'pan-y',
        }}
      >
        <div className="md:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-black/15" />
            </div>

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
                  className="px-6 md:px-8 pt-6 md:pt-8 pb-6 md:pb-8"
                >
                  {/* Hero motif */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: 'var(--accent)',
                        color: 'var(--accent-ink)',
                        boxShadow: '0 8px 22px -8px var(--shadow-color)',
                      }}
                    >
                      <Hand weight="bold" size={26} />
                    </div>
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
                        Wave 👋
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
                        Ask {agentName || 'the agent'} a question.
                      </h2>
                    </div>
                  </div>

                  <p
                    className="mb-5"
                    style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 400, lineHeight: 1.55 }}
                  >
                    They'll respond directly to you — your question doesn't get posted publicly.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FieldRow icon={<User size={15} />}>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => { setName(e.target.value); setError(null) }}
                          placeholder="Your name"
                          autoCapitalize="words"
                          className="w-full h-full bg-transparent outline-none text-[14.5px] text-ink placeholder:text-ash"
                        />
                      </FieldRow>
                      <FieldRow icon={<Mail size={15} />}>
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
                          className="w-full h-full bg-transparent outline-none text-[14.5px] text-ink placeholder:text-ash"
                        />
                      </FieldRow>
                    </div>

                    <FieldRow icon={<Phone size={15} />}>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone (optional)"
                        autoComplete="tel"
                        inputMode="tel"
                        className="w-full h-full bg-transparent outline-none text-[14.5px] text-ink placeholder:text-ash"
                      />
                    </FieldRow>

                    <div className="rounded-[14px] bg-cream border border-border-light p-4">
                      <textarea
                        value={question}
                        onChange={(e) => { setQuestion(e.target.value.slice(0, 500)); setError(null) }}
                        placeholder={`What would you like to know about ${shortAddress(pinAddress)}?`}
                        rows={3}
                        className="w-full bg-transparent outline-none text-[14.5px] text-ink placeholder:text-ash resize-none"
                      />
                      <div className="flex justify-end mt-1">
                        <span className="text-[11px] text-smoke">{question.length}/500</span>
                      </div>
                    </div>

                    {error && (
                      <p className="text-[12.5px] text-live-red px-1">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !canSubmit}
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
                          <Hand weight="bold" size={15} />
                          Send wave
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-6 md:px-8 pt-10 md:pt-12 pb-8 md:pb-10 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.05, type: 'spring', stiffness: 420, damping: 22 }}
                    className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--accent-ink)',
                      boxShadow: '0 12px 28px -10px var(--shadow-color)',
                    }}
                  >
                    <Check weight="bold" size={28} />
                  </motion.div>
                  <h2
                    className="mb-2"
                    style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 600, letterSpacing: '-0.025em' }}
                  >
                    Wave sent.
                  </h2>
                  <p
                    className="mb-6"
                    style={{ color: 'var(--text-secondary)', fontSize: '14.5px', fontWeight: 400, lineHeight: 1.55 }}
                  >
                    {agentName || 'They'} will reply directly to {email || 'you'} soon.
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
                    <MessageCircle weight="bold" size={14} />
                    Got it
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
      </div>
    </div>
  )
}

function FieldRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 h-12 px-4 rounded-[14px] bg-cream border border-border-light">
      <span className="text-smoke shrink-0">{icon}</span>
      {children}
    </div>
  )
}

function shortAddress(addr: string): string {
  return addr.split(',')[0]?.trim() || 'this listing'
}
