import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Pin, ForSalePin } from '@/lib/types'
import { nextSession } from '@/lib/openHouse'

interface MapIndicatorsProps {
  pins: Pin[]
  onLiveTap: (livePins: Pin[]) => void
  onOpenHouseTap: (ohPins: Pin[]) => void
}

/**
 * Floating pills showing live streams and open houses.
 * - Mobile: bottom-left of map
 * - Desktop: bottom-center of map
 * Only visible when count > 0.
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
    <div className="absolute z-[35] bottom-4 left-4 md:left-1/2 md:-translate-x-1/2 flex items-center gap-2"
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
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-obsidian/80 backdrop-blur-xl border border-white/10 shadow-lg cursor-pointer hover:bg-obsidian/90 transition-colors"
          >
            <div className="relative w-2.5 h-2.5">
              <div className="absolute inset-0 rounded-full bg-live-red animate-[pulse-live_2s_ease-in-out_infinite]" />
              <div className="absolute inset-0 rounded-full bg-live-red" />
            </div>
            <span className="text-[12px] font-bold text-white">
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
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-obsidian/80 backdrop-blur-xl border border-white/10 shadow-lg cursor-pointer hover:bg-obsidian/90 transition-colors"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              className="text-open-amber animate-[house-wobble_2s_ease-in-out_infinite]"
            >
              <path
                d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"
                fill="currentColor"
              />
              <path d="M9 22V12h6v10" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
              <rect x="16" y="5" width="2.5" height="5" rx="0.5" fill="currentColor" />
            </svg>
            <span className="text-[12px] font-bold text-white">
              {openHousePins.length} Open House{openHousePins.length !== 1 ? 's' : ''}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes house-wobble {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(-3deg); }
          30% { transform: rotate(2.5deg); }
          45% { transform: rotate(-2deg); }
          60% { transform: rotate(1deg); }
          75% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  )
}
