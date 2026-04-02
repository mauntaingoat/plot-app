import { motion, useMotionValue, animate, useDragControls, type PanInfo } from 'framer-motion'
import { type ReactNode, useCallback, useRef, useState, useEffect } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  fullHeight?: boolean
  className?: string
}

const EASE = [0.32, 0.72, 0, 1]

export function BottomSheet({ isOpen, onClose, children, title, fullHeight, className = '' }: BottomSheetProps) {
  const dragControls = useDragControls()
  const y = useMotionValue(0)
  const [rendered, setRendered] = useState(false)
  const closingRef = useRef(false)

  useEffect(() => {
    if (isOpen && !rendered && !closingRef.current) {
      setRendered(true)
    }
  }, [isOpen, rendered])

  useEffect(() => {
    if (!isOpen && rendered && !closingRef.current) {
      closingRef.current = true
      animate(y, window.innerHeight, { type: 'tween', duration: 0.25, ease: EASE,
        onComplete: () => { setRendered(false); closingRef.current = false },
      })
    }
  }, [isOpen, rendered, y])

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    animate(y, window.innerHeight, { type: 'tween', duration: 0.25, ease: EASE,
      onComplete: () => { setRendered(false); closingRef.current = false; onClose() },
    })
  }, [onClose, y])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 60 || info.velocity.y > 300) dismiss()
    else animate(y, 0, { type: 'tween', duration: 0.15 })
  }, [dismiss, y])

  if (!rendered) return null

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/50 animate-[fadeIn_0.2s_ease]"
        onPointerDown={(e) => { if (e.target === e.currentTarget) dismiss() }} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'tween', duration: 0.3, ease: EASE }}
        style={{ y }}
        drag="y" dragControls={dragControls} dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={handleDragEnd}
        className={`fixed bottom-0 left-0 right-0 z-[100] bg-ivory rounded-t-[24px]
          ${fullHeight ? 'top-[5vh]' : 'max-h-[85vh]'} flex flex-col overflow-hidden shadow-xl ${className}`}>
        <div className="flex justify-center pt-3 pb-2 shrink-0"
          onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none' }}>
          <div className="w-9 h-[5px] rounded-full bg-pearl" />
        </div>
        {title && <div className="px-6 pb-3 shrink-0"><h2 className="text-[18px] font-bold text-ink tracking-tight">{title}</h2></div>}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>{children}</div>
      </motion.div>
    </>
  )
}

export function DarkBottomSheet({ isOpen, onClose, children, title, fullHeight, className = '' }: BottomSheetProps) {
  const dragControls = useDragControls()
  const y = useMotionValue(0)
  const [rendered, setRendered] = useState(false)
  const closingRef = useRef(false)

  useEffect(() => {
    if (isOpen && !rendered && !closingRef.current) setRendered(true)
  }, [isOpen, rendered])

  useEffect(() => {
    if (!isOpen && rendered && !closingRef.current) {
      closingRef.current = true
      animate(y, window.innerHeight, { type: 'tween', duration: 0.25, ease: EASE,
        onComplete: () => { setRendered(false); closingRef.current = false },
      })
    }
  }, [isOpen, rendered, y])

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    animate(y, window.innerHeight, { type: 'tween', duration: 0.25, ease: EASE,
      onComplete: () => { setRendered(false); closingRef.current = false; onClose() },
    })
  }, [onClose, y])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 60 || info.velocity.y > 300) dismiss()
    else animate(y, 0, { type: 'tween', duration: 0.15 })
  }, [dismiss, y])

  if (!rendered) return null

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/60 animate-[fadeIn_0.2s_ease]"
        onPointerDown={(e) => { if (e.target === e.currentTarget) dismiss() }} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'tween', duration: 0.3, ease: EASE }}
        style={{ y }}
        drag="y" dragControls={dragControls} dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={handleDragEnd}
        className={`fixed bottom-0 left-0 right-0 z-[100] bg-obsidian rounded-t-[24px] border-t border-border-dark
          ${fullHeight ? 'top-[5vh]' : 'max-h-[85vh]'} flex flex-col overflow-hidden ${className}`}>
        <div className="flex justify-center pt-3 pb-2 shrink-0"
          onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none' }}>
          <div className="w-9 h-[5px] rounded-full bg-charcoal" />
        </div>
        {title && <div className="px-6 pb-3 shrink-0"><h2 className="text-[18px] font-bold text-white tracking-tight">{title}</h2></div>}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>{children}</div>
      </motion.div>
    </>
  )
}
