import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Users, Globe, X, Map, Layers, Bookmark, UserCircle, LogIn } from 'lucide-react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { MapCanvas } from '@/components/map/MapCanvas'
import { MapOverlay } from '@/components/map/MapOverlay'
import { PeekDrawer } from '@/components/map/PeekDrawer'
import { ContentFeed } from '@/components/map/ContentFeed'
import { PinCard } from '@/components/dashboard/PinCard'
import { ListingModal } from '@/components/viewers/ListingModal'
import { Avatar } from '@/components/ui/Avatar'
import { AgentDetailSheet, type AgentMode } from '@/components/sheets/AgentDetailSheet'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { SidebarPanels, type SidebarPanelType } from '@/components/agent-profile/SidebarPanels'
import { AgentPill } from '@/components/agent-profile/AgentPill'
import { SidebarNavButton } from '@/components/agent-profile/SidebarNavButton'
import { useMapStore, applyPropertyFilters } from '@/stores/mapStore'
import { useAuthStore } from '@/stores/authStore'
import { useAgent, useAgentPins } from '@/hooks/useQueries'
import { getMockAgent, getMockPins, MOCK_AGENTS } from '@/lib/mock'
import { firebaseConfigured } from '@/config/firebase'
import type { UserDoc, Pin } from '@/lib/types'

// Demo mode: bypass auth gates when Firebase isn't configured
const DEMO_MODE = !firebaseConfigured

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
  const [searchParams, setSearchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapShapeRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  // Data fetching via React Query (cached across navigations)
  const { data: agent = null, isLoading: agentLoading } = useAgent(username)
  const { data: allPins = [] } = useAgentPins(agent)
  const loading = agentLoading
  const notFound = !agentLoading && !agent

  const [isFollowing, setIsFollowing] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'feed'>('map')
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [feedExpanded, setFeedExpanded] = useState(false)
  const [mapDims, setMapDims] = useState({ w: 0, h: 0 })
  const [winSize, setWinSize] = useState(0) // triggers re-render on window resize

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [showAgentDetail, setShowAgentDetail] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const initialMode = (searchParams.get('mode') as AgentMode) || 'single'
  const [agentMode, _setAgentMode] = useState<AgentMode>(
    ['single', 'following', 'explore', 'saved'].includes(initialMode) ? initialMode : 'single'
  )
  const setAgentMode = useCallback((mode: AgentMode) => {
    _setAgentMode(mode)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (mode === 'single') next.delete('mode')
      else next.set('mode', mode)
      return next
    }, { replace: true })
  }, [setSearchParams])
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanelType>(null)
  const [enabledAgentIds, setEnabledAgentIds] = useState<Set<string>>(new Set())

  const { setViewingAgentId, activeFilters, propertyFilters } = useMapStore()
  const { userDoc: currentUser } = useAuthStore()

  const nearbyAgents = useMemo(() =>
    MOCK_AGENTS.filter((a) => a.uid !== agent?.uid), [agent])

  // Set viewing agent when agent data loads
  useEffect(() => {
    if (agent) setViewingAgentId(agent.uid)
  }, [agent, setViewingAgentId])

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

  // Re-render on window resize so FEED_W / mapRight stay fresh
  useEffect(() => {
    const onResize = () => setWinSize(window.innerWidth + window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Merge pins based on agent mode
  const visiblePins = useMemo(() => {
    if (agentMode === 'saved') return [] // TODO: wire up real saved pins from Firestore
    if (agentMode === 'explore') {
      // All agents' pins
      const all: Pin[] = [...allPins]
      for (const a of nearbyAgents) {
        all.push(...getMockPins(a.uid))
      }
      return all
    }
    if (agentMode === 'following' && enabledAgentIds.size > 0) {
      // Current agent + enabled agents
      const all: Pin[] = [...allPins]
      for (const id of enabledAgentIds) {
        all.push(...getMockPins(id))
      }
      return all
    }
    return allPins
  }, [allPins, agentMode, nearbyAgents, enabledAgentIds])

  const filteredPins = useMemo(() => {
    let result = visiblePins
    if (activeFilters.size > 0) result = result.filter((p) => activeFilters.has(p.type))
    result = applyPropertyFilters(result, propertyFilters)
    return result
  }, [visiblePins, activeFilters, propertyFilters])

  const pinCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    visiblePins.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1 })
    return counts
  }, [visiblePins])

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

  const handleFitToPins = useCallback(() => {
    if (agentMode === 'explore') return // disabled in explore mode
    const container = mapContainerRef.current?.querySelector('.mapboxgl-canvas')?.parentElement?.parentElement
    if (container && (container as any).__plotFitTo) {
      (container as any).__plotFitTo(filteredPins)
    }
  }, [filteredPins, agentMode])

  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin)
    import('@/lib/firestore').then(({ incrementPinTap }) => incrementPinTap(pin.id)).catch(() => {})
  }, [allPins])

  const handleFollow = async () => {
    if (!DEMO_MODE && !currentUser && !isPreview) { setShowAuth(true); return }
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
  const SIDEBAR_W = 240 // permanent left sidebar
  const PAD = 16
  const GAP = 12
  const CORNER_R = 20
  const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
  const MAP_EASE = `right 0.4s ${EASE}`
  // Feed width: 9:16 aspect ratio from available height
  const feedContainerH = (typeof window !== 'undefined' ? window.innerHeight : 900) - PAD * 2
  const FEED_W = Math.min(500, Math.max(340, Math.round(feedContainerH * 9 / 16)))
  const mapLeft = SIDEBAR_W + GAP
  const mapRight = feedExpanded ? FEED_W + GAP + PAD : PAD + 6 // +6 ensures expand button is fully visible

  if (isDesktop) {
    return (
      <div className="map-page" style={{ background: '#14161E' }} ref={mapContainerRef}>

        {/* ═══ LEFT SIDEBAR ═══ */}
        <div className="fixed top-0 left-0 bottom-0 z-[70] flex flex-col" style={{ width: SIDEBAR_W, background: '#14161E', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Logo lockup */}
          <div className="flex items-center justify-center gap-2.5 py-6 shrink-0">
            <img src="/reelst-logo.png" alt="Reelst" className="w-8 h-8" />
            <span className="text-[20px] font-extrabold text-white tracking-tight">Reelst</span>
          </div>

          {/* Nav buttons */}
          <div className="flex-1 px-4 space-y-1">
            {/* Select Agent (single mode) */}
            <SidebarNavButton
              active={agentMode === 'single'}
              onClick={() => {
                setAgentMode('single')
                setSidebarPanel(sidebarPanel === 'selectAgent' ? null : 'selectAgent')
              }}
            >
              {agentMode === 'single' ? (
                <>
                  <Avatar src={agent.photoURL} name={agent.displayName} size={22} ring="none" />
                  <span className="truncate">{agent.displayName}</span>
                </>
              ) : (
                <>
                  <UserCircle size={18} />
                  <span>Select Agent</span>
                </>
              )}
            </SidebarNavButton>

            {/* Following (multi-select) */}
            <SidebarNavButton
              active={agentMode === 'following'}
              onClick={() => {
                setAgentMode('following')
                setSidebarPanel(sidebarPanel === 'following' ? null : 'following')
              }}
            >
              <Users size={18} /> Following
            </SidebarNavButton>

            {/* Explore All */}
            <SidebarNavButton
              active={agentMode === 'explore'}
              onClick={() => {
                setAgentMode('explore')
                setSidebarPanel(sidebarPanel === 'exploreAll' ? null : 'exploreAll')
              }}
            >
              <Globe size={18} /> Explore All
            </SidebarNavButton>

            {/* Divider */}
            <div className="h-px bg-white/6 !my-3" />

            {/* Saved */}
            <SidebarNavButton
              active={agentMode === 'saved'}
              onClick={() => {
                setAgentMode('saved')
                setSidebarPanel(sidebarPanel === 'saved' ? null : 'saved')
              }}
            >
              <Bookmark size={18} /> Saved
            </SidebarNavButton>
          </div>

          {/* Bottom: account / auth */}
          <div className="px-4 pb-5 pt-3 shrink-0 border-t border-white/6">
            {currentUser ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5">
                <Avatar src={currentUser.photoURL} name={currentUser.displayName || 'You'} size={28} ring="none" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white truncate">{currentUser.displayName || 'You'}</p>
                  <p className="text-[10px] text-white/35 truncate">@{currentUser.username || 'you'}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-tangerine/10 text-tangerine text-[13px] font-semibold cursor-pointer hover:bg-tangerine/15 transition-colors"
              >
                <LogIn size={15} />
                Sign in
              </button>
            )}
            <p className="text-[10px] text-white/15 text-center mt-3">© {new Date().getFullYear()} Reelst</p>
          </div>
        </div>

        {/* ═══ SIDEBAR OVERLAY PANELS ═══ */}
        <SidebarPanels
          sidebarPanel={sidebarPanel}
          setSidebarPanel={setSidebarPanel}
          sidebarWidth={SIDEBAR_W}
          agent={agent}
          nearbyAgents={nearbyAgents}
          enabledAgentIds={enabledAgentIds}
          onToggleAgent={(id) => {
            setEnabledAgentIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
          }}
          onSelectAgent={(a) => {
            setAgentMode('single')
            if (a.uid !== agent.uid) navigate(`/${a.username}`)
          }}
          onSetMode={setAgentMode}
          isSignedIn={DEMO_MODE || !!currentUser}
          onAuthRequired={() => { if (!DEMO_MODE) setShowAuth(true) }}
          savedPins={[]}
        />

        {/* ═══ MAP (rounded rectangle, no extrusion) ═══ */}
        <div
          ref={mapShapeRef}
          className="absolute overflow-hidden will-change-[left,right]"
          style={{
            top: PAD,
            bottom: PAD,
            left: mapLeft,
            right: mapRight,
            borderRadius: CORNER_R,
            transition: MAP_EASE,
            boxShadow: '0 8px 30px rgba(0,0,0,0.4), 0 2px 10px rgba(0,0,0,0.2)',
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

          {/* ── Pill + buttons inside map, near top ── */}
          <AgentPill
            agent={agent}
            agentMode={agentMode}
            totalPins={totalPins}
            enabledAgentCount={enabledAgentIds.size}
            isFollowing={isFollowing}
            isPreview={isPreview}
            onProfileClick={() => setShowAgentDetail(true)}
            onFollow={handleFollow}
            onShare={handleShare}
            onFitToPins={handleFitToPins}
          />

          {/* ── Filters inside map, below pill ── */}
          <div className="absolute top-[80px] left-0 right-0 z-[35] pointer-events-none">
            <MapOverlay
              agent={agent} pinCounts={pinCounts}
              onFollow={handleFollow} onShare={handleShare}
              onProfileClick={() => setShowAgentDetail(true)}
              onFilterChange={handleFilterChange}
              isFollowing={isFollowing} viewMode="map"
              isPreview={isPreview} agentMode={agentMode}
              enabledAgentCount={enabledAgentIds.size}
              hideHeader centerFilters
            />
          </div>
        </div>

        {/* ═══ EXPAND/COLLAPSE BUTTON ═══ */}
        <button
          onClick={() => setFeedExpanded(!feedExpanded)}
          className="absolute z-[50] w-11 h-11 rounded-full bg-tangerine text-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          style={{ top: '50%', marginTop: -22, right: mapRight - 22, transition: MAP_EASE }}
        >
          {feedExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* ═══ CONTENT FEED (9:16) ═══ */}
        <div
          className="absolute rounded-2xl bg-midnight overflow-hidden will-change-transform"
          style={{
            top: PAD, bottom: PAD, right: PAD, width: FEED_W,
            borderRadius: CORNER_R,
            transform: feedExpanded ? 'translateX(0)' : `translateX(${FEED_W + PAD + 20}px)`,
            opacity: feedExpanded ? 1 : 0,
            transition: `transform 0.4s ${EASE}, opacity 0.3s ease`,
            pointerEvents: feedExpanded ? 'auto' : 'none',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4), 0 2px 10px rgba(0,0,0,0.2)',
          }}
        >
          <ContentFeed pins={filteredPins} agent={agent} onPinTap={(p) => setSelectedPin(p)} isPreview={isPreview} isSignedIn={DEMO_MODE || !!currentUser} onAuthRequired={() => { if (!DEMO_MODE) setShowAuth(true) }} />
        </div>

        {/* ═══ LISTING MODAL — centered to map ═══ */}
        <AnimatePresence>
          {selectedPin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[200]" onClick={() => setSelectedPin(null)}>
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute top-0 bottom-0 flex items-center justify-center" style={{ left: mapLeft, right: mapRight, transition: MAP_EASE }}>
                <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }}
                  transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }} onClick={(e) => e.stopPropagation()}
                  className="bg-obsidian rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '88vh', aspectRatio: '9/16', maxWidth: '90vw' }}>
                  <div className="px-5 pt-4 pb-3 shrink-0 flex items-center justify-between border-b border-border-dark">
                    <h2 className="text-[16px] font-bold text-white tracking-tight truncate flex-1 mr-3">{selectedPin.address}</h2>
                    <button onClick={() => setSelectedPin(null)} className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-ghost hover:text-white cursor-pointer shrink-0"><X size={16} /></button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ListingModal pin={selectedPin} agent={agent} onClose={() => setSelectedPin(null)} isPreview={isPreview} embedded isSignedIn={DEMO_MODE || !!currentUser} onAuthRequired={() => { if (!DEMO_MODE) setShowAuth(true) }} />
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
          mapBounds={{ left: mapLeft, right: mapRight }}
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
            <ContentFeed pins={filteredPins} agent={agent} onPinTap={(p) => setSelectedPin(p)} isPreview={isPreview} isSignedIn={DEMO_MODE || !!currentUser} onAuthRequired={() => { if (!DEMO_MODE) setShowAuth(true) }} />
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
        isPreview={isPreview}
        agentMode={agentMode}
        enabledAgentCount={enabledAgentIds.size}
        onFitToPins={handleFitToPins}
      />

      {/* Map/Feed toggle — bottom right */}
      <div className="fixed z-[40] right-4" style={{ bottom: 'calc(env(safe-area-inset-bottom, 8px) + 16px)' }}>
        {/* Animated rainbow ring — both modes */}
        <motion.div
          className="absolute -inset-[3px] rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, #FF6B3D, #FF3B7A, #FFAA00, #FF6B3D, #E8522A, #FF6B3D)',
            filter: 'blur(1px)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setViewMode(viewMode === 'map' ? 'feed' : 'map')}
          className="relative rounded-full flex items-center justify-center cursor-pointer shadow-lg"
          style={{
            width: 52,
            height: 52,
            background: viewMode === 'map' ? 'rgba(255,255,255,0.90)' : 'rgba(0,0,0,0.30)',
            backdropFilter: 'blur(12px)',
            border: viewMode === 'map' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.10)',
          }}
        >
          {viewMode === 'map' ? <Layers size={20} className="text-ink" /> : <Map size={20} className="text-white" />}
        </motion.button>
      </div>

      {selectedPin ? (
        <ListingModal pin={selectedPin} agent={agent} onClose={() => setSelectedPin(null)} isPreview={isPreview} isSignedIn={DEMO_MODE || !!currentUser} onAuthRequired={() => { if (!DEMO_MODE) setShowAuth(true) }} />
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
