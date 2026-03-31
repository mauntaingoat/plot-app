import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion'
import { type ReactNode, useCallback } from 'react'
import { springSheet } from '@/lib/motion'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  fullHeight?: boolean
  className?: string
}

export function BottomSheet({ isOpen, onClose, children, title, fullHeight, className = '' }: BottomSheetProps) {
  const dragControls = useDragControls()

  const handleDragEnd = useCallback((_: never, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose()
    }
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springSheet}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className={`
              fixed bottom-0 left-0 right-0 z-[100]
              bg-ivory rounded-t-[24px]
              ${fullHeight ? 'top-[5vh]' : 'max-h-[90vh]'}
              flex flex-col overflow-hidden
              shadow-xl
              ${className}
            `}
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-9 h-[5px] rounded-full bg-pearl" />
            </div>

            {/* Title */}
            {title && (
              <div className="px-6 pb-3">
                <h2 className="text-[18px] font-bold text-ink tracking-tight">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Dark variant for map/viewer contexts
export function DarkBottomSheet({ isOpen, onClose, children, title, fullHeight, className = '' }: BottomSheetProps) {
  const dragControls = useDragControls()

  const handleDragEnd = useCallback((_: never, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose()
    }
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/60"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springSheet}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className={`
              fixed bottom-0 left-0 right-0 z-[100]
              bg-obsidian rounded-t-[24px] border-t border-border-dark
              ${fullHeight ? 'top-[5vh]' : 'max-h-[90vh]'}
              flex flex-col overflow-hidden
              ${className}
            `}
          >
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-9 h-[5px] rounded-full bg-charcoal" />
            </div>

            {title && (
              <div className="px-6 pb-3">
                <h2 className="text-[18px] font-bold text-white tracking-tight">{title}</h2>
              </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
