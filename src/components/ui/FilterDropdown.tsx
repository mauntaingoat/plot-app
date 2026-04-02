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
      <button
        onClick={() => setOpen(!open)}
        className={`
          inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-full
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

      {/* Dropdown — absolute, scrolls with pill */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={`absolute top-full left-0 mt-1.5 min-w-[160px] z-[120] rounded-[12px] border shadow-xl overflow-hidden ${
              dark
                ? 'bg-black/60 backdrop-blur-xl border-white/10'
                : 'bg-white/95 backdrop-blur-xl border-black/8 shadow-lg'
            }`}
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
      </AnimatePresence>
    </div>
  )
}
