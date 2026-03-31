import { motion } from 'framer-motion'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  dark?: boolean
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  dark,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`
        inline-flex p-1 rounded-[14px] gap-0.5
        ${dark ? 'bg-slate' : 'bg-cream'}
        ${className}
      `}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`
            relative px-4 py-2 rounded-[11px] text-[13px] font-semibold
            transition-colors duration-150 cursor-pointer select-none z-10
            ${value === opt.value
              ? dark ? 'text-white' : 'text-ink'
              : dark ? 'text-ghost hover:text-mist' : 'text-smoke hover:text-graphite'
            }
          `}
        >
          {value === opt.value && (
            <motion.div
              layoutId="segment-active"
              className={`absolute inset-0 rounded-[11px] ${dark ? 'bg-charcoal' : 'bg-warm-white shadow-sm'}`}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
