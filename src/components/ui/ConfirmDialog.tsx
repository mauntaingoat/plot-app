import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { useScrollLock } from '@/hooks/useScrollLock'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary'
  loading?: boolean
}

function useIsDesktop() {
  const [d, setD] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = (e: MediaQueryListEvent) => setD(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return d
}

/**
 * Reusable confirmation dialog.
 * Desktop: centered modal. Mobile: bottom sheet.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  loading,
}: ConfirmDialogProps) {
  useScrollLock(isOpen)
  const isDesktop = useIsDesktop()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/50"
            onClick={onClose}
          />

          {isDesktop ? (
            /* Desktop: centered modal */
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[410] w-[calc(100vw-48px)] max-w-[340px] bg-obsidian rounded-[20px] shadow-2xl border border-border-dark p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-live-red/15 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-live-red" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white">{title}</h3>
                  <p className="text-[13px] text-mist mt-1 leading-relaxed">{message}</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Button variant="glass" size="md" fullWidth onClick={onClose} disabled={loading}>Cancel</Button>
                <Button variant={confirmVariant} size="md" fullWidth onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
              </div>
            </motion.div>
          ) : (
            /* Mobile: bottom sheet with swipe-to-dismiss */
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 400) onClose()
              }}
              className="fixed bottom-0 left-0 right-0 z-[410] bg-obsidian rounded-t-[22px] shadow-2xl border-t border-border-dark"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-ghost/30" />
              </div>
              <div className="px-5 pb-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-live-red/15 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} className="text-live-red" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white">{title}</h3>
                    <p className="text-[13px] text-mist mt-1 leading-relaxed">{message}</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <Button variant="glass" size="lg" fullWidth onClick={onClose} disabled={loading}>Cancel</Button>
                  <Button variant={confirmVariant} size="lg" fullWidth onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}
