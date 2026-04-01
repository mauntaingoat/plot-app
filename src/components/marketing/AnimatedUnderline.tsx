import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface AnimatedUnderlineProps {
  color?: string
  width?: number
  className?: string
}

export function AnimatedUnderline({
  color = '#FF6B3D',
  width = 200,
  className = '',
}: AnimatedUnderlineProps) {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  // Hand-drawn-style wavy path that feels organic
  const height = 12
  const d = `M2 8 C 15 2, 30 12, 50 7 S 80 2, 100 8 S 130 14, 150 7 S 175 2, ${width - 2} 8`

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={className}
      style={{ overflow: 'visible' }}
    >
      <motion.path
        d={d}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
      />
    </svg>
  )
}
