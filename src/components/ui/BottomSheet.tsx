import { motion, AnimatePresence, useMotionValue, animate, useDragControls, type PanInfo } from 'framer-motion'
import { type ReactNode, useCallback, useRef, useState } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  fullHeight?: boolean
  className?: string
}

const enterEase = [0.32, 0.72, 0, 1] as const

export function BottomSheet({ isOpen, onClose, children, title, fullHeight, className = '' }: BottomSheetProps) {
  const dragControls = useDragControls()
  const y = useMotionValue(0)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)

  // Sync visible state with isOpen (but let dismiss animation control hide)
  if (isOpen && !visible && !closingRef.current) {
    setVisible(true)
  }

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    animate(y, window.innerHeight, {
      type: 'tween',
      duration: 0.25,
      ease: [0.32, 0.72, 0, 1],
      onComplete: () => {
        setVisible(false)
        closingRef.current = false
        y.set(0)
        onClose()
      },
    })
  }, [onClose, y])

  // Handle external close (isOpen becomes false without drag)
  if (!isOpen && visible && !closingRef.current) {
    dismiss()
  }

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 60 || info.velocity.y > 300) {
      dismiss()
    } else {
      animate(y, 0, { type: 'tween', duration: 0.2, ease: 'easeOut' })
    }
  }, [dismiss, y])

  if (!visible) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[90] bg-black/50"
        onClick={dismiss}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'tween', duration: 0.32, ease: enterEase }}
        style={{ y }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
        className={`
          fixed bottom-0 left-0 right-0 z-[100]
          bg-ivory rounded-t-[24px]
          ${fullHeight ? 'top-[5vh]' : 'max-h-[85vh]'}
          flex flex-col overflow-hidden shadow-xl
          ${className}
        `}
      >
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
          onPointerDown={(e) => dragControls.start(e)}
          style={{ touchAction: 'none' }}
        >
          <div className="w-9 h-[5px] rounded-full bg-pearl" />
        </div>
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
  )
}

export function DarkBottomSheet({ isOpen, onClose, children, title, fullHeight, className = '' }: BottomSheetProps) {
  const dragControls = useDragControls()
  const y = useMotionValue(0)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)

  if (isOpen && !visible && !closingRef.current) {
    setVisible(true)
  }

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    animate(y, window.innerHeight, {
      type: 'tween',
      duration: 0.25,
      ease: [0.32, 0.72, 0, 1],
      onComplete: () => {
        setVisible(false)
        closingRef.current = false
        y.set(0)
        onClose()
      },
    })
  }, [onClose, y])

  if (!isOpen && visible && !closingRef.current) {
    dismiss()
  }

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 60 || info.velocity.y > 300) {
      dismiss()
    } else {
      animate(y, 0, { type: 'tween', duration: 0.2, ease: 'easeOut' })
    }
  }, [dismiss, y])

  if (!visible) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[90] bg-black/60"
        onClick={dismiss}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'tween', duration: 0.32, ease: enterEase }}
        style={{ y }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
        className={`
          fixed bottom-0 left-0 right-0 z-[100]
          bg-obsidian rounded-t-[24px] border-t border-border-dark
          ${fullHeight ? 'top-[5vh]' : 'max-h-[85vh]'}
          flex flex-col overflow-hidden
          ${className}
        `}
      >
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
          onPointerDown={(e) => dragControls.start(e)}
          style={{ touchAction: 'none' }}
        >
          <div className="w-9 h-[5px] rounded-full bg-charcoal" />
        </div>
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
  )
}
