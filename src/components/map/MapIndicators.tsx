import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, CalendarClock } from 'lucide-react'
import type { Pin, ForSalePin } from '@/lib/types'
import { nextSession } from '@/lib/openHouse'

interface MapIndicatorsProps {
  pins: Pin[]
  onLiveTap: (livePins: Pin[]) => void
  onOpenHouseTap: (ohPins: Pin[]) => void
}

/**
 * Floating pills showing live streams and open houses.
 * Styled to match AgentPill + filter pills (white glass, border-black/5).
 * Uses same icons as dashboard insights (Radio, CalendarClock).
 * - Mobile: bottom-left
 * - Desktop: bottom-center
 */
export function MapIndicators({ pins, onLiveTap, onOpenHouseTap }: MapIndicatorsProps) {
  const livePins = useMemo(
    () => pins.filter((p): p is ForSalePin => p.type === 'for_sale' && 'isLive' in p && !!p.isLive),
    [pins],
  )

  const openHousePins = useMemo(
    () =>
      pins.filter((p): p is ForSalePin => {
        if (p.type !== 'for_sale') return false
        const fp = p as ForSalePin
        return !!fp.openHouse && nextSession(fp.openHouse) !== null
      }),
    [pins],
  )

  const hasLive = livePins.length > 0
  const hasOH = openHousePins.length > 0

  if (!hasLive && !hasOH) return null

  return (
    <div
      className="absolute z-[35] left-4 md:left-1/2 md:-translate-x-1/2 flex items-center gap-2"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 8px) + 16px)' }}
    >
      <AnimatePresence>
        {hasLive && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onLiveTap(livePins)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md border border-black/5 shadow-sm cursor-pointer hover:bg-white transition-colors"
          >
            <div className="relative">
              <Radio size={14} className="text-live-red" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-live-red animate-[pulse-live_2s_ease-in-out_infinite]" />
            </div>
            <span className="text-[12px] font-bold text-ink">
              {livePins.length} Live
            </span>
          </motion.button>
        )}

        {hasOH && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, delay: hasLive ? 0.08 : 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onOpenHouseTap(openHousePins)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md border border-black/5 shadow-sm cursor-pointer hover:bg-white transition-colors"
          >
            <CalendarClock size={14} className="text-open-amber" />
            <span className="text-[12px] font-bold text-ink">
              {openHousePins.length} Open House{openHousePins.length !== 1 ? 's' : ''}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
