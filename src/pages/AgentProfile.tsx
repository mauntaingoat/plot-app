import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Share2, UserPlus, UserCheck, ChevronDown, Users, Globe, X } from 'lucide-react'
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
  const mapShapeRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  const [agent, setAgent] = useState<UserDoc | null>(null)
  const [allPins, setAllPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'feed'>('map')
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [feedExpanded, setFeedExpanded] = useState(false)
  const [mapDims, setMapDims] = useState({ w: 0, h: 0 })

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

  // Track map container size for clip-path computation
  useEffect(() => {
    const el = mapShapeRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setMapDims({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isDesktop, loadingComplete])

  // Reset feed state when switching between mobile/desktop
  useEffect(() => {
    if (!isDesktop) setFeedExpanded(false)
  }, [isDesktop])

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
  const GAP = 12
  const BUMP_H = 48 // extrusion height above the main map top edge
  // Feed width computed for 9:16 aspect ratio based on available height
  const feedContainerH = (typeof window !== 'undefined' ? window.innerHeight : 900) - PAD * 2 - BUMP_H
  const FEED_W = Math.min(500, Math.max(340, Math.round(feedContainerH * 9 / 16)))
  const BUMP_HALF_W = 210 // half-width of the bump opening
  const BUMP_R = 20 // pill curve radius at bump top corners
  const CORNER_R = 24 // main rectangle corner radius
  const MAP_EASE = 'right 0.4s cubic-bezier(0.32, 0.72, 0, 1)'
  const mapRight = feedExpanded ? FEED_W + GAP + PAD : PAD

  // Compute clip-path for the map's notch/bump shape
  const mapClipPath = (() => {
    const { w: W, h: H } = mapDims
    if (W === 0 || H === 0) return undefined
    const r = CORNER_R
    const br = BUMP_R
    const bh = BUMP_H
    const bL = W / 2 - BUMP_HALF_W // bump left edge
    const bR = W / 2 + BUMP_HALF_W // bump right edge
    return `path('${[
      `M 0 ${bh + r}`,                           // start: left edge, below top-left corner
      `A ${r} ${r} 0 0 1 ${r} ${bh}`,            // top-left rounded corner
      `L ${bL} ${bh}`,                            // straight right to bump start
      `L ${bL} ${br}`,                            // sharp 90° corner: straight UP
      `A ${br} ${br} 0 0 1 ${bL + br} 0`,        // pill curve at bump top-left
      `L ${bR - br} 0`,                           // straight across bump top
      `A ${br} ${br} 0 0 1 ${bR} ${br}`,          // pill curve at bump top-right
      `L ${bR} ${bh}`,                            // sharp 90° corner: straight DOWN
      `L ${W - r} ${bh}`,                         // straight right to top-right corner
      `A ${r} ${r} 0 0 1 ${W} ${bh + r}`,        // top-right rounded corner
      `L ${W} ${H - r}`,                          // right edge down
      `A ${r} ${r} 0 0 1 ${W - r} ${H}`,         // bottom-right corner
      `L ${r} ${H}`,                              // bottom edge
      `A ${r} ${r} 0 0 1 0 ${H - r}`,            // bottom-left corner
      'Z',
    ].join(' ')}')`
  })()

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

        {/* ── Map shadow wrapper — filter on outer so clip-path doesn't eat the shadow ── */}
        <div
          className="absolute will-change-[left,right]"
          style={{
            top: PAD,
            bottom: PAD,
            left: PAD,
            right: mapRight,
            transition: MAP_EASE,
            filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.18)) drop-shadow(0 2px 10px rgba(0,0,0,0.1))',
          }}
        >
          {/* ── Map container — clip-path creates the notch/bump extrusion ── */}
          <div
            ref={mapShapeRef}
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: mapClipPath,
              borderRadius: mapClipPath ? undefined : CORNER_R,
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
        </div>

        {/* ── Header row: pill + follow/share — centered to map ── */}
        <div
          className="absolute z-[60] flex items-center justify-center pointer-events-none"
          style={{ top: PAD + 4, left: PAD, right: mapRight, transition: MAP_EASE }}
        >
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Pill */}
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAgentDetail(true)}
              className="bg-white/95 backdrop-blur-md rounded-full flex items-center gap-3 pl-2 pr-4 py-2 border border-black/5 cursor-pointer"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)' }}
            >
              {renderPillContent()}
              <ChevronDown size={14} className="text-smoke ml-1" />
            </motion.button>

            {/* Follow */}
            <motion.button
              whileTap={!isPreview ? { scale: 0.88 } : undefined}
              onClick={!isPreview ? handleFollow : undefined}
              className={`bg-white/90 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center cursor-pointer border border-black/5 ${isFollowing ? 'text-tangerine' : 'text-ink'} ${isPreview ? 'opacity-40' : ''}`}
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)' }}
            >
              {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
            </motion.button>

            {/* Share */}
            <motion.button
              whileTap={!isPreview ? { scale: 0.88 } : undefined}
              onClick={!isPreview ? handleShare : undefined}
              className={`bg-white/90 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center text-ink cursor-pointer border border-black/5 ${isPreview ? 'opacity-40' : ''}`}
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <Share2 size={15} />
            </motion.button>
          </div>
        </div>

        {/* ── Filters — centered to map, below pill ── */}
        <div
          className="absolute z-[55] pointer-events-none"
          style={{ top: PAD + 68, left: PAD, right: mapRight, transition: MAP_EASE }}
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

        {/* ── Expand/collapse button — always on map's right edge ── */}
        <button
          onClick={() => setFeedExpanded(!feedExpanded)}
          className="absolute z-[50] w-11 h-11 rounded-full bg-tangerine text-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          style={{
            top: '50%',
            marginTop: -22,
            right: mapRight - 22,
            transition: MAP_EASE,
          }}
        >
          {feedExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* ── Content feed — mobile width, rounded, slides in ── */}
        <div
          className="absolute rounded-3xl bg-midnight overflow-hidden will-change-transform"
          style={{
            top: PAD + BUMP_H,
            bottom: PAD,
            right: PAD,
            width: FEED_W,
            transform: feedExpanded ? 'translateX(0)' : `translateX(${FEED_W + PAD + 20}px)`,
            opacity: feedExpanded ? 1 : 0,
            transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease',
            pointerEvents: feedExpanded ? 'auto' : 'none',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15)',
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

        {/* Listing modal — centered to map area, 9:16 aspect ratio */}
        <AnimatePresence>
          {selectedPin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[200]"
              onClick={() => setSelectedPin(null)}
            >
              <div className="absolute inset-0 bg-black/30" />
              <div
                className="absolute top-0 bottom-0 flex items-center justify-center"
                style={{ left: PAD, right: mapRight, transition: MAP_EASE }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 20 }}
                  transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-obsidian rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                  style={{ height: '88vh', aspectRatio: '9/16', maxWidth: '90vw' }}
                >
                  <div className="px-5 pt-4 pb-3 shrink-0 flex items-center justify-between border-b border-border-dark">
                    <h2 className="text-[16px] font-bold text-white tracking-tight truncate flex-1 mr-3">{selectedPin.address}</h2>
                    <button onClick={() => setSelectedPin(null)} className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-ghost hover:text-white cursor-pointer shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ListingModal pin={selectedPin} agent={agent} onClose={() => setSelectedPin(null)} isPreview={isPreview} embedded isSignedIn={!!currentUser} onAuthRequired={() => setShowAuth(true)} />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AgentDetailSheet
          isOpen={showAgentDetail}
          onClose={() => setShowAgentDetail(false)}
          agent={agent}
          isFollowing={isFollowing}
          onFollow={handleFollow}
          nearbyAgents={nearbyAgents}
          enabledAgentIds={enabledAgentIds}
          mapBounds={{ left: PAD, right: mapRight }}
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
        <ListingModal pin={selectedPin} agent={agent} onClose={() => setSelectedPin(null)} isPreview={isPreview} isSignedIn={!!currentUser} onAuthRequired={() => setShowAuth(true)} />
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
