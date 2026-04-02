import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface FilterPillProps {
  label: string
  active?: boolean
  icon?: ReactNode
  count?: number
  onClick?: () => void
  dark?: boolean
}

export function FilterPill({ label, active, icon, count, onClick, dark = true }: FilterPillProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-4 py-2 rounded-full
        text-[13px] font-semibold whitespace-nowrap cursor-pointer
        transition-all duration-200 select-none border
        ${active
          ? dark
            ? 'bg-tangerine text-white border-tangerine shadow-glow-tangerine'
            : 'bg-tangerine text-white border-tangerine'
          : dark
            ? 'glass text-mist hover:text-white'
            : 'bg-white/90 backdrop-blur-sm text-ink border-border-light hover:bg-pearl shadow-sm'
        }
      `}
    >
      {icon && <span className="shrink-0 w-4 h-4 flex items-center justify-center">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`
          text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center
          ${active ? 'bg-white/20 text-white' : dark ? 'bg-glass-light text-ghost' : 'bg-pearl text-smoke'}
        `}>
          {count}
        </span>
      )}
    </motion.button>
  )
}

interface FilterBarProps {
  children: ReactNode
  className?: string
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto overflow-y-visible px-4 py-2 no-scrollbar items-center ${className}`}>
      {children}
    </div>
  )
}
