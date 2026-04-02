import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapCanvas } from '@/components/map/MapCanvas'
import { MapOverlay } from '@/components/map/MapOverlay'
import { PeekDrawer } from '@/components/map/PeekDrawer'
import { ContentFeed } from '@/components/map/ContentFeed'
import { PinCard } from '@/components/dashboard/PinCard'
import { ListingModal } from '@/components/viewers/ListingModal'
import { AgentDetailSheet, type AgentMode } from '@/components/sheets/AgentDetailSheet'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { useMapStore } from '@/stores/mapStore'
import { useAuthStore } from '@/stores/authStore'
import { firebaseConfigured } from '@/config/firebase'
import { getUserByUsername } from '@/lib/firestore'
import { getMockAgent, getMockPins, MOCK_AGENTS } from '@/lib/mock'
import type { UserDoc, Pin } from '@/lib/types'

export default function AgentProfile() {
  const { username } = useParams<{ username: string }>()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [agent, setAgent] = useState<UserDoc | null>(null)
  const [allPins, setAllPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'feed'>('map')

  // Sheets
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [showAgentDetail, setShowAgentDetail] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [agentMode, setAgentMode] = useState<AgentMode>('single')
  const [enabledAgentIds, setEnabledAgentIds] = useState<Set<string>>(new Set())

  const { setViewingAgentId, activeFilters } = useMapStore()
  const { userDoc: currentUser } = useAuthStore()

  // Nearby agents (mock: the other agents)
  const nearbyAgents = useMemo(() =>
    MOCK_AGENTS.filter((a) => a.uid !== agent?.uid), [agent])

  // Fetch agent
  useEffect(() => {
    if (!username) return
    setLoading(true)
    // Always check mock agents first (instant), then try Firestore to override
    const mockAgent = getMockAgent(username)
    if (mockAgent) {
      setAgent(mockAgent)
      setAllPins(getMockPins(mockAgent.uid))
      setViewingAgentId(mockAgent.uid)
      setLoading(false)
      return
    }

    // Not a mock agent — try Firestore
    if (firebaseConfigured) {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
      Promise.race([getUserByUsername(username).catch(() => null), timeout])
        .then((doc) => {
          if (doc) {
            setAgent(doc)
            setViewingAgentId(doc.uid)
          } else {
            setNotFound(true)
          }
          setLoading(false)
        })
    } else {
      setNotFound(true)
      setLoading(false)
    }
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

  // Snap map to filtered pins when filter changes
  const handleFilterChange = useCallback(() => {
    const container = mapContainerRef.current?.querySelector('.mapboxgl-canvas')?.parentElement?.parentElement
    if (container && (container as any).__plotFitTo) {
      // Read fresh filter state after Zustand updates
      setTimeout(() => {
        const freshFilters = useMapStore.getState().activeFilters
        const current = freshFilters.size === 0 ? allPins : allPins.filter((p) => freshFilters.has(p.type))
        ;(container as any).__plotFitTo(current)
      }, 100)
    }
  }, [allPins])

  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin)
  }, [allPins])

  const handleFollow = () => {
    if (!currentUser && !isPreview) {
      setShowAuth(true)
      return
    }
    setIsFollowing(!isFollowing)
  }

  const handleShare = async () => {
    try { await navigator.share({ title: `${agent?.displayName} on Reelst`, url: window.location.href }) }
    catch { navigator.clipboard.writeText(window.location.href) }
  }

  if (loading) {
    return (
      <div className="map-page flex items-center justify-center bg-midnight">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-tangerine border-t-transparent rounded-full" />
      </div>
    )
  }

  if (notFound || !agent) {
    return (
      <div className="map-page flex flex-col items-center justify-center text-center px-6 bg-midnight">
        <div className="w-16 h-16 rounded-full bg-charcoal flex items-center justify-center mb-4">
          <span className="text-[28px] text-ghost">?</span>
        </div>
        <h1 className="text-[24px] font-extrabold text-white mb-2">Reelst not found</h1>
        <p className="text-[15px] text-ghost mb-6">@{username} doesn't have a Reelst yet.</p>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate('/')} className="text-tangerine font-semibold text-[15px]">Go home</motion.button>
      </div>
    )
  }

  // Any modal open?
  const anyModalOpen = !!selectedPin || showAgentDetail || showAuth

  return (
    <div className="map-page" ref={mapContainerRef}>
      {/* Map or Feed */}
      <AnimatePresence mode="wait">
        {viewMode === 'map' ? (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            <MapCanvas
              pins={filteredPins}
              agentPhotoUrl={agent.photoURL}
              onPinClick={handlePinClick}
              className="absolute inset-0"
              showBackButton={isPreview}
              onBack={() => navigate('/dashboard')}
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
          </motion.div>
        ) : (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            <ContentFeed pins={filteredPins} agent={agent} onPinTap={(p) => setSelectedPin(p)} isPreview={isPreview} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <MapOverlay
        agent={agent}
        pinCounts={pinCounts}
        onFollow={handleFollow}
        onShare={handleShare}
        onProfileClick={() => setShowAgentDetail(true)}
        onFilterChange={handleFilterChange}
        isFollowing={isFollowing}
        viewMode={viewMode}
        onToggleView={() => setViewMode(viewMode === 'map' ? 'feed' : 'map')}
        isPreview={isPreview}
        agentMode={agentMode}
        enabledAgentCount={enabledAgentIds.size}
      />

      {/* Listing modal — two tabs (Content / Listing) */}
      {selectedPin && (
        <ListingModal pin={selectedPin} agent={agent} onClose={() => setSelectedPin(null)} isPreview={isPreview} />
      )}

      {/* Agent detail */}
      <AgentDetailSheet
        isOpen={showAgentDetail}
        onClose={() => setShowAgentDetail(false)}
        agent={agent}
        isFollowing={isFollowing}
        onFollow={handleFollow}
        nearbyAgents={nearbyAgents}
        enabledAgentIds={enabledAgentIds}
        onToggleAgent={(id) => {
          setEnabledAgentIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
        }}
        onAgentTap={(a) => { setShowAgentDetail(false); navigate(`/${a.username}`) }}
        isPreview={isPreview}
        agentMode={agentMode}
        onSetMode={setAgentMode}
      />

      {/* Consumer auth prompt */}
      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} mode="signup" />
    </div>
  )
}
