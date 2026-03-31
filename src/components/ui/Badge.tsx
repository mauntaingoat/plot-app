import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'live' | 'sold' | 'open' | 'listing' | 'story' | 'reel'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  pulse?: boolean
  className?: string
  icon?: ReactNode
}

const badgeStyles: Record<BadgeVariant, string> = {
  default: 'bg-glass-medium text-white border-border-dark',
  live: 'bg-live-red/20 text-live-red border-live-red/30',
  sold: 'bg-sold-green/15 text-sold-green border-sold-green/25',
  open: 'bg-open-amber/15 text-open-amber border-open-amber/25',
  listing: 'bg-listing-blue/15 text-listing-blue border-listing-blue/25',
  story: 'bg-tangerine-soft text-tangerine border-tangerine/20',
  reel: 'bg-reel-purple/15 text-reel-purple border-reel-purple/25',
}

export function Badge({ variant = 'default', children, pulse, className = '', icon }: BadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        text-[11px] font-semibold uppercase tracking-wider
        border select-none
        ${badgeStyles[variant]}
        ${className}
      `}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            variant === 'live' ? 'bg-live-red' : variant === 'open' ? 'bg-open-amber' : 'bg-tangerine'
          }`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            variant === 'live' ? 'bg-live-red' : variant === 'open' ? 'bg-open-amber' : 'bg-tangerine'
          }`} />
        </span>
      )}
      {icon}
      {children}
    </motion.span>
  )
}
