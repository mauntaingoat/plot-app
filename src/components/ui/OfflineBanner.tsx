import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'

/**
 * Subtle banner that appears when the user loses internet connection.
 * Slides down from the top, auto-hides when back online.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          className="fixed top-0 left-0 right-0 z-[500] flex items-center justify-center gap-2 py-2.5 bg-charcoal/95 backdrop-blur-xl border-b border-border-dark"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
        >
          <WifiOff size={14} className="text-open-amber" />
          <span className="text-[12px] font-semibold text-mist">You're offline. Some features may not work.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
