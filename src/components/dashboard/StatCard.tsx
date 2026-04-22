import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  change?: number
  changePeriod?: string
  icon: ReactNode
  color?: string
  format?: 'number' | 'compact'
  tooltip?: string
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

export function StatCard({ label, value, change, changePeriod = 'vs last week', icon, color = '#FF6B3D', format = 'number', tooltip }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-warm-white rounded-[18px] border border-border-light p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center relative cursor-pointer"
          style={{ backgroundColor: `${color}15`, color }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
        >
          {icon}
          {tooltip && showTooltip && (
            <div className="absolute left-0 top-full mt-2 z-50 px-3 py-2 bg-ink text-warm-white rounded-[10px] shadow-lg whitespace-nowrap pointer-events-none">
              <p className="text-[11px] font-medium">{tooltip}</p>
              <div className="absolute bottom-full left-4 w-0 h-0 border-4 border-transparent border-b-ink" />
            </div>
          )}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${isPositive ? 'text-sold-green' : 'text-live-red'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change)}%
            <span className="text-[9px] text-ash font-normal ml-0.5">{changePeriod}</span>
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
