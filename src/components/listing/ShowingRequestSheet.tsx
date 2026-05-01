import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Calendar, User as UserIcon, Envelope as Mail, Phone, ChatCenteredText as MessageSquare } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { createShowingRequest } from '@/lib/firestore'
import type { Pin, ForSalePin, UserDoc } from '@/lib/types'

interface ShowingRequestSheetProps {
  isOpen: boolean
  onClose: () => void
  pin: Pin | null
  agent: UserDoc
}

const todayISO = () => new Date().toISOString().split('T')[0]

export function ShowingRequestSheet({ isOpen, onClose, pin, agent }: ShowingRequestSheetProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('10:00')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName(''); setEmail(''); setPhone(''); setDate(todayISO()); setTime('10:00'); setNote('')
    setSubmitted(false); setError(null)
  }

  const handleClose = () => {
    onClose()
    setTimeout(reset, 300)
  }

  const handleSubmit = async () => {
    if (!pin || pin.type === 'spotlight') return
    setError(null)
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in your name, email, and phone.')
      return
    }
    setSubmitting(true)
    try {
      await createShowingRequest({
        agentId: agent.uid,
        pinId: pin.id,
        pinAddress: pin.address,
        visitorName: name.trim(),
        visitorEmail: email.trim(),
        visitorPhone: phone.trim(),
        preferredDate: date,
        preferredTime: time,
        note: note.trim(),
      })
      setSubmitted(true)
    } catch (e) {
      setError('Could not send your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!pin || pin.type === 'spotlight') return null
  const fp = pin as ForSalePin

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/65 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) handleClose()
            }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[310] w-[calc(100vw-48px)] max-w-[420px] max-h-[88vh] bg-obsidian rounded-[22px] shadow-2xl overflow-hidden flex flex-col border border-border-dark"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-0 shrink-0 cursor-grab">
              <div className="w-9 h-1 rounded-full bg-ghost/40" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border-dark shrink-0">
              <div className="min-w-0 pr-3">
                <h2 className="text-[16px] font-extrabold text-white tracking-tight">Request a Showing</h2>
                <p className="text-[11px] text-ghost truncate mt-0.5">{fp.address}</p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center cursor-pointer hover:bg-slate transition-colors shrink-0"
              >
                <X size={15} className="text-ghost" />
              </button>
            </div>

            {submitted ? (
              <div className="px-6 py-10 text-center flex-1 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                  className="w-16 h-16 rounded-full bg-sold-green/20 flex items-center justify-center mb-4"
                >
                  <Check size={28} className="text-sold-green" />
                </motion.div>
                <h3 className="text-[18px] font-extrabold text-white tracking-tight">Request sent</h3>
                <p className="text-[13px] text-mist mt-2 max-w-[300px] mx-auto">
                  {agent.displayName.split(' ')[0]} will reach out within 24 hours to confirm.
                </p>
                <Button variant="primary" size="md" onClick={handleClose} className="mt-6">
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
                  <Field icon={<UserIcon size={14} />} label="Full name">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="input-base"
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field icon={<Mail size={14} />} label="Email">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="input-base"
                      />
                    </Field>
                    <Field icon={<Phone size={14} />} label="Phone">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(305) 555-1234"
                        className="input-base"
                      />
                    </Field>
                  </div>

                  <Field icon={<Calendar size={14} className="text-tangerine" />} label="Preferred date & time">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={date}
                        min={todayISO()}
                        onChange={(e) => setDate(e.target.value)}
                        className="input-base"
                      />
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="input-base"
                      />
                    </div>
                  </Field>

                  <Field icon={<MessageSquare size={14} />} label="Anything else? (optional)">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="Pre-approved buyer, working with an agent, etc."
                      className="input-base resize-none"
                    />
                  </Field>

                  {error && (
                    <div className="bg-live-red/10 border border-live-red/30 rounded-[10px] px-3 py-2 text-[12px] text-live-red">
                      {error}
                    </div>
                  )}
                </div>

                <div className="px-5 sm:px-6 py-4 border-t border-border-dark bg-obsidian/95 backdrop-blur-sm shrink-0">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? 'Sending…' : 'Send request'}
                  </Button>
                  <p className="text-[10px] text-ghost text-center mt-2">
                    By submitting, you agree to be contacted by {agent.displayName}.
                  </p>
                </div>
              </>
            )}
          </motion.div>

          <style>{`
            .input-base {
              width: 100%;
              background: #1a1d28;
              color: white;
              font-size: 13px;
              font-weight: 500;
              border-radius: 10px;
              padding: 10px 12px;
              border: 1px solid rgba(255,255,255,0.06);
              outline: none;
              transition: border-color 0.15s ease;
            }
            .input-base::placeholder { color: rgba(255,255,255,0.28); }
            .input-base:focus { border-color: #FF6B3D; }
          `}</style>
        </>
      )}
    </AnimatePresence>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ghost mb-1.5">
        <span className="text-tangerine">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  )
}
