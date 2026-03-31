import { motion } from 'framer-motion'
import { Share2, UserPlus, UserCheck, ChevronDown, Map, Layers } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { FilterPill, FilterBar } from '@/components/ui/FilterPill'
import { useMapStore } from '@/stores/mapStore'
import { type PinType, type UserDoc } from '@/lib/types'
import { PIN_TYPE_ICONS } from '@/components/icons/PinIcons'

interface MapOverlayProps {
  agent: UserDoc
  pinCounts: Record<string, number>
  onFollow?: () => void
  onShare?: () => void
  onProfileClick?: () => void
  onFilterChange?: () => void
  isFollowing?: boolean
  viewMode?: 'map' | 'feed'
  onToggleView?: () => void
}

const FILTER_OPTIONS: { value: PinType; label: string }[] = [
  { value: 'listing', label: 'For Sale' },
  { value: 'sold', label: 'Sold' },
  { value: 'story', label: 'Stories' },
  { value: 'reel', label: 'Reels' },
  { value: 'live', label: 'Live' },
  { value: 'open_house', label: 'Open' },
]

export function MapOverlay({ agent, pinCounts, onFollow, onShare, onProfileClick, onFilterChange, isFollowing, viewMode = 'map', onToggleView }: MapOverlayProps) {
  const { activeFilters, toggleFilter, clearFilters, isAllSelected } = useMapStore()

  const totalPins = Object.values(pinCounts).reduce((a, b) => a + b, 0)

  const handleFilterClick = (value: PinType | 'all') => {
    if (value === 'all') {
      clearFilters()
    } else {
      toggleFilter(value)
    }
    onFilterChange?.()
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-[40] pointer-events-none">
      <div style={{ height: 'env(safe-area-inset-top, 12px)' }} />

      {/* Agent header — dark text for light map */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', damping: 25, stiffness: 300 }}
        className="flex items-center justify-between px-4 pt-3 pb-2 pointer-events-auto"
      >
        {/* Clickable agent pill */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onProfileClick}
          className="bg-white/90 backdrop-blur-md rounded-full flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 shadow-md border border-black/5 cursor-pointer"
        >
          <Avatar src={agent.photoURL} name={agent.displayName} size={36} ring="story" />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink truncate">{agent.displayName}</p>
            <p className="text-[11px] text-smoke font-medium">
              {totalPins} pins · {agent.followerCount.toLocaleString()} followers
            </p>
          </div>
          <ChevronDown size={14} className="text-smoke ml-0.5" />
        </motion.button>

        {/* Action buttons — dark icons */}
        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onFollow}
            className={`bg-white/90 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center cursor-pointer shadow-md border border-black/5 ${isFollowing ? 'text-tangerine' : 'text-ink'}`}
          >
            {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onShare}
            className="bg-white/90 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center text-ink cursor-pointer shadow-md border border-black/5"
          >
            <Share2 size={16} />
          </motion.button>
        </div>
      </motion.div>

      {/* Filter pills + view toggle */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, type: 'spring', damping: 25, stiffness: 300 }}
        className="pointer-events-auto flex items-center"
      >
        <FilterBar className="flex-1">
          <FilterPill
            label="All"
            active={isAllSelected()}
            onClick={() => handleFilterClick('all')}
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
                onClick={() => handleFilterClick(opt.value)}
                icon={<Icon size={14} />}
                count={count}
                dark={false}
              />
            )
          })}
        </FilterBar>

        {/* Map ↔ Feed toggle */}
        {onToggleView && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onToggleView}
            className="mr-4 bg-white/90 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center text-ink cursor-pointer shadow-md border border-black/5 shrink-0"
          >
            {viewMode === 'map' ? <Layers size={16} /> : <Map size={16} />}
          </motion.button>
        )}
      </motion.div>
    </div>
  )
}
