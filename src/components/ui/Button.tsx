import { motion } from 'framer-motion'
import { type ReactNode, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  fullWidth?: boolean
  children?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-br from-tangerine to-ember text-white shadow-glow-tangerine hover:brightness-110',
  secondary: 'bg-cream text-ink border border-border-light hover:bg-pearl',
  ghost: 'bg-transparent text-smoke hover:text-ink hover:bg-cream',
  glass: 'glass-medium text-white hover:bg-glass-heavy',
  danger: 'bg-live-red/10 text-live-red hover:bg-live-red/20',
  outline: 'border border-border-dark text-white hover:bg-glass-light',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-[12px]',
  lg: 'h-12 px-5 text-[15px] gap-2.5 rounded-[14px]',
  xl: 'h-14 px-6 text-[16px] gap-3 rounded-[16px] font-semibold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  fullWidth,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      transition={{ type: 'spring', damping: 15, stiffness: 400 }}
      className={`
        inline-flex items-center justify-center font-medium cursor-pointer
        transition-all duration-150 select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props as any}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {iconRight && <span className="shrink-0">{iconRight}</span>}
    </motion.button>
  )
}
