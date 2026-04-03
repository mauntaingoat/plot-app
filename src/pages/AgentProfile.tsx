import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { MapCanvas } from '@/components/map/MapCanvas'
import { MapOverlay } from '@/components/map/MapOverlay'
import { PeekDrawer } from '@/components/map/PeekDrawer'
import { ContentFeed } from '@/components/map/ContentFeed'
import { PinCard } from '@/components/dashboard/PinCard'
import { ListingModal } from '@/components/viewers/ListingModal'
import { SidePanel } from '@/components/ui/SidePanel'
import { AgentDetailSheet, type AgentMode } from '@/components/sheets/AgentDetailSheet'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { useMapStore, applyPropertyFilters } from '@/stores/mapStore'
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
  const [loadingComplete, setLoadingComplete] = useState(false)

  // Sheets
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [showAgentDetail, setShowAgentDetail] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [agentMode, setAgentMode] = useState<AgentMode>('single')
  const [enabledAgentIds, setEnabledAgentIds] = useState<Set<string>>(new Set())

  const { setViewingAgentId, activeFilters, propertyFilters } = useMapStore()
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

  // Multi-select filter + property attribute filters
  const filteredPins = useMemo(() => {
    let result = allPins
    if (activeFilters.size > 0) result = result.filter((p) => activeFilters.has(p.type))
    result = applyPropertyFilters(result, propertyFilters)
    return result
  }, [allPins, activeFilters, propertyFilters])

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
    // Increment tap count in Firestore
    import('@/lib/firestore').then(({ incrementPinTap }) => incrementPinTap(pin.id)).catch(() => {})
  }, [allPins])

  const handleFollow = async () => {
    if (!currentUser && !isPreview) {
      setShowAuth(true)
      return
    }
    if (!agent || isPreview) return
    // Real follow/unfollow via Firestore
    const { followAgent, unfollowAgent } = await import('@/lib/firestore')
    if (isFollowing) {
      setIsFollowing(false)
      if (currentUser) await unfollowAgent(currentUser.uid, agent.uid).catch(() => {})
    } else {
      setIsFollowing(true)
      if (currentUser) await followAgent(currentUser.uid, agent.uid).catch(() => {})
    }
  }

  const handleShare = async () => {
    try { await navigator.share({ title: `${agent?.displayName} on Reelst`, url: window.location.href }) }
    catch { navigator.clipboard.writeText(window.location.href) }
  }

  // Loading screen state (hook moved — see below)

  if (loading || !loadingComplete) {
    // Try to get agent info from mock for the loading screen even before full load
    const previewAgent = username ? getMockAgent(username) : null
    return (
      <LoadingScreen
        agentName={agent?.displayName || previewAgent?.displayName}
        agentPhoto={agent?.photoURL || previewAgent?.photoURL}
        onComplete={() => setLoadingComplete(true)}
        minDuration={loading ? 3000 : 1800}
      />
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

  const anyModalOpen = !!selectedPin || showAgentDetail || showAuth
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768

  // ═══════════════════════════════════════════
  // DESKTOP: Split view — Map (left) + Feed (right)
  // ═══════════════════════════════════════════
  if (isDesktop) {
    return (
      <div className="map-page flex" ref={mapContainerRef}>
        {/* Left: Map area — compresses when panel open via CSS transition */}
        <div
          className="relative flex-1 h-screen will-change-[width]"
          style={{
            transition: 'width 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <MapCanvas
            pins={filteredPins}
            agentPhotoUrl={agent.photoURL}
            onPinClick={handlePinClick}
            className="absolute inset-0"
            showBackButton={isPreview}
            onBack={() => navigate('/dashboard')}
          />

          {/* Overlay — filters + agent pill on map */}
          <MapOverlay
            agent={agent}
            pinCounts={pinCounts}
            onFollow={handleFollow}
            onShare={handleShare}
            onProfileClick={() => setShowAgentDetail(true)}
            onFilterChange={handleFilterChange}
            isFollowing={isFollowing}
            viewMode="map"
            isPreview={isPreview}
            agentMode={agentMode}
            enabledAgentCount={enabledAgentIds.size}
          />

          {/* Side panel overlays on top of map */}
          {selectedPin && (
            <SidePanel isOpen={!!selectedPin} onClose={() => setSelectedPin(null)} title={selectedPin?.address}>
              <ListingModal pin={selectedPin} agent={agent} onClose={() => setSelectedPin(null)} isPreview={isPreview} embedded />
            </SidePanel>
          )}

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
        </div>

        {/* Right: Content feed — fixed mobile-width column */}
        <div className="w-[380px] h-screen bg-midnight border-l border-border-dark shrink-0 relative overflow-hidden">
          <ContentFeed
            pins={filteredPins}
            agent={agent}
            onPinTap={(p) => setSelectedPin(p)}
            isPreview={isPreview}
            isSignedIn={!!currentUser}
            onAuthRequired={() => setShowAuth(true)}
          />
        </div>

        {/* Auth */}
        <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} mode="signup" />
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // MOBILE: Toggle between Map and Feed
  // ═══════════════════════════════════════════
  return (
    <div className="map-page" ref={mapContainerRef}>
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
            <ContentFeed pins={filteredPins} agent={agent} onPinTap={(p) => setSelectedPin(p)} isPreview={isPreview} isSignedIn={!!currentUser} onAuthRequired={() => setShowAuth(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay — with toggle on mobile */}
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

      {/* Mobile: full-screen listing modal */}
      {selectedPin && (
        <ListingModal pin={selectedPin} agent={agent} onClose={() => setSelectedPin(null)} isPreview={isPreview} />
      )}

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

      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} mode="signup" />
    </div>
  )
}
