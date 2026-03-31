import { motion, AnimatePresence, useMotionValue, animate, type PanInfo } from 'framer-motion'
import { type ReactNode, useCallback } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  fullHeight?: boolean
  className?: string
}

// Smooth ease — no spring bounce/overshoot
const sheetTransition = { type: 'tween' as const, duration: 0.32, ease: [0.32, 0.72, 0, 1] }

export function BottomSheet({ isOpen, onClose, children, title, fullHeight, className = '' }: BottomSheetProps) {
  const y = useMotionValue(0)

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 60 || info.velocity.y > 300) {
      onClose()
    } else {
      animate(y, 0, { type: 'tween', duration: 0.2, ease: 'easeOut' })
    }
  }, [onClose, y])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetTransition}
            style={{ y }}
            className={`
              fixed bottom-0 left-0 right-0 z-[100]
              bg-ivory rounded-t-[24px]
              ${fullHeight ? 'top-[5vh]' : 'max-h-[85vh]'}
              flex flex-col overflow-hidden shadow-xl
              ${className}
            `}
          >
            <motion.div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.3}
              onDragEnd={handleDragEnd}
              style={{ touchAction: 'none' }}
            >
              <div className="w-9 h-[5px] rounded-full bg-pearl" />
            </motion.div>
            {title && (
              <div className="px-6 pb-3 shrink-0">
                <h2 className="text-[18px] font-bold text-ink tracking-tight">{title}</h2>
              </div>
            )}
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function DarkBottomSheet({ isOpen, onClose, children, title, fullHeight, className = '' }: BottomSheetProps) {
  const y = useMotionValue(0)

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 60 || info.velocity.y > 300) {
      onClose()
    } else {
      animate(y, 0, { type: 'tween', duration: 0.2, ease: 'easeOut' })
    }
  }, [onClose, y])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetTransition}
            style={{ y }}
            className={`
              fixed bottom-0 left-0 right-0 z-[100]
              bg-obsidian rounded-t-[24px] border-t border-border-dark
              ${fullHeight ? 'top-[5vh]' : 'max-h-[85vh]'}
              flex flex-col overflow-hidden
              ${className}
            `}
          >
            <motion.div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.3}
              onDragEnd={handleDragEnd}
              style={{ touchAction: 'none' }}
            >
              <div className="w-9 h-[5px] rounded-full bg-charcoal" />
            </motion.div>
            {title && (
              <div className="px-6 pb-3 shrink-0">
                <h2 className="text-[18px] font-bold text-white tracking-tight">{title}</h2>
              </div>
            )}
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
