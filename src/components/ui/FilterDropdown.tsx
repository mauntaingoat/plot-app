import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

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
  const [pos, setPos] = useState({ top: 0, left: 0 })

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

  useEffect(() => {
    if (!open) return
    updatePos()
    // Reposition on scroll/resize
    const handler = () => updatePos()
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [open, updatePos])

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
        onClick={() => setOpen(!open)}
        className={`
          inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-full shrink-0
          text-[11px] font-semibold whitespace-nowrap cursor-pointer
          select-none border transition-all duration-200
          ${hasSelection
            ? 'bg-tangerine text-white border-tangerine'
            : dark
              ? 'bg-black/30 backdrop-blur-md text-white/80 border-white/10'
              : 'bg-white/90 backdrop-blur-sm text-ink border-black/8 shadow-sm'
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
              style={{ top: pos.top, left: pos.left, maxWidth: 'calc(100vw - 16px)' }}
            >
              {hasSelection && onClear && (
                <button onClick={() => { onClear(); setOpen(false) }}
                  className={`w-full px-3 py-1.5 text-left text-[10px] font-semibold border-b ${
                    dark ? 'text-tangerine border-white/10' : 'text-tangerine border-black/5'
                  }`}>
                  Clear
                </button>
              )}
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
