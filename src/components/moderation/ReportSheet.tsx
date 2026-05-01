import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flag, Check, Warning as AlertTriangle, Prohibit as Ban, Copyright, ChatCenteredText as MessageSquare, ShieldWarning as ShieldAlert } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { createReport } from '@/lib/firestore'
import { useAuthStore } from '@/stores/authStore'
import type { ReportReason } from '@/lib/types'

interface ReportSheetProps {
  isOpen: boolean
  onClose: () => void
  targetType: 'pin' | 'content' | 'agent'
  targetId: string
  targetOwnerId: string
}

const REASONS: { id: ReportReason; label: string; icon: typeof Flag }[] = [
  { id: 'spam', label: 'Spam or scam', icon: ShieldAlert },
  { id: 'inappropriate', label: 'Inappropriate content', icon: AlertTriangle },
  { id: 'fake_listing', label: 'Fake or misleading listing', icon: Ban },
  { id: 'harassment', label: 'Harassment or abuse', icon: AlertTriangle },
  { id: 'copyright', label: 'Copyright violation', icon: Copyright },
  { id: 'other', label: 'Something else', icon: MessageSquare },
]

export function ReportSheet({ isOpen, onClose, targetType, targetId, targetOwnerId }: ReportSheetProps) {
  const { userDoc } = useAuthStore()
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const reset = () => {
    setSelectedReason(null)
    setDetail('')
    setSubmitted(false)
  }

  const handleClose = () => {
    onClose()
    setTimeout(reset, 300)
  }

  const handleSubmit = async () => {
    if (!selectedReason || !userDoc) return
    setSubmitting(true)
    try {
      await createReport({
        reporterUid: userDoc.uid,
        targetType,
        targetId,
        targetOwnerId,
        reason: selectedReason,
        detail: detail.trim(),
      })
      setSubmitted(true)
    } catch {
      // silently fail — don't block the user
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed bottom-0 left-0 right-0 z-[310] md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[calc(100vw-48px)] md:max-w-[400px] bg-obsidian rounded-t-[22px] md:rounded-[22px] shadow-2xl overflow-hidden border-t md:border border-border-dark"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark">
              <div className="flex items-center gap-2">
                <Flag size={15} className="text-live-red" />
                <h2 className="text-[16px] font-extrabold text-white tracking-tight">Report</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center cursor-pointer hover:bg-slate transition-colors"
              >
                <X size={15} className="text-ghost" />
              </button>
            </div>

            {submitted ? (
              <div className="px-5 py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-sold-green/20 flex items-center justify-center mx-auto mb-4">
                  <Check size={24} className="text-sold-green" />
                </div>
                <h3 className="text-[17px] font-extrabold text-white tracking-tight">Report submitted</h3>
                <p className="text-[13px] text-mist mt-2">We'll review this and take action if needed. Thank you.</p>
                <button onClick={handleClose} className="text-[13px] font-semibold text-tangerine mt-5 cursor-pointer">
                  Done
                </button>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                <p className="text-[13px] text-mist">Why are you reporting this?</p>

                {REASONS.map((reason) => {
                  const Icon = reason.icon
                  const isSelected = selectedReason === reason.id
                  return (
                    <button
                      key={reason.id}
                      onClick={() => setSelectedReason(reason.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-[14px] text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-live-red/10 border border-live-red/30'
                          : 'bg-slate border border-transparent hover:border-border-dark'
                      }`}
                    >
                      <Icon size={16} className={isSelected ? 'text-live-red' : 'text-ghost'} />
                      <span className={`text-[14px] font-medium ${isSelected ? 'text-white' : 'text-mist'}`}>
                        {reason.label}
                      </span>
                    </button>
                  )
                })}

                {selectedReason && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={detail}
                      onChange={(e) => setDetail(e.target.value)}
                      rows={3}
                      placeholder="Add details (optional)..."
                      className="w-full bg-slate text-white text-[13px] font-medium rounded-[10px] px-3 py-2.5 border border-border-dark outline-none focus:border-tangerine transition-colors resize-none placeholder:text-ghost mt-2"
                    />
                  </motion.div>
                )}

                <div className="pt-2 pb-[env(safe-area-inset-bottom,8px)]">
                  <Button
                    variant="danger"
                    size="lg"
                    fullWidth
                    onClick={handleSubmit}
                    disabled={!selectedReason || submitting}
                  >
                    {submitting ? 'Submitting…' : 'Submit Report'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
