import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Users, Globe, X, Map, Play, Bookmark, UserCircle, LogIn } from 'lucide-react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { MapCanvas } from '@/components/map/MapCanvas'
import { MapOverlay } from '@/components/map/MapOverlay'
import { PeekDrawer } from '@/components/map/PeekDrawer'
import { ContentFeed } from '@/components/map/ContentFeed'
import { PinCard } from '@/components/dashboard/PinCard'
import { ListingModal } from '@/components/viewers/ListingModal'
import { MapIndicators } from '@/components/map/MapIndicators'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { formatPrice } from '@/lib/firestore'
import { Avatar } from '@/components/ui/Avatar'
import { AgentDetailSheet, type AgentMode } from '@/components/sheets/AgentDetailSheet'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { SEOHead } from '@/components/marketing/SEOHead'
import { StructuredData } from '@/components/marketing/StructuredData'
import { SidebarPanels, type SidebarPanelType } from '@/components/agent-profile/SidebarPanels'
import { AgentPill } from '@/components/agent-profile/AgentPill'
import { SidebarNavButton } from '@/components/agent-profile/SidebarNavButton'
import { useMapStore, applyPropertyFilters } from '@/stores/mapStore'
import { useAuthStore } from '@/stores/authStore'
import { useAgent, useAgentPins } from '@/hooks/useQueries'
import { useFollow, useFollowingList } from '@/hooks/useFollow'
import { AccountSheet } from '@/components/sheets/AccountSheet'
import { useSaves } from '@/hooks/useSaves'
import { firebaseConfigured } from '@/config/firebase'
import type { UserDoc, Pin } from '@/lib/types'
import { preloadImages } from '@/lib/imageCache'

// Demo mode: bypass auth gates when Firebase isn't configured
const DEMO_MODE = !firebaseConfigured

// State abbreviation → approximate geographic center [lng, lat]
const STATE_CENTERS: Record<string, [number, number]> = {
  AL: [-86.9, 32.3], AK: [-153.4, 64.2], AZ: [-111.1, 34.0], AR: [-92.2, 34.7],
  CA: [-119.4, 36.8], CO: [-105.8, 39.1], CT: [-72.7, 41.6], DE: [-75.5, 38.9],
  FL: [-81.5, 27.6], GA: [-83.5, 32.2], HI: [-155.5, 19.9], ID: [-114.7, 44.1],
  IL: [-89.4, 40.6], IN: [-86.1, 40.3], IA: [-93.1, 41.9], KS: [-98.5, 38.5],
  KY: [-84.3, 37.8], LA: [-92.1, 30.5], ME: [-69.4, 45.3], MD: [-76.6, 39.0],
  MA: [-71.5, 42.4], MI: [-84.5, 44.3], MN: [-94.7, 46.7], MS: [-89.3, 32.3],
  MO: [-91.8, 37.9], MT: [-109.5, 46.9], NE: [-99.9, 41.5], NV: [-116.4, 38.8],
  NH: [-71.6, 43.2], NJ: [-74.4, 40.1], NM: [-105.9, 34.5], NY: [-75.0, 43.0],
  NC: [-79.0, 35.8], ND: [-101.0, 47.5], OH: [-82.9, 40.4], OK: [-97.1, 35.0],
  OR: [-120.6, 43.8], PA: [-77.2, 41.2], RI: [-71.5, 41.6], SC: [-81.2, 34.0],
  SD: [-99.9, 43.9], TN: [-86.6, 35.5], TX: [-99.9, 31.9], UT: [-111.1, 39.3],
  VT: [-72.6, 44.0], VA: [-78.7, 37.4], WA: [-120.7, 47.8], WV: [-80.5, 38.9],
  WI: [-89.6, 43.8], WY: [-107.3, 43.0], DC: [-77.0, 38.9],
}

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
  const { data: agent = null, isLoading: agentLoading, bumpFollowerCount } = useAgent(username)
  const { data: allPins = [] } = useAgentPins(agent)

  useEffect(() => {
    const urls: string[] = []
    if (agent?.photoURL) urls.push(agent.photoURL)
    for (const pin of allPins) {
      if ('heroPhotoUrl' in pin && pin.heroPhotoUrl) urls.push(pin.heroPhotoUrl)
      for (const c of pin.content || []) {
        if (c.thumbnailUrl) urls.push(c.thumbnailUrl)
        if (c.mediaUrls) urls.push(...c.mediaUrls)
      }
    }
    if (urls.length > 0) preloadImages(urls)
  }, [allPins, agent?.photoURL])

  const loading = agentLoading
  const notFound = !agentLoading && !agent

  // Follow state via hook (Firestore in prod, localStorage in demo)
  const { isFollowing, toggle: toggleFollow } = useFollow(agent?.uid)
  const { followingIds } = useFollowingList()
  const { saves } = useSaves()
  const [viewMode, setViewMode] = useState<'map' | 'feed'>('map')
  const [loadingComplete, setLoadingComplete] = useState(false)

  useEffect(() => {
    setLoadingComplete(false)
  }, [username])
  const [feedExpanded, setFeedExpanded] = useState(false)
  const [mapDims, setMapDims] = useState({ w: 0, h: 0 })
  const [winSize, setWinSize] = useState(0) // triggers re-render on window resize

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [selectedPinTab, setSelectedPinTab] = useState<'content' | 'listing' | undefined>(undefined)
  const [modalKey, setModalKey] = useState(0) // increment to force remount
  const [indicatorPins, setIndicatorPins] = useState<{ pins: Pin[]; type: 'live' | 'openhouse' } | null>(null)
  const [showAgentDetail, setShowAgentDetail] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
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

  // Following mode starts empty — user selects who to show
  // (followingIds are available in the sidebar for selection, but nothing enabled by default)

  const { setViewingAgentId, activeFilters, propertyFilters } = useMapStore()
  const { userDoc: currentUser } = useAuthStore()
  // Own profile: either the signed-in user matches the agent, OR this
  // is the dashboard preview iframe (which always shows the agent's own
  // profile but doesn't share auth state across the iframe boundary).
  const isOwnProfile = isPreview || !!(currentUser?.uid && agent?.uid && currentUser.uid === agent.uid)

  const [followingAgents, setFollowingAgents] = useState<UserDoc[]>([])
  const nearbyAgents = followingAgents

  useEffect(() => {
    if (followingIds.length === 0) { setFollowingAgents([]); return }
    Promise.all(followingIds.map((uid) =>
      import('@/lib/firestore').then(({ getUserById }) => getUserById(uid))
    )).then((results) => {
      setFollowingAgents(results.filter(Boolean) as UserDoc[])
    }).catch(() => {})
  }, [followingIds])
  const [explorePins, setExplorePins] = useState<Pin[]>([])
  const [followingPins, setFollowingPins] = useState<Pin[]>([])
  const [savedPinsFull, setSavedPinsFull] = useState<Pin[]>([])

  useEffect(() => {
    import('@/lib/firestore').then(({ getExplorePins }) => getExplorePins().then(setExplorePins).catch(() => {}))
  }, [])

  useEffect(() => {
    if (followingIds.length > 0) {
      import('@/lib/firestore').then(({ getPinsByAgentIds }) => getPinsByAgentIds(followingIds).then(setFollowingPins).catch(() => {}))
    } else {
      setFollowingPins([])
    }
  }, [followingIds])

  const savesKey = saves.map((s) => s.pinId).sort().join(',')
  useEffect(() => {
    if (saves.length > 0) {
      const pinIds = [...new Set(saves.map((s) => s.pinId))]
      import('@/lib/firestore').then(({ getPinsByIds }) => getPinsByIds(pinIds).then(setSavedPinsFull).catch(() => {}))
    } else {
      setSavedPinsFull([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savesKey])

  // Default map center: agent's licensed state when no pins exist
  const defaultCenter = useMemo<[number, number] | undefined>(() => {
    if (agent?.licenseState) return STATE_CENTERS[agent.licenseState]
    return undefined
  }, [agent])

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
    if (agentMode === 'saved') {
      return savedPinsFull.length > 0 ? savedPinsFull : allPins.filter((p) => saves.some((s) => s.pinId === p.id))
    }
    if (agentMode === 'explore') {
      return explorePins.length > 0 ? explorePins : allPins
    }
    if (agentMode === 'following') {
      if (enabledAgentIds.size === 0) return []
      return followingPins.filter((p) => enabledAgentIds.has(p.agentId))
    }
    return allPins
  }, [allPins, agentMode, explorePins, followingPins, savedPinsFull, followingIds, saves, agent, enabledAgentIds])

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
    // Only count taps from OTHER users — the agent's own clicks on
    // their own pins (or preview) shouldn't inflate metrics.
    if (!isOwnProfile) {
      import('@/lib/firestore').then(({ incrementPinTap }) => incrementPinTap(pin.id)).catch(() => {})
    }
  }, [allPins, isOwnProfile])

  const handleIndicatorTap = useCallback((pins: Pin[], type: 'live' | 'openhouse') => {
    const tab = type === 'openhouse' ? 'listing' as const : 'content' as const
    if (pins.length === 1) {
      setSelectedPinTab(tab)
      setSelectedPin(pins[0])
      setModalKey((k) => k + 1)
    } else if (pins.length > 1) {
      setIndicatorPins({ pins, type })
    }
  }, [])

  const handleFollow = async () => {
    if (isPreview || isOwnProfile) return
    bumpFollowerCount(isFollowing ? -1 : 1)
    await toggleFollow()
  }

  const handleShare = async () => {
    try { await navigator.share({ title: `${agent?.displayName} on Reelst`, url: window.location.href }) }
    catch { navigator.clipboard.writeText(window.location.href) }
  }

  if (loading || !loadingComplete) {
    return (
      <LoadingScreen
        agentName={agent?.displayName}
        agentPhoto={agent?.photoURL}
        onComplete={() => setLoadingComplete(true)}
        minDuration={2000}
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

  if (agent.verificationStatus !== 'verified' && !isPreview) {
    return (
      <div className="map-page flex flex-col items-center justify-center text-center px-6 bg-midnight">
        <div className="w-16 h-16 rounded-full bg-tangerine/15 flex items-center justify-center mb-4">
          <span className="text-[28px]">🔒</span>
        </div>
        <h1 className="text-[22px] font-extrabold text-white mb-2">Profile pending verification</h1>
        <p className="text-[14px] text-ghost mb-6 max-w-[300px]">
          @{username}'s Reelst is being reviewed and will be live soon.
        </p>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate('/')} className="text-tangerine font-semibold text-[14px]">Go home</motion.button>
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

  // SEO meta tags for the agent profile (browser tab + JS-aware crawlers)
  const seoElement = (
    <>
      <SEOHead
        title={agent.displayName}
        description={agent.bio || `${agent.displayName} on Reelst — interactive map of listings, stories, and reels.`}
        ogImage={agent.photoURL || undefined}
        path={`/${agent.username || agent.uid}`}
      />
      <StructuredData agent={agent} pins={allPins} />
    </>
  )

  if (isDesktop) {
    return (
      <div className="map-page" style={{ background: '#14161E' }} ref={mapContainerRef}>
        {seoElement}

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

            <div className={isPreview ? 'opacity-40 pointer-events-none' : ''}>
              <SidebarNavButton
                active={agentMode === 'following'}
                onClick={() => {
                  setAgentMode('following')
                  setSidebarPanel(sidebarPanel === 'following' ? null : 'following')
                }}
              >
                <Users size={18} /> Following
              </SidebarNavButton>

              <SidebarNavButton
                active={agentMode === 'explore'}
                onClick={() => {
                  setAgentMode('explore')
                  setSidebarPanel(sidebarPanel === 'exploreAll' ? null : 'exploreAll')
                }}
              >
                <Globe size={18} /> Explore All
              </SidebarNavButton>

              <div className="h-px bg-white/6 !my-3" />

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
          </div>

          {/* Bottom: account / auth */}
          <div className="px-4 pb-5 pt-3 shrink-0 border-t border-white/6">
            {currentUser ? (
              <button onClick={() => setShowAccount(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 cursor-pointer hover:bg-white/8 transition-colors text-left">
                <Avatar src={currentUser.photoURL} name={currentUser.displayName || 'You'} size={28} ring="none" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white truncate">{currentUser.displayName || 'You'}</p>
                  <p className="text-[10px] text-white/35 truncate">@{currentUser.username || 'you'}</p>
                </div>
                <ChevronRight size={12} className="text-ghost shrink-0" />
              </button>
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
          savedPins={agentMode === 'saved' ? visiblePins : []}
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
          <ErrorBoundary label="Map">
          <MapCanvas
            pins={filteredPins}
            agentPhotoUrl={agent.photoURL}
            onPinClick={handlePinClick}
            className="absolute inset-0"
            defaultCenter={defaultCenter}
            showBackButton={isPreview}
            onBack={() => navigate('/dashboard')}
          />
          </ErrorBoundary>

          {/* ── Live / Open House indicators ── */}
          <MapIndicators
            pins={filteredPins}
            onLiveTap={(livePins) => handleIndicatorTap(livePins, 'live')}
            onOpenHouseTap={(ohPins) => handleIndicatorTap(ohPins, 'openhouse')}
          />

          {/* ── Pill + buttons inside map, near top ── */}
          <AgentPill
            agent={agent}
            agentMode={agentMode}
            totalPins={totalPins}
            enabledAgentCount={enabledAgentIds.size}
            isFollowing={isFollowing}
            isPreview={isPreview}
            isOwnProfile={isOwnProfile}
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
          <ErrorBoundary label="Feed"><ContentFeed pins={filteredPins} agent={agent} onPinTap={(p) => setSelectedPin(p)} isPreview={isPreview} isSignedIn={DEMO_MODE || !!currentUser} onAuthRequired={() => { if (!DEMO_MODE) setShowAuth(true) }} isOwnProfile={isOwnProfile} /></ErrorBoundary>
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
                    <ListingModal key={`modal-${modalKey}`} pin={selectedPin} agent={agent} onClose={() => { setSelectedPin(null); setSelectedPinTab(undefined) }} isPreview={isPreview} embedded isSignedIn={DEMO_MODE || !!currentUser} onAuthRequired={() => { if (!DEMO_MODE) setShowAuth(true) }} initialTab={selectedPinTab} isOwnProfile={isOwnProfile} />
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
          currentUser={currentUser}
          onAccountTap={() => { setShowAgentDetail(false); setShowAccount(true) }}
          onSignIn={() => { setShowAgentDetail(false); setShowAuth(true) }}
        />

        <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} mode="signup" />
        <AccountSheet isOpen={showAccount} onClose={() => setShowAccount(false)} isDesktop
          onSignOut={async () => { setShowAccount(false); const { auth } = await import('@/config/firebase'); await auth?.signOut(); navigate('/') }}
          onNavigatePricing={() => { setShowAccount(false); navigate('/pricing') }}
        />
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // MOBILE (unchanged)
  // ═══════════════════════════════════════════
  return (
    <div className="map-page" ref={mapContainerRef}>
      {seoElement}
      <AnimatePresence mode="wait">
        {viewMode === 'map' ? (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            <ErrorBoundary label="Map">
            <MapCanvas
              pins={filteredPins}
              agentPhotoUrl={agent.photoURL}
              onPinClick={handlePinClick}
              className="absolute inset-0"
              defaultCenter={defaultCenter}
              showBackButton={isPreview}
              onBack={() => navigate('/dashboard')}
            />
            </ErrorBoundary>
            <MapIndicators
              pins={filteredPins}
              onLiveTap={(livePins) => { if (livePins[0]) setSelectedPin(livePins[0]) }}
              onOpenHouseTap={(ohPins) => { if (ohPins[0]) setSelectedPin(ohPins[0]) }}
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
            <ErrorBoundary label="Feed"><ContentFeed pins={filteredPins} agent={agent} onPinTap={(p) => setSelectedPin(p)} isPreview={isPreview} isSignedIn={DEMO_MODE || !!currentUser} onAuthRequired={() => { if (!DEMO_MODE) setShowAuth(true) }} isOwnProfile={isOwnProfile} /></ErrorBoundary>
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
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => setViewMode(viewMode === 'map' ? 'feed' : 'map')}
        className="fixed z-[40] right-4 rounded-full flex items-center justify-center cursor-pointer shadow-lg overflow-hidden"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 8px) + 16px)',
          width: 52,
          height: 52,
          background: viewMode === 'map' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.30)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: viewMode === 'map' ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.10)',
        }}
      >
        {viewMode === 'map' ? <Play size={20} className="text-tangerine" fill="#FF6B3D" /> : <Map size={20} className="text-white" />}
      </motion.button>

      {selectedPin ? (
        <ListingModal key={`modal-m-${modalKey}`} pin={selectedPin} agent={agent} onClose={() => { setSelectedPin(null); setSelectedPinTab(undefined) }} isPreview={isPreview} isSignedIn={DEMO_MODE || !!currentUser} onAuthRequired={() => { if (!DEMO_MODE) setShowAuth(true) }} initialTab={selectedPinTab} isOwnProfile={isOwnProfile} />
      ) : null}

      {/* Indicator picker — multiple livestreams or open houses */}
      <DarkBottomSheet
        isOpen={!!indicatorPins}
        onClose={() => setIndicatorPins(null)}
        title={indicatorPins?.type === 'live'
          ? `${indicatorPins.pins.length} Livestream${indicatorPins.pins.length !== 1 ? 's' : ''}`
          : `${indicatorPins?.pins.length || 0} Open House${(indicatorPins?.pins.length || 0) !== 1 ? 's' : ''}`
        }
      >
        <div className="px-4 pb-8 grid grid-cols-2 gap-3">
          {indicatorPins?.pins.map((pin) => (
            <PinCard
              key={pin.id}
              pin={pin}
              dark
              onClick={() => {
                const tab = indicatorPins?.type === 'openhouse' ? 'listing' as const : 'content' as const
                setIndicatorPins(null)
                setSelectedPinTab(tab)
                setSelectedPin(pin)
                setModalKey((k) => k + 1)
              }}
            />
          ))}
        </div>
      </DarkBottomSheet>

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
        currentUser={currentUser}
        onAccountTap={() => { setShowAgentDetail(false); setShowAccount(true) }}
        onSignIn={() => { setShowAgentDetail(false); setShowAuth(true) }}
      />

      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} mode="signup" />
      <AccountSheet isOpen={showAccount} onClose={() => setShowAccount(false)}
        onSignOut={async () => { setShowAccount(false); const { auth } = await import('@/config/firebase'); await auth?.signOut(); navigate('/') }}
        onNavigatePricing={() => { setShowAccount(false); navigate('/pricing') }}
      />
    </div>
  )
}
