import { useDragControls, type PanInfo, useMotionValue, animate } from 'framer-motion'
import { type ReactNode, useCallback, useRef, useState, useEffect } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  fullHeight?: boolean
  className?: string
}

// CSS-driven entry + Framer only for drag gesture (which needs JS)
// The slide-up/down uses CSS transform transition on the compositor thread

export function BottomSheet({ isOpen, onClose, children, title, fullHeight, className = '' }: BottomSheetProps) {
  const dragControls = useDragControls()
  const y = useMotionValue(0)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Mount → make visible (triggers CSS transition)
  useEffect(() => {
    if (isOpen && !mounted) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }
    if (!isOpen && mounted && !closingRef.current) {
      closingRef.current = true
      setVisible(false)
      setTimeout(() => { setMounted(false); closingRef.current = false }, 300)
    }
  }, [isOpen, mounted])

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(() => { setMounted(false); closingRef.current = false; onClose() }, 300)
  }, [onClose])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 60 || info.velocity.y > 300) {
      dismiss()
    } else {
      // Snap back — use CSS transition by resetting transform
      if (sheetRef.current) sheetRef.current.style.transform = ''
    }
  }, [dismiss])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragControls.start(e)
  }, [dragControls])

  if (!mounted) return null

  return (
    <>
      {/* Backdrop — CSS opacity transition */}
      <div
        className="fixed inset-0 z-[90] bg-black/50 will-change-[opacity]"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease' }}
        onPointerDown={(e) => { if (e.target === e.currentTarget) dismiss() }}
      />
      {/* Sheet — CSS transform transition for entry/exit */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-[100] bg-ivory rounded-t-[24px]
          ${fullHeight ? 'top-[5vh]' : 'max-h-[85vh]'} flex flex-col overflow-hidden shadow-xl
          will-change-transform ${className}`}
        style={{
          transform: visible ? 'translateY(0) translateZ(0)' : 'translateY(100%) translateZ(0)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown} style={{ touchAction: 'none' }}>
          <div className="w-9 h-[5px] rounded-full bg-pearl" />
        </div>
        {title && <div className="px-6 pb-3 shrink-0"><h2 className="text-[18px] font-bold text-ink tracking-tight">{title}</h2></div>}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>{children}</div>
      </div>
    </>
  )
}

export function DarkBottomSheet({ isOpen, onClose, children, title, fullHeight, className = '' }: BottomSheetProps) {
  const dragControls = useDragControls()
  const y = useMotionValue(0)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && !mounted) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }
    if (!isOpen && mounted && !closingRef.current) {
      closingRef.current = true
      setVisible(false)
      setTimeout(() => { setMounted(false); closingRef.current = false }, 300)
    }
  }, [isOpen, mounted])

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(() => { setMounted(false); closingRef.current = false; onClose() }, 300)
  }, [onClose])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 60 || info.velocity.y > 300) dismiss()
    else if (sheetRef.current) sheetRef.current.style.transform = ''
  }, [dismiss])

  if (!mounted) return null

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/60 will-change-[opacity]"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease' }}
        onPointerDown={(e) => { if (e.target === e.currentTarget) dismiss() }} />
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-[100] bg-obsidian rounded-t-[24px] border-t border-border-dark
          ${fullHeight ? 'top-[5vh]' : 'max-h-[85vh]'} flex flex-col overflow-hidden
          will-change-transform ${className}`}
        style={{
          transform: visible ? 'translateY(0) translateZ(0)' : 'translateY(100%) translateZ(0)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none' }}>
          <div className="w-9 h-[5px] rounded-full bg-charcoal" />
        </div>
        {title && <div className="px-6 pb-3 shrink-0"><h2 className="text-[18px] font-bold text-white tracking-tight">{title}</h2></div>}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>{children}</div>
      </div>
    </>
  )
}
