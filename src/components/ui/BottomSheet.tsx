import { ReactNode, useCallback, useRef, useState, useEffect } from 'react'
import { X } from '@phosphor-icons/react'
import { useScrollLock } from '@/hooks/useScrollLock'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  fullHeight?: boolean
  className?: string
  zIndex?: number // backdrop z-index, sheet = z + 10. Default 90
}

// ── Scroll-aware swipe-to-dismiss hook ──
function useSwipeToDismiss(
  sheetRef: React.RefObject<HTMLDivElement | null>,
  scrollRef: React.RefObject<HTMLDivElement | null>,
  visible: boolean,
  onDismiss: () => void
) {
  const touchStartY = useRef(0)
  const translateY = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || !visible) return

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      translateY.current = 0
      isDragging.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - touchStartY.current
      const scrollEl = scrollRef.current
      const atTop = !scrollEl || scrollEl.scrollTop <= 1

      if (atTop && dy > 0) {
        if (!isDragging.current) isDragging.current = true
        translateY.current = dy
        // Resistance curve — feels natural, slows as you pull further
        const resistance = Math.min(dy, dy * 0.6 + 40)
        sheet.style.transform = `translateY(${resistance}px) translateZ(0)`
        sheet.style.transition = 'none'
        e.preventDefault()
      } else if (isDragging.current && dy <= 0) {
        isDragging.current = false
        translateY.current = 0
        sheet.style.transform = 'translateY(0) translateZ(0)'
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
      }
    }

    const onTouchEnd = () => {
      if (isDragging.current) {
        if (translateY.current > 80) {
          onDismiss()
        } else {
          sheet.style.transform = 'translateY(0) translateZ(0)'
          sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
        }
      }
      isDragging.current = false
      translateY.current = 0
    }

    sheet.addEventListener('touchstart', onTouchStart, { passive: true })
    sheet.addEventListener('touchmove', onTouchMove, { passive: false })
    sheet.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      sheet.removeEventListener('touchstart', onTouchStart)
      sheet.removeEventListener('touchmove', onTouchMove)
      sheet.removeEventListener('touchend', onTouchEnd)
    }
  }, [sheetRef, scrollRef, visible, onDismiss])
}

// ── Light Bottom Sheet ──
export function BottomSheet({ isOpen, onClose, children, title, fullHeight, className = '', zIndex = 90 }: BottomSheetProps) {
  useScrollLock(isOpen)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && !mounted) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }
    if (!isOpen && mounted && !closingRef.current) {
      closingRef.current = true
      setVisible(false)
      setTimeout(() => { setMounted(false); requestAnimationFrame(() => { closingRef.current = false }) }, 300)
    }
  }, [isOpen, mounted])

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(() => { setMounted(false); onClose(); requestAnimationFrame(() => { closingRef.current = false }) }, 300)
  }, [onClose])

  useSwipeToDismiss(sheetRef, scrollRef, visible, dismiss)

  if (!mounted) return null

  return (
    <>
      <div
        className="fixed inset-0 will-change-[opacity]"
        style={{ zIndex, opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease', backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss() }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      />
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 bg-ivory rounded-t-[24px]
          ${fullHeight ? 'top-[5vh]' : 'max-h-[85vh]'} flex flex-col overflow-hidden shadow-xl
          will-change-transform ${className}`}
        style={{
          zIndex: zIndex + 10,
          transform: visible ? 'translateY(0) translateZ(0)' : 'translateY(100%) translateZ(0)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header — drag handle + title + X */}
        <div className="relative shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-[5px] rounded-full bg-pearl" />
          </div>
          {title && <div className="px-6 pb-3"><h2 className="text-[18px] font-bold text-ink tracking-tight pr-8">{title}</h2></div>}
          <button
            onClick={dismiss}
            className="absolute top-3 right-4 w-8 h-8 rounded-full bg-cream flex items-center justify-center text-smoke hover:text-ink cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Dark Bottom Sheet ──
export function DarkBottomSheet({ isOpen, onClose, children, title, fullHeight, className = '', zIndex = 90 }: BottomSheetProps) {
  useScrollLock(isOpen)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && !mounted) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }
    if (!isOpen && mounted && !closingRef.current) {
      closingRef.current = true
      setVisible(false)
      setTimeout(() => { setMounted(false); requestAnimationFrame(() => { closingRef.current = false }) }, 300)
    }
  }, [isOpen, mounted])

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(() => { setMounted(false); onClose(); requestAnimationFrame(() => { closingRef.current = false }) }, 300)
  }, [onClose])

  useSwipeToDismiss(sheetRef, scrollRef, visible, dismiss)

  if (!mounted) return null

  return (
    <>
      <div
        className="fixed inset-0 will-change-[opacity]"
        style={{ zIndex, opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease', backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss() }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      />
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 bg-obsidian rounded-t-[24px] border-t border-border-dark
          ${fullHeight ? 'top-[5vh]' : 'max-h-[85vh]'} flex flex-col overflow-hidden
          will-change-transform ${className}`}
        style={{
          zIndex: zIndex + 10,
          transform: visible ? 'translateY(0) translateZ(0)' : 'translateY(100%) translateZ(0)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header — drag handle + title + X */}
        <div className="relative shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-[5px] rounded-full bg-charcoal" />
          </div>
          {title && <div className="px-6 pb-3"><h2 className="text-[18px] font-bold text-white tracking-tight pr-8">{title}</h2></div>}
          <button
            onClick={dismiss}
            className="absolute top-3 right-4 w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-ghost hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </>
  )
}
