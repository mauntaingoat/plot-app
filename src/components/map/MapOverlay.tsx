import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShareNetwork as Share2, UserPlus, UserCircleCheck as UserCheck, CaretDown as ChevronDown, MapTrifold as Map, Stack as Layers, Users, Globe, Crosshair as Locate, BookmarkSimple as Bookmark } from '@phosphor-icons/react'
import { Avatar } from '@/components/ui/Avatar'
import { formatCompact } from '@/lib/format'
import { FilterBar } from '@/components/ui/FilterPill'
import { FilterDropdown } from '@/components/ui/FilterDropdown'
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
  hideHeader?: boolean
  centerFilters?: boolean
  onFitToPins?: () => void
}

const FILTER_OPTIONS: { value: PinType; label: string }[] = [
  { value: 'for_sale', label: 'For Sale' },
  { value: 'sold', label: 'Sold' },
  { value: 'spotlight', label: 'Spotlights' },
]

export function MapOverlay({ agent, pinCounts, onFollow, onShare, onProfileClick, onFilterChange, isFollowing, viewMode = 'map', onToggleView, isPreview, agentMode = 'single', enabledAgentCount = 0, hideHeader, centerFilters, onFitToPins }: MapOverlayProps) {
  const { activeFilters, toggleFilter, clearFilters, isAllSelected, propertyFilters, togglePropertyFilter, clearPropertyFilter } = useMapStore()

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

    if (agentMode === 'saved') {
      return (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onProfileClick}
          className={`${pillBg} rounded-full flex items-center gap-2.5 pl-3 pr-3 py-2 shadow-md border cursor-pointer`}
        >
          <Bookmark size={18} className="text-tangerine" />
          <div className="min-w-0">
            <p className={`text-[14px] font-bold ${pillText}`}>My Saved Map</p>
            <p className={`text-[11px] font-medium ${pillSecText}`}>
              {totalPins} saved pin{totalPins !== 1 ? 's' : ''}
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
            <p className={`text-[14px] font-bold ${pillText}`}>Explore</p>
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
            {totalPins} pins · {formatCompact(agent.followerCount)} followers
          </p>
        </div>
        <ChevronDown size={14} className={pillSecText + ' ml-0.5'} />
      </motion.button>
    )
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-[40] pointer-events-none">
      {!hideHeader && <div style={{ height: 'env(safe-area-inset-top, 12px)' }} />}

      {/* Header — hidden when pill is external (desktop) */}
      {!hideHeader && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3, ease: 'easeOut' }}
          className="flex items-center justify-between px-4 pt-3 pb-2 pointer-events-auto"
        >
          {renderAgentPill()}

          <div className="flex items-center gap-1.5">
            {agentMode === 'single' && (
              <motion.button
                whileTap={!isPreview ? { scale: 0.88 } : undefined}
                onClick={!isPreview ? onFollow : undefined}
                className={`${pillBg} rounded-full w-9 h-9 flex items-center justify-center cursor-pointer shadow-md border ${isFollowing ? 'text-tangerine' : pillText} ${isPreview ? 'opacity-40' : ''}`}
              >
                {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
              </motion.button>
            )}
            <motion.button
              whileTap={!isPreview ? { scale: 0.88 } : undefined}
              onClick={!isPreview ? onShare : undefined}
              className={`${pillBg} rounded-full w-9 h-9 flex items-center justify-center ${pillText} cursor-pointer shadow-md border ${isPreview ? 'opacity-40' : ''}`}
            >
              <Share2 size={16} />
            </motion.button>
            {onFitToPins && agentMode !== 'explore' && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onFitToPins}
                className={`${pillBg} rounded-full w-9 h-9 flex items-center justify-center ${pillText} cursor-pointer shadow-md border`}
              >
                <Locate size={16} />
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* Filters + toggle */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: hideHeader ? 0.3 : 0.45, duration: 0.3, ease: 'easeOut' }}
        className={`pointer-events-auto flex items-center ${centerFilters ? 'justify-center' : ''} ${hideHeader ? 'pt-3' : ''}`}
        style={{ touchAction: 'pan-x' }}
      >
        <FilterBar className={centerFilters ? '' : 'flex-1'}>
          <FilterDropdown label="Pin Type" dark={isFeed}
            options={FILTER_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} (${pinCounts[o.value] || 0})` }))}
            selected={activeFilters} onToggle={(v) => handleFilterClick(v as PinType)} onClear={clearFilters} />
          <FilterDropdown label="Price" dark={isFeed}
            options={[{ value: '0-500k', label: 'Under $500K' }, { value: '500k-1m', label: '$500K–$1M' }, { value: '1m-2m', label: '$1M–$2M' }, { value: '2m-5m', label: '$2M–$5M' }, { value: '5m+', label: '$5M+' }]}
            selected={propertyFilters.price} onToggle={(v) => togglePropertyFilter('price', v)} onClear={() => clearPropertyFilter('price')} />
          <FilterDropdown label="Beds" dark={isFeed}
            options={[{ value: '1', label: '1+' }, { value: '2', label: '2+' }, { value: '3', label: '3+' }, { value: '4', label: '4+' }, { value: '5', label: '5+' }]}
            selected={propertyFilters.beds} onToggle={(v) => togglePropertyFilter('beds', v)} onClear={() => clearPropertyFilter('beds')} />
          <FilterDropdown label="Baths" dark={isFeed}
            options={[{ value: '1', label: '1+' }, { value: '2', label: '2+' }, { value: '3', label: '3+' }, { value: '4', label: '4+' }]}
            selected={propertyFilters.baths} onToggle={(v) => togglePropertyFilter('baths', v)} onClear={() => clearPropertyFilter('baths')} />
          <FilterDropdown label="Type" dark={isFeed}
            options={[{ value: 'single_family', label: 'Single Family' }, { value: 'condo', label: 'Condo' }, { value: 'townhouse', label: 'Townhouse' }, { value: 'multi_family', label: 'Multi-Family' }, { value: 'land', label: 'Land' }, { value: 'commercial', label: 'Commercial' }]}
            selected={propertyFilters.homeType} onToggle={(v) => togglePropertyFilter('homeType', v)} onClear={() => clearPropertyFilter('homeType')} />
          <FilterDropdown label="Sqft" dark={isFeed}
            options={[{ value: '0-1000', label: 'Under 1,000' }, { value: '1000-1500', label: '1,000–1,500' }, { value: '1500-2000', label: '1,500–2,000' }, { value: '2000-3000', label: '2,000–3,000' }, { value: '3000+', label: '3,000+' }]}
            selected={propertyFilters.sqft} onToggle={(v) => togglePropertyFilter('sqft', v)} onClear={() => clearPropertyFilter('sqft')} />
          <FilterDropdown label="Year" dark={isFeed}
            options={[{ value: '2020+', label: '2020+' }, { value: '2010-2019', label: '2010–2019' }, { value: '2000-2009', label: '2000–2009' }, { value: '1990-1999', label: '1990–1999' }, { value: 'pre-1990', label: 'Pre-1990' }]}
            selected={propertyFilters.yearBuilt} onToggle={(v) => togglePropertyFilter('yearBuilt', v)} onClear={() => clearPropertyFilter('yearBuilt')} />
          <FilterDropdown label="DOM" dark={isFeed}
            options={[{ value: '0-7', label: '< 7 days' }, { value: '7-14', label: '7–14' }, { value: '14-30', label: '14–30' }, { value: '30-60', label: '30–60' }, { value: '60+', label: '60+' }]}
            selected={propertyFilters.dom} onToggle={(v) => togglePropertyFilter('dom', v)} onClear={() => clearPropertyFilter('dom')} />
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
