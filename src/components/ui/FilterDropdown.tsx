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
  const ref = useRef<HTMLDivElement>(null)

  const hasSelection = selected.size > 0
  const displayLabel = hasSelection ? `${label} (${selected.size})` : label

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className={`
          inline-flex items-center gap-1 px-3.5 py-2 rounded-full
          text-[13px] font-semibold whitespace-nowrap cursor-pointer
          select-none border transition-all duration-200
          ${hasSelection
            ? 'bg-tangerine text-white border-tangerine'
            : dark
              ? 'bg-black/30 backdrop-blur-md text-white border-white/10'
              : 'bg-white/90 backdrop-blur-sm text-ink border-black/5 shadow-sm'
          }
        `}
      >
        <span>{displayLabel}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 min-w-[180px] z-[60] bg-obsidian rounded-[16px] border border-border-dark shadow-xl overflow-hidden"
          >
            {hasSelection && onClear && (
              <button
                onClick={() => { onClear(); setOpen(false) }}
                className="w-full px-4 py-2.5 text-left text-[12px] text-tangerine font-semibold border-b border-border-dark"
              >
                Clear all
              </button>
            )}
            <div className="max-h-[240px] overflow-y-auto py-1">
              {options.map((opt) => {
                const isSelected = selected.has(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => onToggle(opt.value)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate/50 transition-colors"
                  >
                    <span className={`text-[13px] font-medium ${isSelected ? 'text-white' : 'text-mist'}`}>
                      {opt.label}
                    </span>
                    {isSelected && <Check size={14} className="text-tangerine shrink-0" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
