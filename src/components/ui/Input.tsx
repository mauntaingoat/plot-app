import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  iconRight?: ReactNode
  dark?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, dark, className = '', ...props }, ref) => {
    const base = dark
      ? 'bg-slate border-border-dark text-white placeholder:text-ghost focus:border-tangerine/50'
      : 'bg-cream border-border-light text-ink placeholder:text-ash focus:border-tangerine/40'

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className={`text-[13px] font-medium tracking-wide uppercase ${dark ? 'text-mist' : 'text-smoke'}`}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-ghost' : 'text-ash'}`}>
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`
              w-full h-12 rounded-[14px] border px-4 text-[15px]
              transition-all duration-200 outline-none
              ${icon ? 'pl-10' : ''}
              ${iconRight ? 'pr-10' : ''}
              ${error ? 'border-live-red/50 focus:border-live-red' : ''}
              ${base}
              ${className}
            `}
            {...props}
          />
          {iconRight && (
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? 'text-ghost' : 'text-ash'}`}>
              {iconRight}
            </span>
          )}
        </div>
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[12px] text-live-red"
            >
              {error}
            </motion.p>
          )}
          {hint && !error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-[12px] ${dark ? 'text-ghost' : 'text-smoke'}`}
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

Input.displayName = 'Input'
