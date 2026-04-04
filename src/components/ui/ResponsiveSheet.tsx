import { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { BottomSheet, DarkBottomSheet } from './BottomSheet'

interface ResponsiveSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  fullHeight?: boolean
  className?: string
  dark?: boolean
  noScroll?: boolean // content manages its own scroll (e.g. ListingModal)
  mapBounds?: { left: number; right: number } // center modal within map area on desktop
  zIndex?: number // for stacked modals (e.g. auth over profile)
}

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 768

// Centered modal for desktop — mobile-width, soft blur
function DesktopModal({ isOpen, onClose, children, title, dark, noScroll, mapBounds }: { isOpen: boolean; onClose: () => void; children: ReactNode; title?: string; dark?: boolean; noScroll?: boolean; mapBounds?: { left: number; right: number } }) {
  const bg = dark ? 'bg-obsidian' : 'bg-warm-white'
  const borderColor = dark ? 'border-border-dark' : 'border-border-light'
  const titleColor = dark ? 'text-white' : 'text-ink'
  const closeBg = dark ? 'bg-charcoal' : 'bg-cream'
  const closeText = dark ? 'text-ghost hover:text-white' : 'text-smoke hover:text-ink'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[200]"
          onClick={onClose}
        >
          {/* Backdrop — dim overlay */}
          <div className="absolute inset-0 bg-black/30" />
          {/* Centering container — constrained to map area when mapBounds provided */}
          <div
            className="absolute top-0 bottom-0 flex items-center justify-center"
            style={mapBounds ? { left: mapBounds.left, right: mapBounds.right } : { left: 0, right: 0 }}
          >
          {/* Modal — mobile width */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`relative ${bg} rounded-2xl shadow-2xl w-[380px] max-w-[90vw] ${noScroll ? 'h-[88vh]' : 'max-h-[88vh]'} flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className={`px-5 pt-4 pb-3 shrink-0 flex items-center justify-between border-b ${borderColor}`}>
              {title ? (
                <h2 className={`text-[16px] font-bold ${titleColor} tracking-tight truncate flex-1 mr-3`}>{title}</h2>
              ) : (
                <div className="flex-1" />
              )}
              <button onClick={onClose} className={`w-8 h-8 rounded-full ${closeBg} flex items-center justify-center ${closeText} cursor-pointer transition-colors shrink-0`}>
                <X size={16} />
              </button>
            </div>
            {/* Scrollable content */}
            <div className={`flex-1 min-h-0 ${noScroll ? 'overflow-hidden' : 'overflow-y-auto'} overscroll-contain`} style={{ WebkitOverflowScrolling: 'touch' }}>
              {children}
            </div>
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Auto-switches between BottomSheet (mobile) and centered Modal (desktop)
export function ResponsiveSheet({ isOpen, onClose, children, title, fullHeight, className, dark, noScroll, mapBounds, zIndex }: ResponsiveSheetProps) {
  if (isDesktop()) {
    return <DesktopModal isOpen={isOpen} onClose={onClose} title={title} dark={dark} noScroll={noScroll} mapBounds={mapBounds}>{children}</DesktopModal>
  }

  return dark ? (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} title={title} fullHeight={fullHeight} className={className} zIndex={zIndex}>{children}</DarkBottomSheet>
  ) : (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} fullHeight={fullHeight} className={className} zIndex={zIndex}>{children}</BottomSheet>
  )
}
