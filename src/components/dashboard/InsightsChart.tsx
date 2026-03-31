import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface DataPoint {
  label: string
  value: number
}

interface InsightsChartProps {
  data: DataPoint[]
  height?: number
}

export function InsightsChart({ data, height = 160 }: InsightsChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data])

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-4">
      <h3 className="text-[14px] font-bold text-ink mb-4">Activity</h3>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((point, i) => {
          const barHeight = (point.value / maxValue) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${barHeight}%` }}
                transition={{ delay: i * 0.04, type: 'spring', damping: 15, stiffness: 150 }}
                className="w-full rounded-t-[6px] min-h-[4px]"
                style={{
                  background: barHeight > 60
                    ? 'linear-gradient(to top, #FF6B3D, #E8522A)'
                    : barHeight > 30
                    ? '#FF6B3D'
                    : 'rgba(255, 107, 61, 0.3)',
                }}
              />
              <span className="text-[9px] text-ash font-medium">{point.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
