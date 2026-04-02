import { useState, useRef, useEffect } from 'react'
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
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const hasSelection = selected.size > 0
  const displayLabel = hasSelection ? `${label} (${selected.size})` : label

  // Position dropdown below button using fixed positioning
  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 6, left: Math.max(8, rect.left) })
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (btnRef.current?.contains(target)) return
      // Check if clicking inside the dropdown portal
      if (target.closest('.filter-dropdown-portal')) return
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
              : 'bg-white/90 backdrop-blur-sm text-ink border-black/5 shadow-sm'
          }
        `}
      >
        <span>{displayLabel}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown portal — fixed position, not absolute */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="filter-dropdown-portal fixed z-[120] min-w-[170px] bg-black/60 backdrop-blur-xl rounded-[14px] border border-white/10 shadow-xl overflow-hidden"
            style={{ top: dropdownPos.top, left: dropdownPos.left, maxWidth: 'calc(100vw - 16px)' }}
          >
            {hasSelection && onClear && (
              <button onClick={() => { onClear(); setOpen(false) }}
                className="w-full px-3.5 py-2 text-left text-[11px] text-tangerine font-semibold border-b border-white/10">
                Clear all
              </button>
            )}
            <div className="max-h-[200px] overflow-y-auto py-0.5">
              {options.map((opt) => {
                const isSelected = selected.has(opt.value)
                return (
                  <button key={opt.value} onClick={() => onToggle(opt.value)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-white/5 transition-colors">
                    <span className={`text-[12px] font-medium ${isSelected ? 'text-white' : 'text-white/60'}`}>{opt.label}</span>
                    {isSelected && <Check size={12} className="text-tangerine shrink-0" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
