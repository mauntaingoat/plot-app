import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'

interface DataPoint {
  label: string
  value: number
}

interface InsightsChartProps {
  data: DataPoint[]
  height?: number
  title?: string
  subtitle?: string
}

export function InsightsChart({ data, height = 160, title = 'Weekly Views', subtitle = 'Last 7 days' }: InsightsChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data])
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data])

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-ink">{title}</h3>
          <p className="text-[11px] text-smoke mt-0.5">{total.toLocaleString()} total · {subtitle}</p>
        </div>
      </div>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end gap-2">
          {data.map((point, i) => {
            const barHeightPx = Math.max(4, (point.value / maxValue) * height)
            const isHovered = hoverIdx === i
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end gap-1.5 relative cursor-pointer"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 px-2.5 py-1.5 bg-ink text-warm-white rounded-[8px] shadow-lg z-10 pointer-events-none whitespace-nowrap">
                    <p className="text-[11px] font-bold">{point.value.toLocaleString()}</p>
                    <p className="text-[9px] opacity-70">{point.label}</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-ink" />
                  </div>
                )}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: barHeightPx }}
                  transition={{ delay: i * 0.04, type: 'spring', damping: 18, stiffness: 180 }}
                  className="w-full rounded-t-[6px]"
                  style={{
                    background: isHovered
                      ? 'linear-gradient(to top, #E8522A, #FF6B3D)'
                      : 'linear-gradient(to top, #FF6B3D, rgba(255, 107, 61, 0.5))',
                  }}
                />
                <span className="text-[10px] text-ash font-semibold">{point.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
