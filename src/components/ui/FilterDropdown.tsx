import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretDown as ChevronDown, Check } from '@phosphor-icons/react'
interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  label: string
  options: FilterOption[]
  selected: Set<string>
  onToggle: (value: string) => void
  onClear?: () => void
  dark?: boolean
}

export function FilterDropdown({ label, options, selected, onToggle, onClear, dark }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const hasSelection = selected.size > 0
  const displayLabel = hasSelection ? `${label} (${selected.size})` : label

  // Position dropdown below button using getBoundingClientRect
  const updatePos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 180)),
    })
  }, [])

  // Calculate position synchronously when opening to prevent flash at (0,0)
  const handleToggle = useCallback(() => {
    if (!open) {
      updatePos()
    }
    setOpen(!open)
  }, [open, updatePos])

  useEffect(() => {
    if (!open) return
    // Close on any scroll (filter bar or page) — dropdown shouldn't float detached
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: PointerEvent) => {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      if (dropRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{ fontSize: 12 }}
        className={`
          inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-full shrink-0
          font-semibold whitespace-nowrap cursor-pointer
          select-none border transition-all duration-200
          ${hasSelection
            ? 'bg-tangerine text-white border-tangerine'
            : dark
              ? 'bg-black/30 backdrop-blur-md text-white/80 border-white/10'
              : 'bg-white/90 backdrop-blur-sm text-ink border-black/8 shadow-[0_2px_12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)]'
          }
        `}
      >
        <span>{displayLabel}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Portal dropdown — renders at document root, positioned via fixed */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className={`fixed z-[200] min-w-[160px] rounded-[12px] border shadow-xl overflow-hidden ${
                dark
                  ? 'bg-black/70 backdrop-blur-xl border-white/10'
                  : 'bg-white/95 backdrop-blur-xl border-black/8'
              }`}
              style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, maxWidth: 'calc(100vw - 16px)' }}
            >
              <div className="max-h-[200px] overflow-y-auto py-0.5">
                {options.map((opt) => {
                  const isSelected = selected.has(opt.value)
                  return (
                    <button key={opt.value} onClick={() => onToggle(opt.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                        dark ? 'hover:bg-white/5' : 'hover:bg-black/3'
                      }`}>
                      <span className={`text-[11px] font-medium ${
                        isSelected
                          ? dark ? 'text-white' : 'text-tangerine'
                          : dark ? 'text-white/60' : 'text-graphite'
                      }`}>{opt.label}</span>
                      {isSelected && <Check size={11} className="text-tangerine shrink-0" />}
                    </button>
                  )
                })}
              </div>
              {hasSelection && onClear && (
                <button onClick={() => { onClear(); setOpen(false) }}
                  style={{ fontSize: 12 }}
                  className={`w-full px-3 py-2 text-left font-semibold border-t ${
                    dark ? 'text-tangerine border-white/10' : 'text-tangerine border-black/5'
                  }`}>
                  Clear
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
