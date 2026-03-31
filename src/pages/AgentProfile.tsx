import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapCanvas } from '@/components/map/MapCanvas'
import { MapOverlay } from '@/components/map/MapOverlay'
import { PeekDrawer } from '@/components/map/PeekDrawer'
import { PinCard } from '@/components/dashboard/PinCard'
import { StoryViewer } from '@/components/viewers/StoryViewer'
import { ReelPlayer } from '@/components/viewers/ReelPlayer'
import { ListingSheet } from '@/components/viewers/ListingSheet'
import { useMapStore } from '@/stores/mapStore'
import { firebaseConfigured } from '@/config/firebase'
import { getUserByUsername } from '@/lib/firestore'
import { getMockAgent, getMockPins } from '@/lib/mock'
import type { UserDoc, Pin, StoryPin, ReelPin, ListingPin, SoldPin, OpenHousePin } from '@/lib/types'

export default function AgentProfile() {
  const { username } = useParams<{ username: string }>()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const navigate = useNavigate()
  const [agent, setAgent] = useState<UserDoc | null>(null)
  const [allPins, setAllPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  const [storyViewer, setStoryViewer] = useState<{ stories: StoryPin[]; index: number } | null>(null)
  const [reelViewer, setReelViewer] = useState<ReelPin | null>(null)
  const [listingSheet, setListingSheet] = useState<(ListingPin | SoldPin | OpenHousePin) | null>(null)

  const { setViewingAgentId, activeFilters } = useMapStore()

  useEffect(() => {
    if (!username) return
    setLoading(true)

    if (!firebaseConfigured) {
      const mockAgent = getMockAgent(username)
      if (mockAgent) {
        setAgent(mockAgent)
        setAllPins(getMockPins(mockAgent.uid))
        setViewingAgentId(mockAgent.uid)
      } else {
        setNotFound(true)
      }
      setLoading(false)
      return
    }

    getUserByUsername(username)
      .then((doc) => {
        if (doc) {
          setAgent(doc)
          setViewingAgentId(doc.uid)
        } else {
          setNotFound(true)
        }
      })
      .finally(() => setLoading(false))
  }, [username, setViewingAgentId])

  // Multi-select filter
  const filteredPins = useMemo(() => {
    if (activeFilters.size === 0) return allPins
    return allPins.filter((p) => activeFilters.has(p.type))
  }, [allPins, activeFilters])

  const pinCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allPins.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1 })
    return counts
  }, [allPins])

  const handlePinClick = useCallback((pin: Pin) => {
    if (pin.type === 'story') {
      const stories = allPins.filter((p): p is StoryPin => p.type === 'story')
      const idx = stories.findIndex((s) => s.id === pin.id)
      setStoryViewer({ stories, index: Math.max(idx, 0) })
    } else if (pin.type === 'reel') {
      setReelViewer(pin as ReelPin)
    } else if (pin.type === 'listing' || pin.type === 'sold' || pin.type === 'open_house') {
      setListingSheet(pin as ListingPin | SoldPin | OpenHousePin)
    }
  }, [allPins])

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-tangerine border-t-transparent rounded-full" />
      </div>
    )
  }

  if (notFound || !agent) {
    return (
      <div className="min-h-screen bg-midnight flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-full bg-charcoal flex items-center justify-center mb-4">
          <span className="text-[28px] text-ghost">?</span>
        </div>
        <h1 className="text-[24px] font-extrabold text-white mb-2">Plot not found</h1>
        <p className="text-[15px] text-ghost mb-6">@{username} doesn't have a Plot yet.</p>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate('/')} className="text-tangerine font-semibold text-[15px]">Go home</motion.button>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-midnight relative">
      <MapCanvas
        pins={filteredPins}
        agentPhotoUrl={agent.photoURL}
        onPinClick={handlePinClick}
        className="absolute inset-0"
        showBackButton={isPreview}
        onBack={() => navigate('/dashboard')}
      />

      <MapOverlay
        agent={agent}
        pinCounts={pinCounts}
        onFollow={() => setIsFollowing(!isFollowing)}
        onShare={async () => {
          try { await navigator.share({ title: `${agent.displayName} on Plot`, url: window.location.href }) }
          catch { navigator.clipboard.writeText(window.location.href) }
        }}
        isFollowing={isFollowing}
      />

      <PeekDrawer
        collapsedContent={
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-white">{filteredPins.length} pin{filteredPins.length !== 1 ? 's' : ''}</p>
            <p className="text-[12px] text-ghost">Drag up to explore</p>
          </div>
        }
      >
        <div className="px-4 pb-32">
          <div className="grid grid-cols-2 gap-3 pt-2">
            {filteredPins.map((pin) => (
              <PinCard key={pin.id} pin={pin} onClick={() => handlePinClick(pin)} dark />
            ))}
          </div>
          {filteredPins.length === 0 && (
            <div className="py-16 text-center"><p className="text-[15px] text-ghost">No pins to show</p></div>
          )}
        </div>
      </PeekDrawer>

      {storyViewer && <StoryViewer stories={storyViewer.stories} agent={agent} initialIndex={storyViewer.index} onClose={() => setStoryViewer(null)} />}
      {reelViewer && <ReelPlayer reel={reelViewer} agent={agent} onClose={() => setReelViewer(null)} onFollow={() => setIsFollowing(!isFollowing)} isFollowing={isFollowing} />}
      {listingSheet && <ListingSheet pin={listingSheet} agent={agent} isOpen onClose={() => setListingSheet(null)} />}
    </div>
  )
}
