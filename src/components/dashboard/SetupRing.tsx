import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'

interface SetupRingProps {
  percent: number
  size?: number
}

export function SetupRing({ percent, size = 56 }: SetupRingProps) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const progress = useMotionValue(0)
  const strokeDashoffset = useTransform(progress, (v) => circumference - (v / 100) * circumference)

  useEffect(() => {
    const controls = animate(progress, percent, {
      duration: 1.5,
      ease: 'easeOut',
    })
    return controls.stop
  }, [percent, progress])

  const display = useTransform(progress, (v) => `${Math.round(v)}%`)

  if (percent >= 100) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EDEAE4"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF6B3D" />
            <stop offset="100%" stopColor="#E8522A" />
          </linearGradient>
        </defs>
      </svg>
      <motion.span className="absolute text-[11px] font-bold text-tangerine">
        {display}
      </motion.span>
    </motion.div>
  )
}
