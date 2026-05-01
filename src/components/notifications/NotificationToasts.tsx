import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Bell, X } from '@phosphor-icons/react'
import { useNotifications } from '@/hooks/useNotifications'

/**
 * Top-right toast stack for foreground push notifications.
 * Mount once at the app root. Auto-dismisses after 6 seconds.
 */
export function NotificationToasts() {
  const { toasts, dismissToast } = useNotifications()
  const navigate = useNavigate()

  // Auto-dismiss after 6s
  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => dismissToast(t.id), 6000),
    )
    return () => {
      timers.forEach((tm) => clearTimeout(tm))
    }
  }, [toasts, dismissToast])

  return (
    <div
      className="fixed top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            onClick={() => {
              if (toast.url) navigate(toast.url)
              dismissToast(toast.id)
            }}
            className="pointer-events-auto w-[calc(100vw-32px)] max-w-[360px] bg-obsidian/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3.5 text-left cursor-pointer hover:border-tangerine/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-tangerine/15 flex items-center justify-center shrink-0">
                <Bell size={15} className="text-tangerine" />
              </div>
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <p className="text-[13px] font-extrabold text-white truncate">{toast.title}</p>
                )}
                {toast.body && (
                  <p className="text-[12px] text-mist line-clamp-2 mt-0.5 leading-snug">{toast.body}</p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  dismissToast(toast.id)
                }}
                className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-ghost hover:text-white shrink-0 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
