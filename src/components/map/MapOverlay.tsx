import { motion } from 'framer-motion'
import { Share2, Bookmark, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { FilterPill, FilterBar } from '@/components/ui/FilterPill'
import { useMapStore } from '@/stores/mapStore'
import { PIN_CONFIG, type PinType, type UserDoc } from '@/lib/types'
import { PIN_TYPE_ICONS } from '@/components/icons/PinIcons'

interface MapOverlayProps {
  agent: UserDoc
  pinCounts: Record<string, number>
  onFollow?: () => void
  onShare?: () => void
  onSave?: () => void
  isFollowing?: boolean
}

const FILTER_OPTIONS: { value: PinType; label: string }[] = [
  { value: 'listing', label: 'For Sale' },
  { value: 'sold', label: 'Sold' },
  { value: 'story', label: 'Stories' },
  { value: 'reel', label: 'Reels' },
  { value: 'live', label: 'Live' },
  { value: 'open_house', label: 'Open' },
]

export function MapOverlay({ agent, pinCounts, onFollow, onShare, onSave, isFollowing }: MapOverlayProps) {
  const { activeFilters, toggleFilter, clearFilters, isAllSelected } = useMapStore()

  const totalPins = Object.values(pinCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="absolute top-0 left-0 right-0 z-[40] pointer-events-none">
      <div style={{ height: 'env(safe-area-inset-top, 12px)' }} />

      {/* Agent header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', damping: 25, stiffness: 300 }}
        className="flex items-center justify-between px-4 pt-3 pb-2 pointer-events-auto"
      >
        <div className="glass-heavy rounded-full flex items-center gap-2.5 pl-1.5 pr-4 py-1.5">
          <Avatar src={agent.photoURL} name={agent.displayName} size={36} ring="story" />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-white truncate">{agent.displayName}</p>
            <p className="text-[11px] text-ghost font-medium">
              {totalPins} pins · {agent.followerCount} followers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onFollow}
            className={`glass-heavy rounded-full w-9 h-9 flex items-center justify-center cursor-pointer ${isFollowing ? 'text-tangerine' : 'text-white'}`}
          >
            <UserPlus size={16} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onSave}
            className="glass-heavy rounded-full w-9 h-9 flex items-center justify-center text-white cursor-pointer"
          >
            <Bookmark size={16} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onShare}
            className="glass-heavy rounded-full w-9 h-9 flex items-center justify-center text-white cursor-pointer"
          >
            <Share2 size={16} />
          </motion.button>
        </div>
      </motion.div>

      {/* Multi-select filter pills */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, type: 'spring', damping: 25, stiffness: 300 }}
        className="pointer-events-auto"
      >
        <FilterBar>
          {/* "All" pill */}
          <FilterPill
            label="All"
            active={isAllSelected()}
            onClick={clearFilters}
            count={totalPins}
            dark={false}
          />
          {FILTER_OPTIONS.map((opt) => {
            const Icon = PIN_TYPE_ICONS[opt.value]
            const count = pinCounts[opt.value] || 0
            if (count === 0) return null
            return (
              <FilterPill
                key={opt.value}
                label={opt.label}
                active={activeFilters.has(opt.value)}
                onClick={() => toggleFilter(opt.value)}
                icon={<Icon size={14} />}
                count={count}
                dark={false}
              />
            )
          })}
        </FilterBar>
      </motion.div>
    </div>
  )
}
