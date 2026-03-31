import { motion } from 'framer-motion'
import { Share2, Bookmark, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { FilterPill, FilterBar } from '@/components/ui/FilterPill'
import { Badge } from '@/components/ui/Badge'
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

const FILTER_OPTIONS: { value: PinType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'listing', label: 'For Sale' },
  { value: 'sold', label: 'Sold' },
  { value: 'story', label: 'Stories' },
  { value: 'reel', label: 'Reels' },
  { value: 'live', label: 'Live' },
  { value: 'open_house', label: 'Open' },
]

export function MapOverlay({ agent, pinCounts, onFollow, onShare, onSave, isFollowing }: MapOverlayProps) {
  const { activeFilter, setActiveFilter } = useMapStore()

  const totalPins = Object.values(pinCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="absolute top-0 left-0 right-0 z-[40] pointer-events-none">
      {/* Safe area spacer */}
      <div style={{ height: 'env(safe-area-inset-top, 12px)' }} />

      {/* Agent header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', damping: 25, stiffness: 300 }}
        className="flex items-center justify-between px-4 pt-3 pb-2 pointer-events-auto"
      >
        {/* Agent pill */}
        <div className="glass-heavy rounded-full flex items-center gap-2.5 pl-1.5 pr-4 py-1.5">
          <Avatar
            src={agent.photoURL}
            name={agent.displayName}
            size={36}
            ring={agent.onboardingComplete ? 'story' : 'none'}
          />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-white truncate">{agent.displayName}</p>
            <p className="text-[11px] text-ghost font-medium">
              {totalPins} pins · {agent.followerCount} followers
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onFollow}
            className={`
              glass-heavy rounded-full w-9 h-9 flex items-center justify-center cursor-pointer
              ${isFollowing ? 'text-tangerine' : 'text-white'}
            `}
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

      {/* Filter pills */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, type: 'spring', damping: 25, stiffness: 300 }}
        className="pointer-events-auto"
      >
        <FilterBar>
          {FILTER_OPTIONS.map((opt) => {
            const Icon = opt.value !== 'all' ? PIN_TYPE_ICONS[opt.value] : null
            const count = opt.value === 'all' ? totalPins : (pinCounts[opt.value] || 0)
            if (opt.value !== 'all' && count === 0) return null
            return (
              <FilterPill
                key={opt.value}
                label={opt.label}
                active={activeFilter === opt.value}
                onClick={() => setActiveFilter(opt.value)}
                icon={Icon ? <Icon size={14} /> : undefined}
                count={count}
                dark
              />
            )
          })}
        </FilterBar>
      </motion.div>
    </div>
  )
}
