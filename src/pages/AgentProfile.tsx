import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Share2, UserPlus, UserCheck, ChevronDown, Users, Globe } from 'lucide-react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { MapCanvas } from '@/components/map/MapCanvas'
import { MapOverlay } from '@/components/map/MapOverlay'
import { PeekDrawer } from '@/components/map/PeekDrawer'
import { ContentFeed } from '@/components/map/ContentFeed'
import { PinCard } from '@/components/dashboard/PinCard'
import { ListingModal } from '@/components/viewers/ListingModal'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Avatar } from '@/components/ui/Avatar'
import { AgentDetailSheet, type AgentMode } from '@/components/sheets/AgentDetailSheet'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { useMapStore, applyPropertyFilters } from '@/stores/mapStore'
import { useAuthStore } from '@/stores/authStore'
import { firebaseConfigured } from '@/config/firebase'
import { getUserByUsername } from '@/lib/firestore'
import { getMockAgent, getMockPins, MOCK_AGENTS } from '@/lib/mock'
import type { UserDoc, Pin } from '@/lib/types'

function useIsDesktop() {
  const [d, setD] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = (e: MediaQueryListEvent) => setD(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return d
}

export default function AgentProfile() {
  const { username } = useParams<{ username: string }>()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  const [agent, setAgent] = useState<UserDoc | null>(null)
  const [allPins, setAllPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'feed'>('map')
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [feedExpanded, setFeedExpanded] = useState(false)

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [showAgentDetail, setShowAgentDetail] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [agentMode, setAgentMode] = useState<AgentMode>('single')
  const [enabledAgentIds, setEnabledAgentIds] = useState<Set<string>>(new Set())

  const { setViewingAgentId, activeFilters, propertyFilters } = useMapStore()
  const { userDoc: currentUser } = useAuthStore()

  const nearbyAgents = useMemo(() =>
    MOCK_AGENTS.filter((a) => a.uid !== agent?.uid), [agent])

  useEffect(() => {
    if (!username) return
    setLoading(true)
    const mockAgent = getMockAgent(username)
    if (mockAgent) {
      setAgent(mockAgent)
      setAllPins(getMockPins(mockAgent.uid))
      setViewingAgentId(mockAgent.uid)
      setLoading(false)
      return
    }
    if (firebaseConfigured) {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
      Promise.race([getUserByUsername(username).catch(() => null), timeout])
        .then((doc) => {
          if (doc) { setAgent(doc); setViewingAgentId(doc.uid) }
          else setNotFound(true)
          setLoading(false)
        })
    } else { setNotFound(true); setLoading(false) }
  }, [username, setViewingAgentId])

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

  const handleFilterChange = useCallback(() => {
    const container = mapContainerRef.current?.querySelector('.mapboxgl-canvas')?.parentElement?.parentElement
    if (container && (container as any).__plotFitTo) {
      setTimeout(() => {
        const freshFilters = useMapStore.getState().activeFilters
        const current = freshFilters.size === 0 ? allPins : allPins.filter((p) => freshFilters.has(p.type))
        ;(container as any).__plotFitTo(current)
      }, 100)
    }
  }, [allPins])

  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin)
    import('@/lib/firestore').then(({ incrementPinTap }) => incrementPinTap(pin.id)).catch(() => {})
  }, [allPins])

  const handleFollow = async () => {
    if (!currentUser && !isPreview) { setShowAuth(true); return }
    if (!agent || isPreview) return
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

  if (loading || !loadingComplete) {
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

  const totalPins = Object.values(pinCounts).reduce((a, b) => a + b, 0)

  // ═══════════════════════════════════════════
  // DESKTOP
  // ═══════════════════════════════════════════
  const PAD = 28
  const FEED_W = 380 // phone-width — fits content strip + right icons + caption
  const GAP = 12
  const PILL_OVERLAP = 28 // how much the pill overlaps into the map
  const FILTERS_TOP = PAD + 68 // pill bottom (~60px height) + 12px gap

  if (isDesktop) {
    // Render the pill content based on agentMode
    const renderPillContent = () => {
      if (agentMode === 'following') {
        return (
          <>
            <div className="w-10 h-10 rounded-full bg-tangerine/10 flex items-center justify-center">
              <Users size={18} className="text-tangerine" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[15px] font-bold text-ink">Following</p>
              <p className="text-[11px] font-medium text-smoke">
                {enabledAgentIds.size} agent{enabledAgentIds.size !== 1 ? 's' : ''} · {totalPins} pins
              </p>
            </div>
          </>
        )
      }
      if (agentMode === 'explore') {
        return (
          <>
            <div className="w-10 h-10 rounded-full bg-tangerine/10 flex items-center justify-center">
              <Globe size={18} className="text-tangerine" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[15px] font-bold text-ink">Explore All</p>
              <p className="text-[11px] font-medium text-smoke">All agents · {totalPins} pins</p>
            </div>
          </>
        )
      }
      return (
        <>
          <Avatar src={agent.photoURL} name={agent.displayName} size={44} ring="story" />
          <div className="min-w-0 text-left">
            <p className="text-[15px] font-bold text-ink truncate">{agent.displayName}</p>
            <p className="text-[11px] font-medium text-smoke">
              {totalPins} pins · {agent.followerCount.toLocaleString()} followers
            </p>
          </div>
        </>
      )
    }

    return (
      <div className="map-page" style={{ background: '#FBECDE' }} ref={mapContainerRef}>

        {/* ── Header row: pill (center) + follow/share — straddles map top ── */}
        <div
          className="absolute z-[60] flex items-center justify-center pointer-events-none"
          style={{ top: PAD, left: 0, right: 0 }}
        >
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Pill */}
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAgentDetail(true)}
              className="bg-white/95 backdrop-blur-md rounded-full flex items-center gap-3 pl-2 pr-4 py-2 shadow-lg border border-black/5 cursor-pointer"
            >
              {renderPillContent()}
              <ChevronDown size={14} className="text-smoke ml-1" />
            </motion.button>

            {/* Follow */}
            <motion.button
              whileTap={!isPreview ? { scale: 0.88 } : undefined}
              onClick={!isPreview ? handleFollow : undefined}
              className={`bg-white/90 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center cursor-pointer shadow-md border border-black/5 ${isFollowing ? 'text-tangerine' : 'text-ink'} ${isPreview ? 'opacity-40' : ''}`}
            >
              {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
            </motion.button>

            {/* Share */}
            <motion.button
              whileTap={!isPreview ? { scale: 0.88 } : undefined}
              onClick={!isPreview ? handleShare : undefined}
              className={`bg-white/90 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center text-ink cursor-pointer shadow-md border border-black/5 ${isPreview ? 'opacity-40' : ''}`}
            >
              <Share2 size={15} />
            </motion.button>
          </div>
        </div>

        {/* ── Filters — centered under pill, page-wide ── */}
        <div
          className="absolute z-[55] pointer-events-none"
          style={{ top: FILTERS_TOP, left: 0, right: 0 }}
        >
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
            hideHeader
            centerFilters
          />
        </div>

        {/* ── Map container — top aligns so pill straddles halfway ── */}
        <div
          className="absolute rounded-3xl overflow-hidden shadow-2xl will-change-[left,right]"
          style={{
            top: PAD + PILL_OVERLAP,
            bottom: PAD,
            left: PAD,
            right: feedExpanded ? FEED_W + GAP + PAD : PAD,
            transition: 'right 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
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
        </div>

        {/* ── Expand/collapse button — always on map's right edge ── */}
        <button
          onClick={() => setFeedExpanded(!feedExpanded)}
          className="absolute z-[50] w-11 h-11 rounded-full bg-tangerine text-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          style={{
            top: '50%',
            marginTop: -22,
            right: feedExpanded ? FEED_W + GAP + PAD - 22 : PAD - 22,
            transition: 'right 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {feedExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* ── Content feed — mobile width, rounded, slides in ── */}
        <div
          className="absolute rounded-3xl bg-midnight shadow-2xl overflow-hidden will-change-transform"
          style={{
            top: PAD + PILL_OVERLAP,
            bottom: PAD,
            right: PAD,
            width: FEED_W,
            transform: feedExpanded ? 'translateX(0)' : `translateX(${FEED_W + PAD + 20}px)`,
            opacity: feedExpanded ? 1 : 0,
            transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease',
            pointerEvents: feedExpanded ? 'auto' : 'none',
          }}
        >
          <ContentFeed
            pins={filteredPins}
            agent={agent}
            onPinTap={(p) => setSelectedPin(p)}
            isPreview={isPreview}
            isSignedIn={!!currentUser}
            onAuthRequired={() => setShowAuth(true)}
          />
        </div>

        {/* Listing modal */}
        {selectedPin && (
          <ResponsiveSheet isOpen={!!selectedPin} onClose={() => setSelectedPin(null)} title={selectedPin?.address} dark noScroll>
            <ListingModal pin={selectedPin} agent={agent} onClose={() => setSelectedPin(null)} isPreview={isPreview} embedded />
          </ResponsiveSheet>
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

  // ═══════════════════════════════════════════
  // MOBILE (unchanged)
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

      {selectedPin ? (
        <ListingModal pin={selectedPin} agent={agent} onClose={() => setSelectedPin(null)} isPreview={isPreview} />
      ) : null}

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
