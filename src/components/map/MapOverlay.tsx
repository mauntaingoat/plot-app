import { motion } from 'framer-motion'
import { Share2, UserPlus, UserCheck, ChevronDown, Map, Layers, Users, Globe } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { FilterPill, FilterBar } from '@/components/ui/FilterPill'
import { useMapStore } from '@/stores/mapStore'
import { type PinType, type UserDoc } from '@/lib/types'
import type { AgentMode } from '@/components/sheets/AgentDetailSheet'

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
  isPreview?: boolean
  agentMode?: AgentMode
  enabledAgentCount?: number
}

const FILTER_OPTIONS: { value: PinType; label: string }[] = [
  { value: 'for_sale', label: 'For Sale' },
  { value: 'sold', label: 'Sold' },
  { value: 'neighborhood', label: 'Neighborhoods' },
]

export function MapOverlay({ agent, pinCounts, onFollow, onShare, onProfileClick, onFilterChange, isFollowing, viewMode = 'map', onToggleView, isPreview, agentMode = 'single', enabledAgentCount = 0 }: MapOverlayProps) {
  const { activeFilters, toggleFilter, clearFilters, isAllSelected } = useMapStore()

  const totalPins = Object.values(pinCounts).reduce((a, b) => a + b, 0)
  const isFeed = viewMode === 'feed'

  const pillBg = isFeed ? 'bg-black/30 backdrop-blur-md border-white/10' : 'bg-white/90 backdrop-blur-md border-black/5'
  const pillText = isFeed ? 'text-white' : 'text-ink'
  const pillSecText = isFeed ? 'text-white/60' : 'text-smoke'

  const handleFilterClick = (value: PinType | 'all') => {
    if (value === 'all') clearFilters()
    else toggleFilter(value)
    onFilterChange?.()
  }

  // Determine what the top-left pill shows based on agent mode
  const renderAgentPill = () => {
    if (agentMode === 'following') {
      return (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onProfileClick}
          className={`${pillBg} rounded-full flex items-center gap-2.5 pl-3 pr-3 py-2 shadow-md border cursor-pointer`}
        >
          <Users size={18} className={isFeed ? 'text-tangerine' : 'text-tangerine'} />
          <div className="min-w-0">
            <p className={`text-[14px] font-bold ${pillText}`}>Following</p>
            <p className={`text-[11px] font-medium ${pillSecText}`}>
              {enabledAgentCount} agent{enabledAgentCount !== 1 ? 's' : ''} · {totalPins} pins
            </p>
          </div>
          <ChevronDown size={14} className={pillSecText + ' ml-0.5'} />
        </motion.button>
      )
    }

    if (agentMode === 'explore') {
      return (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onProfileClick}
          className={`${pillBg} rounded-full flex items-center gap-2.5 pl-3 pr-3 py-2 shadow-md border cursor-pointer`}
        >
          <Globe size={18} className={isFeed ? 'text-tangerine' : 'text-tangerine'} />
          <div className="min-w-0">
            <p className={`text-[14px] font-bold ${pillText}`}>Explore All</p>
            <p className={`text-[11px] font-medium ${pillSecText}`}>
              All agents · {totalPins} pins
            </p>
          </div>
          <ChevronDown size={14} className={pillSecText + ' ml-0.5'} />
        </motion.button>
      )
    }

    // Single agent (default)
    return (
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onProfileClick}
        className={`${pillBg} rounded-full flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 shadow-md border cursor-pointer`}
      >
        <Avatar src={agent.photoURL} name={agent.displayName} size={36} ring="story" />
        <div className="min-w-0">
          <p className={`text-[14px] font-bold truncate ${pillText}`}>{agent.displayName}</p>
          <p className={`text-[11px] font-medium ${pillSecText}`}>
            {totalPins} pins · {agent.followerCount.toLocaleString()} followers
          </p>
        </div>
        <ChevronDown size={14} className={pillSecText + ' ml-0.5'} />
      </motion.button>
    )
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-[40] pointer-events-none">
      <div style={{ height: 'env(safe-area-inset-top, 12px)' }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3, ease: 'easeOut' }}
        className="flex items-center justify-between px-4 pt-3 pb-2 pointer-events-auto"
      >
        {renderAgentPill()}

        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={!isPreview ? { scale: 0.88 } : undefined}
            onClick={!isPreview ? onFollow : undefined}
            className={`${pillBg} rounded-full w-9 h-9 flex items-center justify-center cursor-pointer shadow-md border ${isFollowing ? 'text-tangerine' : pillText} ${isPreview ? 'opacity-40' : ''}`}
          >
            {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
          </motion.button>
          <motion.button
            whileTap={!isPreview ? { scale: 0.88 } : undefined}
            onClick={!isPreview ? onShare : undefined}
            className={`${pillBg} rounded-full w-9 h-9 flex items-center justify-center ${pillText} cursor-pointer shadow-md border ${isPreview ? 'opacity-40' : ''}`}
          >
            <Share2 size={16} />
          </motion.button>
        </div>
      </motion.div>

      {/* Filters + toggle */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3, ease: 'easeOut' }}
        className="pointer-events-auto flex items-center"
      >
        <FilterBar className="flex-1">
          <FilterPill label="All" active={isAllSelected()} onClick={() => handleFilterClick('all')} count={totalPins} dark={isFeed} />
          {FILTER_OPTIONS.map((opt) => {
            const count = pinCounts[opt.value] || 0
            if (count === 0) return null
            return (
              <FilterPill key={opt.value} label={opt.label} active={activeFilters.has(opt.value)} onClick={() => handleFilterClick(opt.value)} count={count} dark={isFeed} />
            )
          })}
        </FilterBar>

        {onToggleView && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onToggleView}
            className={`mr-4 ml-3 ${pillBg} rounded-full w-9 h-9 flex items-center justify-center ${pillText} cursor-pointer shadow-md border shrink-0`}
          >
            {viewMode === 'map' ? <Layers size={16} /> : <Map size={16} />}
          </motion.button>
        )}
      </motion.div>
    </div>
  )
}
