import { type ReactNode, useCallback, useRef, useState, useEffect } from 'react'

interface SidePanelProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
  width?: string // default '40%'
}

// Desktop: slides in from left, takes 40% width
// Mobile: falls back to regular bottom sheet behavior (don't use this component on mobile)

export function SidePanel({ isOpen, onClose, children, title, className = '', width = '40%' }: SidePanelProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)

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

  if (!mounted) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/40 will-change-[opacity]"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss() }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      />
      {/* Panel — slides from left */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-[100] bg-obsidian border-r border-border-dark
          flex flex-col overflow-hidden shadow-2xl will-change-transform ${className}`}
        style={{
          width,
          minWidth: 360,
          maxWidth: '90vw',
          transform: visible ? 'translateX(0) translateZ(0)' : 'translateX(-100%) translateZ(0)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {title && (
          <div className="px-6 py-4 border-b border-border-dark shrink-0 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-white tracking-tight">{title}</h2>
            <button onClick={dismiss} className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-ghost hover:text-white">
              <span className="text-[18px]">&times;</span>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </>
  )
}

// Light variant
export function LightSidePanel({ isOpen, onClose, children, title, className = '', width = '40%' }: SidePanelProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)

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

  if (!mounted) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/30 will-change-[opacity]"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss() }}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <div
        className={`fixed top-0 left-0 bottom-0 z-[100] bg-ivory border-r border-border-light
          flex flex-col overflow-hidden shadow-2xl will-change-transform ${className}`}
        style={{
          width,
          minWidth: 360,
          maxWidth: '90vw',
          transform: visible ? 'translateX(0) translateZ(0)' : 'translateX(-100%) translateZ(0)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {title && (
          <div className="px-6 py-4 border-b border-border-light shrink-0 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-ink tracking-tight">{title}</h2>
            <button onClick={dismiss} className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-smoke hover:text-ink">
              <span className="text-[18px]">&times;</span>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </>
  )
}
