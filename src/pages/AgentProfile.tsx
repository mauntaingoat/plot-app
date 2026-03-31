import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapCanvas } from '@/components/map/MapCanvas'
import { MapOverlay } from '@/components/map/MapOverlay'
import { PeekDrawer } from '@/components/map/PeekDrawer'
import { PinCard } from '@/components/dashboard/PinCard'
import { StoryViewer } from '@/components/viewers/StoryViewer'
import { ReelPlayer } from '@/components/viewers/ReelPlayer'
import { ListingSheet } from '@/components/viewers/ListingSheet'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useAgentPins } from '@/hooks/usePins'
import { useFollow } from '@/hooks/useFollow'
import { useMapStore } from '@/stores/mapStore'
import { useAuthStore } from '@/stores/authStore'
import { getUserByUsername } from '@/lib/firestore'
import type { UserDoc, Pin, StoryPin, ReelPin, ListingPin, SoldPin, OpenHousePin } from '@/lib/types'

export default function AgentProfile() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [agent, setAgent] = useState<UserDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Viewer states
  const [storyViewer, setStoryViewer] = useState<{ stories: StoryPin[]; index: number } | null>(null)
  const [reelViewer, setReelViewer] = useState<ReelPin | null>(null)
  const [listingSheet, setListingSheet] = useState<(ListingPin | SoldPin | OpenHousePin) | null>(null)
  const [showAuth, setShowAuth] = useState(false)

  const { setViewingAgentId, selectedPin, setSelectedPin } = useMapStore()
  const { firebaseUser } = useAuthStore()
  const { filteredPins, pins } = useAgentPins(agent?.uid || null)
  const { isFollowing, toggle: toggleFollow, needsAuth } = useFollow(agent?.uid || null)

  // Fetch agent
  useEffect(() => {
    if (!username) return
    setLoading(true)
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

  // Pin type counts
  const pinCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    pins.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1 })
    return counts
  }, [pins])

  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin)

    if (pin.type === 'story') {
      const stories = pins.filter((p): p is StoryPin => p.type === 'story')
      const idx = stories.findIndex((s) => s.id === pin.id)
      setStoryViewer({ stories, index: Math.max(idx, 0) })
    } else if (pin.type === 'reel') {
      setReelViewer(pin as ReelPin)
    } else if (pin.type === 'listing' || pin.type === 'sold' || pin.type === 'open_house') {
      setListingSheet(pin as ListingPin | SoldPin | OpenHousePin)
    }
  }, [pins, setSelectedPin])

  const handleFollow = () => {
    if (needsAuth) {
      setShowAuth(true)
      return
    }
    toggleFollow()
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${agent?.displayName} on Plot`,
        url: window.location.href,
      })
    } catch {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-tangerine border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (notFound || !agent) {
    return (
      <div className="min-h-screen bg-midnight flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-full bg-charcoal flex items-center justify-center mb-4">
          <span className="text-[28px]">?</span>
        </div>
        <h1 className="text-[24px] font-extrabold text-white mb-2">Plot not found</h1>
        <p className="text-[15px] text-ghost mb-6">@{username} doesn't have a Plot yet.</p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/')}
          className="text-tangerine font-semibold text-[15px]"
        >
          Go home
        </motion.button>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-midnight relative">
      {/* Map */}
      <MapCanvas
        pins={filteredPins}
        onPinClick={handlePinClick}
        className="absolute inset-0"
      />

      {/* Overlay (agent header + filters) */}
      <MapOverlay
        agent={agent}
        pinCounts={pinCounts}
        onFollow={handleFollow}
        onShare={handleShare}
        isFollowing={isFollowing}
      />

      {/* Peek drawer */}
      <PeekDrawer
        collapsedContent={
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-white">
              {filteredPins.length} pin{filteredPins.length !== 1 ? 's' : ''}
            </p>
            <p className="text-[12px] text-ghost">Drag up to explore</p>
          </div>
        }
      >
        <div className="px-4 pb-32">
          {/* Grid of pin cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {filteredPins.map((pin) => (
              <PinCard
                key={pin.id}
                pin={pin}
                onClick={() => handlePinClick(pin)}
                dark
              />
            ))}
          </div>

          {filteredPins.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[15px] text-ghost">No pins to show</p>
            </div>
          )}
        </div>
      </PeekDrawer>

      {/* Story viewer */}
      {storyViewer && (
        <StoryViewer
          stories={storyViewer.stories}
          agent={agent}
          initialIndex={storyViewer.index}
          onClose={() => setStoryViewer(null)}
        />
      )}

      {/* Reel player */}
      {reelViewer && (
        <ReelPlayer
          reel={reelViewer}
          agent={agent}
          onClose={() => setReelViewer(null)}
          onFollow={handleFollow}
          isFollowing={isFollowing}
        />
      )}

      {/* Listing sheet */}
      {listingSheet && (
        <ListingSheet
          pin={listingSheet}
          agent={agent}
          isOpen
          onClose={() => setListingSheet(null)}
        />
      )}

      {/* Auth sheet */}
      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
