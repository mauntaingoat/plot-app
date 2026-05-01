import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, CalendarDots as CalendarClock } from '@phosphor-icons/react'
import type { Pin, ForSalePin } from '@/lib/types'
import { nextSession } from '@/lib/openHouse'

interface MapIndicatorsProps {
  pins: Pin[]
  onLiveTap: (livePins: Pin[]) => void
  onOpenHouseTap: (ohPins: Pin[]) => void
}

function CountBadge({ count }: { count: number }) {
  return (
    <div className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-tangerine flex items-center justify-center shadow-sm">
      <span className="text-[10px] font-bold text-white leading-none">{count}</span>
    </div>
  )
}

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
            onClick={(e) => { e.stopPropagation(); onLiveTap(livePins) }}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md border border-black/5 shadow-sm cursor-pointer hover:bg-white transition-colors"
          >
            <Radio size={14} className="text-live-red" />
            <span className="text-[12px] font-bold text-ink">
              {livePins.length === 1 ? 'Livestream' : 'Livestreams'}
            </span>
            <CountBadge count={livePins.length} />
          </motion.button>
        )}

        {hasOH && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, delay: hasLive ? 0.08 : 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onOpenHouseTap(openHousePins) }}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md border border-black/5 shadow-sm cursor-pointer hover:bg-white transition-colors"
          >
            <CalendarClock size={14} className="text-open-amber" />
            <span className="text-[12px] font-bold text-ink">
              {openHousePins.length === 1 ? 'Open House' : 'Open Houses'}
            </span>
            <CountBadge count={openHousePins.length} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
