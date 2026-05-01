import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bed, Bathtub as Bath, ArrowsOut as Maximize, MapPin, House as Home, SealCheck as BadgeCheck, Compass, Play } from '@phosphor-icons/react'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { displayAddressWithUnit } from '@/lib/format'
import { formatPrice } from '@/lib/firestore'
import type { Pin, ForSalePin, SoldPin, OpenHouse, UserDoc } from '@/lib/types'
import type { FrameStyle } from '@/lib/style'

/* ════════════════════════════════════════════════════════════════
   LISTINGS TAB — peek-map + card grid, fullscreen on demand
   ────────────────────────────────────────────────────────────────
   Top: map peek at ~1/5 viewport height. Tap or swipe-down at top
   of scroll → animates to fullscreen map. Below the peek: 2-column
   compact 9:16 listing cards (IG style). Click a card → ListingModal
   via the parent's onSelectPin handler.
   Fullscreen state: cycling badge "X for sale / Y sold" Zillow-style,
   X dismiss top-right. Save Maya pill is hidden by the parent during
   fullscreen.
   ──────────────────────────────────────────────────────────────── */

interface ListingsTabProps {
  pins: Pin[]
  agent: UserDoc
  agentPhotoUrl?: string | null
  defaultCenter?: [number, number]
  /** Tap on a card or pin opens the listing modal. */
  onSelectPin: (pin: Pin) => void
  /** Tap on the map peek asks the parent to expand the map. The
   *  parent uses `originRect` (the peek's current bounding box) to
   *  drive a clip-path "viewport increase" animation from the peek's
   *  position to fullscreen — children render at final layout the
   *  whole time, so no scaling distortion. */
  onRequestExpandMap: (originRect: DOMRect | null) => void
  /** When the expanded map is open, hide the peek so the user
   *  doesn't see two copies of the map at once during the
   *  clip-path reveal. */
  mapExpanded?: boolean
  /** Hands the peek slot's DOM element up so the parent's
   *  always-mounted ExpandedMapView can read its bbox imperatively
   *  in a rAF loop — bypassing React state-update cycles keeps the
   *  collapsed clip-path glued to the peek slot during scroll and
   *  through orientation changes. */
  onPeekElChange?: (el: HTMLElement | null) => void
  /** Frame treatment for each compact listing card. Driven by the
   *  agent's Style tab — none / border / shadow / both. */
  listingFrame?: FrameStyle
  /** Frame treatment for the map peek slot. The peek itself is
   *  transparent — this draws an outline / shadow around its bbox so
   *  the map (which is clipped to the peek shape via the parent's
   *  ExpandedMapView) reads as a "framed" element. */
  mapFrame?: FrameStyle
  /** Whether the map section is enabled in the agent's Style. When
   *  false, the peek slot doesn't render and the listings grid
   *  starts flush at the top of the card. */
  showMap?: boolean
}

export function ListingsTab({
  pins,
  agent: _agent, // not used here anymore — parent owns expanded map
  agentPhotoUrl: _agentPhotoUrl,
  defaultCenter: _defaultCenter,
  onSelectPin,
  onRequestExpandMap,
  mapExpanded,
  onPeekElChange,
  listingFrame = 'none',
  mapFrame = 'none',
  showMap = true,
}: ListingsTabProps) {

  // mapFrame is consumed by ExpandedMapView (the component that
  // actually owns the shape) — applied as a shape-following SVG
  // stroke + drop-shadow halo. The peek button here stays a
  // transparent layout placeholder so the rectangle never gets a
  // bbox-shaped border.
  void mapFrame

  // Visible pins on the public profile = enabled + non-archived.
  const visiblePins = useMemo(() => pins.filter((p) => p.enabled), [pins])
  const peekRef = useRef<HTMLButtonElement>(null)

  // Hand the peek element up so AgentProfile's always-mounted
  // ExpandedMapView can imperatively track its bbox each frame.
  // `showMap` is in the deps so toggling the map section off then
  // on re-fires the handoff with the freshly-mounted button — the
  // peek button only renders when showMap is true (see below), so
  // its DOM identity changes each cycle and the parent must learn
  // about it again.
  useEffect(() => {
    if (showMap) onPeekElChange?.(peekRef.current)
    else onPeekElChange?.(null)
    return () => onPeekElChange?.(null)
  }, [showMap, onPeekElChange])

  return (
    <>
      {/* ── Peek-map + IG-style listing grid (single padded wrapper) ──
          Both share the same horizontal padding as the rest of the
          card content so the grid aligns with the map width above. */}
      <div className="px-5 md:px-7 pb-32" style={{ fontFamily: 'var(--font-humanist)' }}>
        {/* Map peek — transparent placeholder reserving layout space.
            The actual map renders at the agent-profile-card scope
            (always-mounted in ExpandedMapView) and is clipped to this
            slot's bbox via clip-path that's updated each animation
            frame imperatively. */}
        {showMap && <button
          ref={peekRef}
          onClick={() => onRequestExpandMap(peekRef.current?.getBoundingClientRect() ?? null)}
          className="block w-full mb-6 rounded-[20px] cursor-pointer relative"
          style={{
            // Bumped from 20vh / 220px so the heart-masked map
            // reads as a substantial shape, not a small icon.
            height: 'min(32vh, 320px)',
            background: 'transparent',
            pointerEvents: mapExpanded ? 'none' : 'auto',
          }}
          aria-label="Open fullscreen map"
        >
          {/* "Open map" hint pill — only visible chrome on the peek.
              z-50 so it stays above the map shell (which sits at z-40
              inside the card on desktop). */}
          <div
            className="absolute bottom-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-white/95 backdrop-blur-sm border border-black/[0.05]"
            style={{
              opacity: mapExpanded ? 0 : 1,
              transition: 'opacity 0.18s ease',
              pointerEvents: 'none',
            }}
          >
            <Maximize size={12} className="text-ink" />
            <span
              className="text-ink"
              style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '-0.005em' }}
            >
              Open map
            </span>
          </div>
        </button>}

        {/* IG-style 3-col grid — sits inside the same horizontal
            padding as the map peek so it aligns with the map width.
            Cards remain flush against each other inside the row;
            the row itself is inset from the card edges. */}
        {visiblePins.length === 0 ? (
          <EmptyListings />
        ) : (
          <div className="grid grid-cols-3" style={{ gap: '8px' }}>
            {visiblePins.map((pin) => (
              <ListingCardCompact key={pin.id} pin={pin} frame={listingFrame} onClick={() => onSelectPin(pin)} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ─────────────── Compact listing card ─────────────── */

function ListingCardCompact({ pin, frame = 'none', onClick }: { pin: Pin; frame?: FrameStyle; onClick: () => void }) {
  const wantsBorder = frame === 'border' || frame === 'border_shadow'
  const wantsShadow = frame === 'shadow' || frame === 'border_shadow'
  // Prefer the content's own thumbnail when one exists — content is
  // authored in the platform's native 9:16 frame, so the card crop
  // matches what the buyer will see when they tap in. Fall back to
  // heroPhotoUrl (landscape MLS photo) only when there's no content.
  const firstContent = pin.content?.[0]
  const contentImage = firstContent?.thumbnailUrl || firstContent?.mediaUrl || null
  const heroPhoto = pin.type !== 'spotlight' && 'heroPhotoUrl' in pin && pin.heroPhotoUrl
    ? pin.heroPhotoUrl
    : null
  const heroImage = contentImage || heroPhoto

  const isSold = pin.type === 'sold'
  const isSpotlight = pin.type === 'spotlight'
  const fp = !isSpotlight ? (pin as ForSalePin | SoldPin) : null
  const price = fp ? ('price' in fp ? fp.price : (fp as SoldPin).soldPrice) : null
  const beds = fp && 'beds' in fp ? (fp as ForSalePin | SoldPin).beds : null
  const baths = fp && 'baths' in fp ? (fp as ForSalePin | SoldPin).baths : null

  const openHouse: OpenHouse | null | undefined =
    pin.type === 'for_sale' && 'openHouse' in pin ? (pin as ForSalePin).openHouse : null
  const hasOpenHouse = !!useNextOpenHouseSession(openHouse)

  // Top-right content-type icon — only shown when the listing has
  // rich content beyond a single hero photo. Single photos = no icon.
  const contentType = firstContent?.type
  const hasMultiplePhotos = contentType === 'carousel' || (firstContent?.mediaUrls?.length ?? 0) > 1
  const hasReel = contentType === 'reel'

  // Top-left status pill copy + color. Open House replaces "For Sale"
  // when the listing has an active or upcoming session.
  const statusLabel = hasOpenHouse
    ? 'Open House'
    : isSold
      ? 'Sold'
      : isSpotlight
        ? 'Spotlight'
        : 'For Sale'
  const statusColor = hasOpenHouse
    ? '#D94A1F'
    : isSold
      ? '#1F8E3D'
      : isSpotlight
        ? '#D94A1F'
        : '#2D6FD3'

  return (
    <button
      onClick={onClick}
      className="group relative block w-full aspect-[9/16] overflow-hidden text-left bg-cream cursor-pointer rounded-[14px]"
      style={{
        // Border + shadow both use the palette accent (dot color in
        // the swatch) for cohesion with the wave / save / verified
        // badge / map frame.
        // outline-offset 0 keeps the stroke ON the card's edge
        // (sits flush with the rounded corner). Negative offsets
        // pull the line INSIDE the card, which read as an inset
        // line over the photo — not what "border" should look like.
        outline: wantsBorder ? '2.5px solid var(--accent, #D94A1F)' : undefined,
        outlineOffset: wantsBorder ? '0' : undefined,
        boxShadow: wantsShadow ? '6px 6px 0 0 var(--accent, #D94A1F)' : undefined,
      }}
    >
      {heroImage ? (
        <ProgressiveImage
          src={heroImage}
          alt={pin.address}
          className="absolute inset-0 w-full h-full"
          fit="contain-blur"
          fallback={<TypeIconFallback isSold={isSold} isSpotlight={isSpotlight} />}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              isSold
                ? 'linear-gradient(135deg, #34C759 0%, #1F8E3D 100%)'
                : isSpotlight
                  ? 'linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)'
                  : 'linear-gradient(135deg, #5BA8FF 0%, #2D6FD3 100%)',
          }}
        />
      )}

      {/* Bottom gradient — for legibility of address/price text */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      {/* Top-left: status pill (For Sale / Sold / Spotlight / Open House) */}
      <div className="absolute top-2 left-2">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-[6px] bg-warm-white/95"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8.5px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Top-right: content-type icon — IG-style. Shown only when the
          listing has carousel or reel content (single photos = no icon
          to avoid clutter). */}
      {(hasMultiplePhotos || hasReel) && (
        <div
          className="absolute top-2 right-2 text-white"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.65))' }}
        >
          {hasReel
            ? <Play weight="fill" size={16} />
            : <CarouselGlyph size={16} />}
        </div>
      )}

      {/* Bottom block: address · price · bd/bt — compact for grid */}
      <div className="absolute inset-x-0 bottom-0 p-2 text-white">
        <p
          className="truncate"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '-0.005em',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          {displayAddressWithUnit(pin.address, pin.unit).split(',')[0]}
        </p>
        {price != null && (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {formatPrice(price)}
          </p>
        )}
        {beds != null && baths != null && (
          <p
            className="flex items-center gap-1.5"
            style={{
              fontFamily: 'var(--font-humanist)',
              fontSize: '9.5px',
              fontWeight: 500,
              opacity: 0.92,
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            }}
          >
            <span className="inline-flex items-center gap-0.5"><Bed size={9} /> {beds}</span>
            <span className="inline-flex items-center gap-0.5"><Bath size={9} /> {baths}</span>
          </p>
        )}
      </div>
    </button>
  )
}

/**
 * Small "stack of frames" glyph — IG carousel indicator. Two squares
 * offset so it reads as multi-photo content at a glance. The back
 * square is filled with a small dark inset so the front square is
 * legible regardless of background.
 */
function CarouselGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back square */}
      <rect x="7" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.0" />
      {/* Front square — solid stroke, slight fill so it reads against any photo */}
      <rect x="3" y="7" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.0" />
    </svg>
  )
}

/* ─────────────── Empty state ─────────────── */

function EmptyListings() {
  return (
    <div
      className="rounded-[20px] py-12 px-6 text-center"
      style={{
        background: 'linear-gradient(135deg, rgba(255,133,82,0.06) 0%, rgba(217,74,31,0.04) 100%)',
        border: '1px solid rgba(255,133,82,0.18)',
        fontFamily: 'var(--font-humanist)',
      }}
    >
      <div
        className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
        style={{ background: 'var(--brand-grad)' }}
      >
        <MapPin size={18} className="text-white" />
      </div>
      <p
        className="text-ink"
        style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em' }}
      >
        No listings on the map yet
      </p>
      <p
        className="text-graphite mt-1.5"
        style={{ fontSize: '13.5px', fontWeight: 400, lineHeight: 1.5 }}
      >
        New listings drop here the moment they go live.
      </p>
    </div>
  )
}

/* ─────────────── Cycling count badge ─────────────── */

interface CyclingPhase { label: string; dot: string }

export function CyclingCountBadge({
  forSale,
  sold,
  openHouse = 0,
  spotlight = 0,
  onTap,
}: {
  forSale: number
  sold: number
  openHouse?: number
  spotlight?: number
  onTap: () => void
}) {
  // Cycle every ~2.6s through every non-zero count — a Zillow-style
  // single pill that morphs through "for sale → sold → open houses
  // → spotlights". Skips any count that's zero.
  const phases = useMemo<CyclingPhase[]>(() => {
    const out: CyclingPhase[] = []
    if (forSale > 0) out.push({ label: `${forSale} home${forSale !== 1 ? 's' : ''} for sale`, dot: '#3B82F6' })
    if (sold > 0) out.push({ label: `${sold} home${sold !== 1 ? 's' : ''} sold`, dot: '#34C759' })
    if (openHouse > 0) out.push({ label: `${openHouse} open house${openHouse !== 1 ? 's' : ''}`, dot: '#FF8552' })
    if (spotlight > 0) out.push({ label: `${spotlight} spotlight${spotlight !== 1 ? 's' : ''}`, dot: '#D94A1F' })
    if (out.length === 0) out.push({ label: 'No listings yet', dot: '#94A3B8' })
    return out
  }, [forSale, sold, openHouse, spotlight])

  const [phaseIdx, setPhaseIdx] = useState(0)
  useEffect(() => {
    setPhaseIdx(0)
    if (phases.length <= 1) return
    const id = window.setInterval(() => {
      setPhaseIdx((p) => (p + 1) % phases.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [phases.length])

  // Longest phrase establishes the pill's width via an invisible
  // ghost span, so swapping phrases never reflows the pill. The
  // visible animated phrase is absolutely positioned on top.
  const longest = useMemo(
    () => phases.reduce((a, b) => (b.label.length > a.length ? b.label : a), ''),
    [phases],
  )
  // Guard against the brief render between (a) a filter change that
  // shrinks `phases` and (b) the useEffect that resets phaseIdx to 0.
  // During that single render, phases[phaseIdx] can be undefined and
  // any property access on it crashes the boundary. Fall back to the
  // first phase — there's always at least one (the "No listings yet"
  // fallback inside the useMemo above).
  const current = phases[phaseIdx] ?? phases[0]

  return (
    <button
      onClick={onTap}
      className="cycling-count-badge absolute left-1/2 -translate-x-1/2 z-[14] px-5 h-12 rounded-full bg-warm-white/96 backdrop-blur-sm flex items-center gap-2.5 cursor-pointer"
      style={{
        boxShadow: '0 -4px 18px -6px rgba(10,14,23,0.18), 0 10px 28px -10px rgba(10,14,23,0.3)',
        fontFamily: 'var(--font-humanist)',
      }}
    >
      <motion.span
        aria-hidden
        className="w-2 h-2 rounded-full"
        animate={{ background: current.dot }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ background: current.dot }}
      />
      {/* Width-stable text region: invisible ghost pins the width to
          the longest phrase; the live phrase sits absolutely on top
          and crossfades on phase change. */}
      <span
        className="relative inline-block whitespace-nowrap"
        style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.005em' }}
      >
        <span aria-hidden style={{ visibility: 'hidden' }}>{longest}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={phaseIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-ink whitespace-nowrap absolute inset-0 flex items-center justify-center"
            style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.005em' }}
          >
            {current.label}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  )
}

/* ─────────────── Open house helpers ─────────────── */

function useNextOpenHouseSession(openHouse: OpenHouse | null | undefined): string | null {
  if (!openHouse?.sessions?.length) return null
  const now = new Date()
  const nowTs = now.getTime()
  // Find the next session that starts in the future or is currently happening.
  const upcoming = openHouse.sessions
    .map((s) => {
      const start = parseSessionStart(s.date, s.startTime)
      const end = parseSessionStart(s.date, s.endTime)
      return { start, end, raw: s }
    })
    .filter((s) => s.end > nowTs)
    .sort((a, b) => a.start - b.start)
  const next = upcoming[0]
  if (!next) return null
  return formatSessionLabel(new Date(next.start))
}

function parseSessionStart(date: string, time: string): number {
  // YYYY-MM-DD + HH:MM
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).getTime()
}

function formatSessionLabel(d: Date): string {
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  if (isToday) return 'OPEN TODAY'
  if (isTomorrow) return 'OPEN TMR'
  return `OPEN ${d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}`
}

/**
 * Type-icon fallback for ProgressiveImage when a hero photo fails to
 * load. Shows the same gradient block + pin-type icon we use for pins
 * that never had a photo, so offline / 404 / broken-Storage cards
 * stay on-brand instead of rendering the browser's broken-image glyph.
 */
function TypeIconFallback({ isSold, isSpotlight }: { isSold: boolean; isSpotlight: boolean }) {
  const Icon = isSold ? BadgeCheck : isSpotlight ? Compass : Home
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: isSold
          ? 'linear-gradient(135deg, #34C759 0%, #1F8E3D 100%)'
          : isSpotlight
            ? 'linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)'
            : 'linear-gradient(135deg, #5BA8FF 0%, #2D6FD3 100%)',
      }}
    >
      <Icon size={36} weight="light" className="text-white/85" />
    </div>
  )
}
