import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bed, Bathtub as Bath, ArrowsOut as Maximize, House as Home, SealCheck as BadgeCheck, Compass, Play } from '@phosphor-icons/react'
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
  /** Tap on the map peek asks the parent to expand the map. */
  onRequestExpandMap: (originRect: DOMRect | null) => void
  /** When the expanded map is open, hide the peek so the user
   *  doesn't see two copies of the map at once. */
  mapExpanded?: boolean
  /** Hands the peek slot's DOM element up so the parent's
   *  always-mounted ExpandedMapView can read its bbox imperatively. */
  onPeekElChange?: (el: HTMLElement | null) => void
  listingFrame?: FrameStyle
  mapFrame?: FrameStyle
  showMap?: boolean
  /** Layout strategy for listings — `scroller` (3 visible, drag right
   *  to scroll) or `grid` (wraps onto more rows instead of scrolling). */
  listingsLayout?: 'scroller' | 'grid'
}

export function ListingsTab({
  pins,
  agent: _agent,
  agentPhotoUrl: _agentPhotoUrl,
  defaultCenter: _defaultCenter,
  onSelectPin,
  onRequestExpandMap,
  mapExpanded,
  onPeekElChange,
  listingFrame = 'none',
  mapFrame = 'none',
  showMap = true,
  listingsLayout = 'scroller',
}: ListingsTabProps) {

  // mapFrame is consumed by ExpandedMapView (the component that
  // actually owns the shape) — applied as a shape-following SVG
  // stroke + drop-shadow halo. The peek button here stays a
  // transparent layout placeholder so the rectangle never gets a
  // bbox-shaped border.
  void mapFrame

  // Visible pins on the public profile = enabled + non-archived.
  const visiblePins = useMemo(() => pins.filter((p) => p.enabled), [pins])
  const peekRef = useRef<HTMLDivElement>(null)

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
        {/* Map peek — non-interactive layout placeholder. The empty
            corners around the heart/circle/etc shape used to be
            clickable here (the whole bbox was a button); now they
            pass through. Tap-to-expand is handled by the map shape
            itself (ExpandedMapView) — its clip-path means only the
            visible shape is clickable — plus the "Open map" pill
            below as a separate affordance. */}
        {showMap && <div
          ref={peekRef}
          className="block w-full mb-6 rounded-[20px] relative"
          style={{
            // Bumped from 20vh / 220px so the heart-masked map
            // reads as a substantial shape, not a small icon.
            height: 'min(32vh, 320px)',
            background: 'transparent',
            pointerEvents: 'none',
          }}
        >
          {/* "Open map" pill — its own clickable button. z-50 so it
              stays above the map shell (which sits at z-40 inside
              the card on desktop). */}
          <button
            type="button"
            onClick={() => onRequestExpandMap(peekRef.current?.getBoundingClientRect() ?? null)}
            disabled={mapExpanded}
            aria-label="Open fullscreen map"
            className="absolute bottom-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-white/95 backdrop-blur-sm border border-black/[0.05] cursor-pointer"
            style={{
              opacity: mapExpanded ? 0 : 1,
              transition: 'opacity 0.18s ease',
              pointerEvents: mapExpanded ? 'none' : 'auto',
            }}
          >
            <Maximize size={12} className="text-ink" />
            <span
              className="text-ink"
              style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '-0.005em' }}
            >
              Open map
            </span>
          </button>
        </div>}

        {visiblePins.length === 0 ? null : listingsLayout === 'grid' ? (
          <GridLayout pins={visiblePins} listingFrame={listingFrame} onSelectPin={onSelectPin} />
        ) : (
          <ScrollerLayout pins={visiblePins} listingFrame={listingFrame} onSelectPin={onSelectPin} />
        )}
      </div>
    </>
  )
}

/* ─────────────── Scroller layout ───────────────
   1 → centered 1:1 square (half-width)
   2 → two 1:1 squares filling the row
   3 → three 9:16 portrait cards filling the row
   4+ → first three 9:16 visible, overflow scrolls right; tile width
        stays 1/3 of the row so the 4th card peeks in to signal
        scrollability. Native horizontal scroll + scroll-snap, no
        custom drag JS needed (mobile + trackpad both work). */
function ScrollerLayout({
  pins,
  listingFrame,
  onSelectPin,
}: {
  pins: Pin[]
  listingFrame: FrameStyle
  onSelectPin: (pin: Pin) => void
}) {
  const total = pins.length

  if (total === 1) {
    return (
      <div className="flex justify-center">
        <div className="w-1/2">
          <ListingCardCompact pin={pins[0]} frame={listingFrame} aspect="1/1" onClick={() => onSelectPin(pins[0])} />
        </div>
      </div>
    )
  }

  if (total === 2) {
    return (
      <div className="grid grid-cols-2" style={{ gap: '8px' }}>
        {pins.map((pin) => (
          <ListingCardCompact key={pin.id} pin={pin} frame={listingFrame} aspect="1/1" onClick={() => onSelectPin(pin)} />
        ))}
      </div>
    )
  }

  // 3+ cards — horizontal scroller. Each card is exactly 1/3 of the
  // row (with gap accounted for) so 3 fit perfectly when total === 3,
  // and the 4th peeks in when total >= 4 to signal scroll affordance.
  return (
    <div
      className="overflow-x-auto -mx-5 md:-mx-7 px-5 md:px-7 snap-x snap-mandatory"
      style={{
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <style>{`.listings-scroller::-webkit-scrollbar { display: none }`}</style>
      <div className="listings-scroller flex" style={{ gap: '8px' }}>
        {pins.map((pin) => (
          <div
            key={pin.id}
            className="snap-start shrink-0"
            // Width = (100% - 2 gaps of 8px) / 3 = calc((100% - 16px) / 3)
            // so exactly three cards fit a 100%-width row.
            style={{ width: 'calc((100% - 16px) / 3)' }}
          >
            <ListingCardCompact pin={pin} frame={listingFrame} aspect="9/16" onClick={() => onSelectPin(pin)} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Grid layout ───────────────
   Same column scale as scroller for the first row, but 4+ wraps to
   additional rows instead of scrolling sideways:
     1   → centered 1:1 (half-width)
     2   → 2 cols 1:1
     3+  → 3-col grid at 9:16, wraps onto more rows */
function GridLayout({
  pins,
  listingFrame,
  onSelectPin,
}: {
  pins: Pin[]
  listingFrame: FrameStyle
  onSelectPin: (pin: Pin) => void
}) {
  const total = pins.length

  if (total === 1) {
    return (
      <div className="flex justify-center">
        <div className="w-1/2">
          <ListingCardCompact pin={pins[0]} frame={listingFrame} aspect="1/1" onClick={() => onSelectPin(pins[0])} />
        </div>
      </div>
    )
  }

  if (total === 2) {
    return (
      <div className="grid grid-cols-2" style={{ gap: '8px' }}>
        {pins.map((pin) => (
          <ListingCardCompact key={pin.id} pin={pin} frame={listingFrame} aspect="1/1" onClick={() => onSelectPin(pin)} />
        ))}
      </div>
    )
  }

  // 3+ cards — 3-col grid at 9:16, wraps onto more rows.
  return (
    <div className="grid grid-cols-3" style={{ gap: '8px' }}>
      {pins.map((pin) => (
        <ListingCardCompact key={pin.id} pin={pin} frame={listingFrame} aspect="9/16" onClick={() => onSelectPin(pin)} />
      ))}
    </div>
  )
}

/* ─────────────── Compact listing card ─────────────── */

function ListingCardCompact({
  pin,
  frame = 'none',
  aspect = '9/16',
  onClick,
}: {
  pin: Pin
  frame?: FrameStyle
  /** CSS aspect-ratio (e.g., "1/1", "9/16"). Caller decides per layout. */
  aspect?: '1/1' | '9/16'
  onClick: () => void
}) {
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
  // Multi-photo "carousel" content is `type: 'photo'` with mediaUrls
  // length > 1 (there is no separate 'carousel' ContentType — that
  // string lives only in the editor's internal CarouselStep type).
  const contentType = firstContent?.type
  const hasMultiplePhotos = (firstContent?.mediaUrls?.length ?? 0) > 1
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
      className="group relative block w-full overflow-hidden text-left bg-cream cursor-pointer rounded-[14px]"
      style={{
        // Aspect comes from the parent layout (1:1 for ≤2-col layouts
        // and the deck; 9:16 for the 3-col scroller). Image inside
        // uses contain-blur so the photo's native framing is
        // preserved regardless of the card's aspect.
        aspectRatio: aspect.replace('/', ' / '),
        // Border + shadow both use the palette accent (dot color in
        // the swatch) for cohesion with the wave / save / verified
        // badge / map frame.
        outline: wantsBorder ? '3px solid var(--accent, #D94A1F)' : undefined,
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
        // No photos AND no content — show the type-icon fallback
        // (For Sale → Home, Sold → BadgeCheck, Spotlight → Compass)
        // on the same gradient instead of an empty colored card.
        <TypeIconFallback isSold={isSold} isSpotlight={isSpotlight} />
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
