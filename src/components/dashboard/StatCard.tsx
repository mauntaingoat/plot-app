import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  change?: number // percentage
  icon: ReactNode
  color?: string
  format?: 'number' | 'compact'
}

function AnimatedNumber({ value, format }: { value: number; format: string }) {
  const motionValue = useMotionValue(0)
  const display = useTransform(motionValue, (v) => {
    if (format === 'compact') {
      if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
      return Math.round(v).toLocaleString()
    }
    return Math.round(v).toLocaleString()
  })

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.2, ease: 'easeOut' })
    return controls.stop
  }, [value, motionValue])

  return <motion.span>{display}</motion.span>
}

export function StatCard({ label, value, change, icon, color = '#FF6B3D', format = 'number' }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-warm-white rounded-[18px] border border-border-light p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-0.5 text-[12px] font-semibold ${isPositive ? 'text-sold-green' : 'text-live-red'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-[28px] font-extrabold text-ink tracking-tight font-mono">
          <AnimatedNumber value={value} format={format} />
        </p>
        <p className="text-[12px] text-smoke font-medium uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  )
}
