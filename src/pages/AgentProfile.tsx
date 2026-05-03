import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss'
import { useSheetLifecycle } from '@/hooks/useSheetLifecycle'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { MapCanvas } from '@/components/map/MapCanvas'
import { ContentFeed } from '@/components/map/ContentFeed'
import { ListingModal } from '@/components/viewers/ListingModal'
import { AgentDetailSheet } from '@/components/sheets/AgentDetailSheet'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { AgentProfileHeader } from '@/components/agent-profile/AgentProfileHeader'
import { SaveAgentModal } from '@/components/agent-profile/SaveAgentModal'
import { WaveModal } from '@/components/agent-profile/WaveModal'
import { ListingsTab } from '@/components/agent-profile/ListingsTab'
import { ExpandedMapView } from '@/components/agent-profile/ExpandedMapView'
import { resolveStyle, getPalette, getFont, ensureFontLoaded, paletteShadowColor } from '@/lib/style'
import { hasWebGL } from '@/lib/webgl'
import { SEOHead } from '@/components/marketing/SEOHead'
import { StructuredData } from '@/components/marketing/StructuredData'
import { useMapStore, applyPropertyFilters } from '@/stores/mapStore'
import { useAuthStore } from '@/stores/authStore'
import { useAgent, useAgentPins } from '@/hooks/useQueries'
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

function parseSessionEndMs(date: string, time: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).getTime()
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
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapShapeRef = useRef<HTMLDivElement>(null)
  // Page-level scroll container. We make this a fixed-position
  // overflow-y:auto element instead of relying on body scroll —
  // iOS Safari is unreliable about respecting `overscroll-behavior`
  // on html/body, but it *does* honor it on inner overflow:auto
  // containers, so this kills both top pull-to-refresh and bottom
  // rubber-band cleanly on every browser.
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  // Data fetching via React Query (cached across navigations)
  const { data: agent = null, isLoading: agentLoading } = useAgent(username)
  const { data: allPins = [] } = useAgentPins(agent)

  // Resolve the agent's customization (palette / font / shape /
  // frames / sections / ticker / cta). Falls back to DEFAULT_STYLE
  // when the user doc has no `style` field set yet.
  const style = useMemo(() => resolveStyle(agent?.style), [agent?.style])
  const palette = useMemo(() => getPalette(style.paletteId), [style.paletteId])
  const font = useMemo(() => getFont(style.fontId), [style.fontId])

  // WebGL pre-check. If unavailable (Safari with hardware accel off,
  // ancient browsers, in-app webviews), we skip every map surface so
  // the page stays usable with just the listings grid + identity —
  // instead of crashing into the ErrorBoundary's "App failed to
  // load" screen. Combine with the agent's own map-section toggle
  // so either condition hides it.
  const webglAvailable = useMemo(() => hasWebGL(), [])
  const showMap = style.sections.map && webglAvailable

  // Load the chosen font's Google Fonts stylesheet on demand. The
  // base CSS already ships the default ("humanist") so this only
  // fires for non-default picks. Idempotent — loading the same font
  // twice is a no-op.
  useEffect(() => {
    ensureFontLoaded(style.fontId)
  }, [style.fontId])


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

  const { setViewingAgentId, activeFilters, propertyFilters } = useMapStore()
  const { userDoc: currentUser } = useAuthStore()
  // Own profile: either the signed-in user matches the agent, OR this
  // is the dashboard preview iframe (which always shows the agent's own
  // profile but doesn't share auth state across the iframe boundary).
  const isOwnProfile = isPreview || !!(currentUser?.uid && agent?.uid && currentUser.uid === agent.uid)

  // Track public profile visits — once per session per agent. Skipped
  // when the viewer is the agent themselves OR when this is the
  // dashboard preview iframe (those would pollute the agent's own
  // analytics). `localHour` is the visitor's wall-clock hour so the
  // dashboard's "When viewers are active" chart buckets by visitor
  // time, not server UTC.
  useEffect(() => {
    if (!agent?.uid || isOwnProfile) return
    const sessionKey = `reelst-pv-${agent.uid}`
    if (sessionStorage.getItem(sessionKey)) return
    sessionStorage.setItem(sessionKey, '1')
    Promise.all([
      import('firebase/functions'),
      import('@/config/firebase'),
    ]).then(([{ getFunctions, httpsCallable }, { app }]) => {
      const fn = httpsCallable(getFunctions(app ?? undefined), 'trackProfileVisit')
      fn({ agentId: agent.uid, localHour: new Date().getHours() }).catch(() => {})
    }).catch(() => {})
  }, [agent?.uid, isOwnProfile])

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

  // Visible pins = the agent's enabled pins. Multi-agent modes
  // (Following / Explore / Saved) were retired with the picker UI.
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

  const handleFitToPins = useCallback(() => {
    const container = mapContainerRef.current?.querySelector('.mapboxgl-canvas')?.parentElement?.parentElement
    if (container && (container as any).__plotFitTo) {
      (container as any).__plotFitTo(filteredPins)
    }
  }, [filteredPins])

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

  const handleShare = async () => {
    try { await navigator.share({ title: `${agent?.displayName} on Reelst`, url: window.location.href }) }
    catch { navigator.clipboard.writeText(window.location.href) }
  }

  // ── New 3-tab agent profile state ──
  // Replaces the legacy view-mode shell as the default rendering
  // path. The legacy desktop/mobile renders below remain in place
  // (unreachable in normal flow) so /explore can revive them later
  // without re-implementing.
  // Tabs were removed in favor of a single Linktree-style scroll:
  // header (avatar + name + ticker + bio + corner Wave/Save icons)
  // → map peek → listings grid. Reels/About state still stripped
  // out since their content is reachable via the immersive viewer
  // (per-listing) and the bio in the header.
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [savedSession, setSavedSession] = useState(false)
  // Top-left Wave action — agent-level wave (no specific listing).
  // Routed to the same WaveModal used inside the immersive viewer
  // for per-listing waves; here we pass an empty pin context so the
  // dashboard inbox flags it as a profile-level inquiry.
  const [agentWaveOpen, setAgentWaveOpen] = useState(false)
  const [tabSelectedPin, setTabSelectedPin] = useState<Pin | null>(null)
  // Shared immersive viewer state — both Listings tab card taps AND
  // Reels tab thumbnail taps surface the same TikTok-style viewer.
  // When tapped from Listings, `pins` is scoped to that one listing
  // so the buyer only swipes through that listing's content. From
  // Reels, `pins` is the full list so they swipe the full grid.
  const [immersive, setImmersive] = useState<{ pins: Pin[]; startContentId: string } | null>(null)
  // Refs for the immersive viewer's bottom-sheet swipe-down gesture
  // (mobile). Sheet ref = the card itself; scroll ref is resolved
  // after mount by querying ContentFeed's `[data-immersive-scroll]`
  // element so the drag is scroll-aware (only fires when the inner
  // feed is scrolled to the top).
  const immersiveSheetRef = useRef<HTMLDivElement>(null)
  const immersiveScrollRef = useRef<HTMLElement | null>(null)
  // CSS data-visible lifecycle for the immersive viewer — same
  // pattern as ListingModal so swipe-to-dismiss + entry/exit don't
  // race each other.
  const immersiveLifecycle = useSheetLifecycle(!!immersive, 360)
  // True when a child sheet (Wave / Listing-only) is open over the
  // immersive viewer. While true, the immersive viewer's swipe-down
  // gesture is paused so dragging on the child sheet doesn't tear
  // both layers down at once. See "stacked bottom-sheets" notes.
  const [immersiveChildOpen, setImmersiveChildOpen] = useState(false)
  // md-breakpoint media query — drives the immersive viewer's
  // entry/exit animation (slide-up bottom-sheet on mobile, fade+scale
  // on desktop). Matches the rest of the agent profile's md: convention.
  const [isMdViewport, setIsMdViewport] = useState(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const h = (e: MediaQueryListEvent) => setIsMdViewport(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  // Resolve ContentFeed's inner scroll element after the immersive
  // viewer mounts so swipe-to-dismiss only fires when the feed is at
  // the top — same scroll-aware feel as ListingModal's bottom-sheet.
  useEffect(() => {
    if (!immersive) {
      immersiveScrollRef.current = null
      return
    }
    const id = requestAnimationFrame(() => {
      const el = immersiveSheetRef.current?.querySelector<HTMLElement>('[data-immersive-scroll]')
      immersiveScrollRef.current = el ?? null
    })
    return () => cancelAnimationFrame(id)
  }, [immersive])
  useSwipeToDismiss(
    immersiveSheetRef,
    immersiveScrollRef,
    immersiveLifecycle.mounted && immersiveLifecycle.visible && !isMdViewport && !immersiveChildOpen,
    () => setImmersive(null),
  )
  // Expanded map state lifted up here so the overlay can be rendered
  // at the card scope (covering header + tab switcher) instead of
  // being scoped beneath them inside the tabs container.
  const [mapExpanded, setMapExpanded] = useState(false)
  // Bounding rect of the map peek at the moment of expansion — drives
  // the clip-path "viewport increase" reveal in ExpandedMapView so
  // the map appears to grow from where the peek is, instead of
  // fading in (which felt like a page reload) or morphing children
  // (which felt distorted).
  const [mapOriginRect, setMapOriginRect] = useState<DOMRect | null>(null)
  // Live DOM reference to the peek slot. ExpandedMapView reads its
  // bbox every frame to keep the collapsed clip-path glued to the
  // peek slot — works through scroll, resize, and rotation.
  const [mapPeekEl, setMapPeekEl] = useState<HTMLElement | null>(null)
  // Tracks the close animation. Set to true *together with* the
  // `mapExpanded -> false` state change (same render batch) so the
  // map shell's `is-expanded` className stays applied for the full
  // duration of the close tween — without this, the className would
  // flip off for one render, swap the shell from fixed to absolute
  // mid-tween, and the clip-path coordinates would suddenly be in a
  // different reference frame.
  const [mapClosing, setMapClosing] = useState(false)
  const dismissMap = useCallback(() => {
    setMapClosing(true)
    setMapExpanded(false)
    window.setTimeout(() => setMapClosing(false), 620)
  }, [])
  // Mirror the agent's palette onto <html> so (a) the mobile
  // address-bar tint and overscroll color match the chosen page
  // canvas, and (b) anything outside the React tree that reads the
  // global CSS variables stays in sync. Restored to the global
  // defaults on unmount so other routes don't inherit this agent's
  // colors.
  // useLayoutEffect (not useEffect) so the variables apply BEFORE
  // the next paint — without this, the loading screen renders with
  // the global default (cream) for one frame before flipping to the
  // agent's palette, which reads as a flicker on dark themes.
  useLayoutEffect(() => {
    const root = document.documentElement
    const keys: [string, string][] = [
      ['--card-bg', palette.cardBg],
      ['--surround-bg', palette.surroundBg],
      ['--page-canvas', palette.pageCanvas],
      ['--accent', palette.accent],
      ['--accent-ink', palette.accentInk],
      ['--text-primary', palette.textPrimary],
      ['--text-secondary', palette.textSecondary],
      ['--text-muted', palette.textMuted],
      ['--frame-border', palette.border],
      ['--shadow-color', paletteShadowColor(palette)],
    ]
    const prev = keys.map(([k]) => [k, root.style.getPropertyValue(k)] as const)
    keys.forEach(([k, v]) => root.style.setProperty(k, v))
    return () => {
      prev.forEach(([k, v]) => {
        if (v) root.style.setProperty(k, v)
        else root.style.removeProperty(k)
      })
    }
  }, [palette])

  useEffect(() => {
    const tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!tag) return
    const prev = tag.getAttribute('content')
    const apply = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue('--page-canvas')
        .trim()
      // Patterned palettes (gradients / SVG urls) aren't valid
      // theme-color values — fall back to the card-bg solid color
      // so the address bar still gets a sensible tint.
      if (v && !/url\(|gradient/.test(v)) tag.setAttribute('content', v)
      else {
        const card = getComputedStyle(document.documentElement)
          .getPropertyValue('--card-bg')
          .trim()
        if (card) tag.setAttribute('content', card)
      }
    }
    apply()
    const mq = window.matchMedia('(min-width: 768px)')
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      if (prev !== null) tag.setAttribute('content', prev)
    }
  }, [palette])

  useEffect(() => {
    // Lock the page-level scroll container while a fullscreen
    // overlay is open (expanded map OR immersive content viewer).
    // Also keep it locked during the close animation (mapClosing) —
    // the shape is still position:fixed during the morph, and if
    // the user scrolls in that window the page slides under the
    // anchored shape and the clipPath chases a moving peek bbox,
    // creating the glitch-and-snap behavior.
    const el = scrollContainerRef.current
    if (!el) return
    if (mapExpanded || mapClosing || immersive) {
      const prev = el.style.overflow
      el.style.overflow = 'hidden'
      return () => { el.style.overflow = prev }
    }
  }, [mapExpanded, mapClosing, immersive])

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
    // We can't confidently distinguish "user doesn't exist" from
    // "fetch failed / timed out" — the snapshot returns null in both
    // cases. Default to a connectivity-friendly message + retry, and
    // soften the copy further when the device reports offline.
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    const heading = isOffline ? "You're offline" : 'Trouble loading this Reelst'
    const subtitle = isOffline
      ? `Reconnect and we'll bring up @${username}'s page.`
      : `We couldn't reach @${username} just now — could be a slow connection. Give it another shot.`
    return (
      <div className="map-page flex flex-col items-center justify-center text-center px-6 bg-midnight" style={{ fontFamily: 'var(--font-humanist)' }}>
        <div className="w-16 h-16 rounded-full bg-charcoal flex items-center justify-center mb-4">
          <span className="text-[28px] text-ghost">{isOffline ? '⚡' : '↻'}</span>
        </div>
        <h1 className="text-[22px] text-white mb-2" style={{ fontWeight: 600, letterSpacing: '-0.025em' }}>{heading}</h1>
        <p className="text-[14px] text-ghost mb-6 max-w-[320px]" style={{ lineHeight: 1.5 }}>{subtitle}</p>
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => window.location.reload()} className="text-tangerine font-semibold text-[15px]">Try again</motion.button>
          <span className="text-ghost/40">·</span>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate('/')} className="text-ghost font-medium text-[15px]">Go home</motion.button>
        </div>
      </div>
    )
  }

  if (agent.verificationStatus !== 'verified' && !isPreview) {
    return (
      <div className="map-page flex flex-col items-center justify-center text-center px-6 bg-midnight" style={{ fontFamily: 'var(--font-humanist)' }}>
        <div className="w-16 h-16 rounded-full bg-tangerine/15 flex items-center justify-center mb-4">
          <span className="text-[28px]">🔒</span>
        </div>
        <h1 className="text-[22px] text-white mb-2" style={{ fontWeight: 600, letterSpacing: '-0.025em' }}>Profile pending verification</h1>
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

  // ════════════════════════════════════════════
  // AGENT PROFILE
  // ════════════════════════════════════════════
  // Single-agent profile card: header (avatar / name / ticker / bio /
  // socials) → map peek → listings grid. Reuses MapCanvas (via
  // ExpandedMapView), ContentFeed (via the immersive viewer launched
  // from the listings grid), and ListingModal for pin taps.
  const inventoryCounts = (() => {
      let forSale = 0
      let sold = 0
      let openHouse = 0
      let spotlights = 0
      const now = Date.now()
      for (const p of allPins) {
        if (!p.enabled) continue
        if (p.type === 'for_sale') {
          forSale++
          // Open-house counts overlap with for-sale (an open house is
          // a for-sale listing with an upcoming session). Counted
          // separately so the header phrase can cycle through them.
          const sessions = (p as any).openHouse?.sessions as { date: string; endTime: string }[] | undefined
          if (sessions?.some((s) => parseSessionEndMs(s.date, s.endTime) > now)) openHouse++
        } else if (p.type === 'sold') sold++
        else if (p.type === 'spotlight') spotlights++
      }
      return { forSale, sold, openHouse, spotlights }
    })()
    const forSaleCount = inventoryCounts.forSale
    const firstName = (agent.displayName || agent.username || 'agent').split(' ')[0]

    return (
      <div
        ref={scrollContainerRef}
        className="fixed inset-0 w-full overflow-y-auto"
        style={{
          // Palette → CSS variables. Inline overrides cascade through
          // every child, so the entire profile reskins the moment
          // the agent picks a new palette in the Style tab. Cards stay
          // solid (--card-bg is always a color), only the canvas can
          // be a CSS background expression (gradient / pattern URL).
          ['--card-bg' as any]: palette.cardBg,
          ['--surround-bg' as any]: palette.surroundBg,
          ['--page-canvas' as any]: palette.pageCanvas,
          ['--accent' as any]: palette.accent,
          ['--accent-ink' as any]: palette.accentInk,
          ['--text-primary' as any]: palette.textPrimary,
          ['--text-secondary' as any]: palette.textSecondary,
          ['--text-muted' as any]: palette.textMuted,
          ['--frame-border' as any]: palette.border,
          ['--shadow-color' as any]: paletteShadowColor(palette),
          ['--saved-bg' as any]: palette.savedBg || palette.accent,
          ['--saved-ink' as any]: palette.savedInk || palette.accentInk,
          fontFamily: font.body,
          // Page canvas — flips between mobile (ivory, matches the
          // full-bleed card) and desktop (cream, the tonal canvas
          // around the centered card). See `--page-canvas` in
          // index.css. Keeps overscroll/load areas matched per
          // breakpoint.
          background: 'var(--page-canvas)',
          // `none` here is what actually kills both top pull-to-
          // refresh and bottom rubber-band on iOS — the html/body
          // version isn't always honored by Safari, but inner
          // overflow:auto containers consistently are.
          overscrollBehavior: 'none',
        }}
      >
        {seoElement}

        {/* Centered phone-frame card. Mobile: full-bleed. Desktop:
            ~460px-wide rounded card with breathing room and a soft
            elevation that lifts it off the tonal background. */}
        <div
          className="w-full mx-auto md:mt-6 md:rounded-t-[32px] overflow-hidden relative agent-profile-card"
          style={{
            maxWidth: '720px',
            // Card surface — drives `--card-bg` (defined in
            // index.css, defaults to ivory). All overscroll/load/
            // theme-color colors derive from this, so a future
            // premium customization can override `--card-bg` (and
            // `--surround-bg`) on a route wrapper and everything
            // updates in lockstep.
            background: 'var(--card-bg)',
            // Anchor the bg to the viewport — patterns (topography,
            // brick, formal) and gradients now scale to viewport
            // dimensions and stay still while content scrolls
            // through. The bg is still clipped to the card's bbox,
            // so on desktop the pattern is visible only within the
            // 720px column but tiled/scaled relative to the full
            // window. Note: shorthand `background:` resets
            // `background-attachment`, so this longhand has to come
            // AFTER it in source order.
            backgroundAttachment: 'fixed',
            // When the map is expanded, the card locks to viewport
            // height so the map can fill it without scroll bleed.
            // Otherwise it grows naturally with content.
            ...(mapExpanded
              ? { height: '100dvh', minHeight: '100dvh' }
              : { minHeight: '100dvh' }),
          }}
        >
          <AgentProfileHeader
            agent={agent}
            style={style}
            font={font}
            palette={palette}
            forSaleCount={forSaleCount}
            soldCount={inventoryCounts.sold}
            openHouseCount={inventoryCounts.openHouse}
            spotlightCount={inventoryCounts.spotlights}
            saved={savedSession}
            onSaveClick={() => setSaveModalOpen(true)}
            onWaveClick={() => setAgentWaveOpen(true)}
          />

          {/* Single Linktree-style scroll: map peek → listings grid.
              No tabs — the immersive viewer (per-listing taps) is
              the only navigation surface beyond this scroll. */}
          <ListingsTab
            pins={allPins}
            agent={agent}
            agentPhotoUrl={agent.photoURL}
            defaultCenter={defaultCenter}
            listingFrame={style.frames.listings}
            mapFrame={style.frames.map}
            showMap={showMap}
            listingsLayout={style.listingsLayout}
            onSelectPin={(pin) => {
              const firstContent = pin.content?.[0]
              if (firstContent) {
                // Open the immersive viewer scoped to ALL pins (not
                // just this one) so the user can keep swiping through
                // the entire agent's catalog of content from whatever
                // tile they tapped first.
                setImmersive({ pins: allPins, startContentId: firstContent.id })
              } else {
                setTabSelectedPin(pin)
              }
            }}
            onRequestExpandMap={(rect) => {
              if (rect) setMapOriginRect(rect)
              setMapExpanded(true)
            }}
            onPeekElChange={setMapPeekEl}
            mapExpanded={mapExpanded}
          />

          {/* Footer — small-print legal + Reelst link. Lives at the
              bottom of the agent profile card so it's the last
              thing the user sees on the scroll. Internal routes
              use React Router; the Reelst link is a same-route
              "/" that goes to the marketing landing page. */}
          <footer
            className="px-5 md:px-7 pt-6 pb-8 text-center"
            style={{ fontFamily: 'var(--font-humanist)' }}
          >
            <p
              className="text-smoke"
              style={{ fontSize: '11.5px', fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.6 }}
            >
              <Link to="/privacy" className="hover:text-ink underline-offset-2 hover:underline">Privacy</Link>
              <span className="mx-2 opacity-50">·</span>
              <Link to="/terms" className="hover:text-ink underline-offset-2 hover:underline">Terms</Link>
              <span className="mx-2 opacity-50">·</span>
              <Link to="/" className="hover:text-ink underline-offset-2 hover:underline">Reelst</Link>
            </p>
          </footer>

          {/* Expanded map — rendered at the card scope so it covers
              the header entirely. Mobile: viewport-fixed.
              Desktop: card-bound (md:absolute md:inset-0). Always
              mounted (the listings grid is the only page surface
              now, so the map is always relevant). */}
          {showMap && (
            <ExpandedMapView
              open={mapExpanded}
              closing={mapClosing}
              originRect={mapOriginRect}
              peekEl={mapPeekEl}
              visible
              shapeId={style.shapeId}
              frame={style.frames.map}
              onClose={dismissMap}
              onRequestOpen={(rect) => {
                if (rect) setMapOriginRect(rect)
                setMapExpanded(true)
              }}
              pins={allPins.filter((p) => p.enabled)}
              agent={agent}
              agentPhotoUrl={agent.photoURL}
              defaultCenter={defaultCenter}
              saved={savedSession}
              onSaveClick={() => setSaveModalOpen(true)}
              onSelectPin={setTabSelectedPin}
            />
          )}

        </div>

        <SaveAgentModal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          agentId={agent.uid}
          agentName={firstName}
          agentPhotoURL={agent.photoURL}
          source="profile"
          onSubscribed={() => setSavedSession(true)}
        />

        {/* Agent-level Wave — fired from the top-left header icon.
            No specific listing context (pinId/pinAddress empty) so
            the dashboard inbox flags it as a profile-level inquiry. */}
        <WaveModal
          isOpen={agentWaveOpen}
          onClose={() => setAgentWaveOpen(false)}
          pinId=""
          pinAddress=""
          agentId={agent.uid}
          agentName={firstName}
        />

        {/* Listing modal — bottom-sheet on mobile, viewport-centered
            modal on desktop (matches the convention used by every
            other modal/sheet on the agent profile). Triggered both
            by listing card taps and pin taps. */}
        {tabSelectedPin && (
          <ListingModal
            pin={tabSelectedPin}
            agent={agent}
            onClose={() => setTabSelectedPin(null)}
          />
        )}

        {/* Shared immersive viewer — opened by listing card taps
            (scoped to that single listing) AND reel thumbnail taps
            (scoped to the full reel grid). Fullscreen TikTok-style
            flow with rail trimmed to save-agent + wave + share +
            listing. Mobile = bottom-sheet (slide up + swipe-down to
            dismiss). Desktop = centered modal (fade+scale + backdrop
            click to dismiss). Uses the shared `data-visible` CSS
            pattern so swipe-to-dismiss (which mutates transform) and
            the entry/exit transitions don't fight each other on
            dismissal — same convention as ListingModal. */}
        {immersiveLifecycle.mounted && (
          <div
            data-visible={immersiveLifecycle.visible}
            className="sheet-stack fixed inset-0 z-[140] flex items-end md:items-center md:justify-center"
          >
            <div
              data-visible={immersiveLifecycle.visible}
              onClick={() => setImmersive(null)}
              className="sheet-scrim sheet-scrim--dark absolute inset-0"
            />
            <div
              ref={immersiveSheetRef}
              data-visible={immersiveLifecycle.visible}
              onClick={(e) => e.stopPropagation()}
              className="immersive-sheet relative w-full md:max-w-[460px] md:rounded-[24px] overflow-hidden bg-midnight"
              style={{
                boxShadow: '0 30px 80px -16px rgba(10,14,23,0.55), 0 12px 32px -16px rgba(10,14,23,0.4)',
                touchAction: 'pan-y',
              }}
            >
              {/* Drag handle pill — mobile only, visual affordance.
                  The actual swipe-to-dismiss listens on the whole
                  sheet via useSwipeToDismiss (scroll-aware: only
                  fires when ContentFeed is scrolled to the top, and
                  only when no child sheet is open on top). */}
              <div
                className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 z-[42] pointer-events-none"
                aria-hidden
              >
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>
              {immersive && (
                <ContentFeed
                  pins={immersive.pins}
                  agent={agent}
                  viewerMode="immersive"
                  startAtContentId={immersive.startContentId}
                  onClose={() => setImmersive(null)}
                  isOwnProfile={false}
                  isPreview={false}
                  isSignedIn={false}
                  agentSaved={savedSession}
                  onSaveAgent={() => setSaveModalOpen(true)}
                  onChildSheetOpenChange={setImmersiveChildOpen}
                />
              )}
            </div>
          </div>
        )}
      </div>
    )
}

/**
 * Mount-once-keep-alive tab container with a smooth cross-fade.
 * The active tab is at full opacity and in normal flow; inactive
 * tabs are absolute-positioned so they don't take up layout
 * (preventing scroll-position weirdness) and faded to opacity 0
 * with pointer-events disabled. Initial mount of a tab fades in,
 * subsequent toggles fade between active/inactive.
 */
