import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowsOut as Maximize, House as Home, Key, Compass, Play } from '@phosphor-icons/react'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { OpenHouseBadge } from '@/components/ui/OpenHouseBadge'
import { displayAddressWithUnit } from '@/lib/format'
import { formatPrice } from '@/lib/firestore'
import { nextSession } from '@/lib/openHouse'
import type { Palette, FontPairing } from '@/lib/style'
import type { Pin, ForSalePin, SoldPin, SpotlightPin, OpenHouse, UserDoc } from '@/lib/types'
import type { FrameStyle } from '@/lib/style'

/** Card body uses a TINTED version of `palette.accent` as its
 *  background — full-saturation accent flooding a large surface
 *  reads as heavy + clashes; a soft tint stays branded while
 *  letting the address + bd/ba text actually breathe. CSS
 *  color-mix() ships in every evergreen browser (Chrome 111+,
 *  Safari 16.2+, Firefox 113+). Subtle top-to-bottom gradient
 *  gives the surface a "lit from above" feel rather than flat
 *  paint — the user described it as "shadowyer" in design review. */
const CARD_BODY_TOP_PCT = 84   // 84% white = barely-tinted top
const CARD_BODY_BOTTOM_PCT = 72 // 72% white = punchier-tinted bottom
function cardBodyBackground(accent: string): string {
  const top = `color-mix(in srgb, #FFFFFF ${CARD_BODY_TOP_PCT}%, ${accent} ${100 - CARD_BODY_TOP_PCT}%)`
  const bottom = `color-mix(in srgb, #FFFFFF ${CARD_BODY_BOTTOM_PCT}%, ${accent} ${100 - CARD_BODY_BOTTOM_PCT}%)`
  return `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`
}

/* ─────────────── Thumbnail resolution ───────────────
   Priority used by the new Zillow-style card:
     1. Content thumbnail (first content item's thumbnailUrl/mediaUrl,
        plus its `aspect` field if known)
     2. Listing hero photo (heroPhotoUrl / photos[0]) — MLS landscape,
        we don't have aspect metadata so default to 4:3
     3. Type-icon fallback (For Sale / Sold / Spotlight) — square
   `aspect` returned in CSS-friendly W/H form (e.g. '9 / 16'). */
const ASPECT_TO_CSS: Record<string, string> = {
  '9:16': '9 / 16',
  '4:5':  '4 / 5',
  '1:1':  '1 / 1',
  '3:4':  '3 / 4',  // 3 wide, 4 tall — tallish landscape
  '4:3':  '4 / 3',
  '16:9': '16 / 9',
}

function resolveThumb(pin: Pin): { src: string | null; aspect: string } {
  const firstContent = pin.content?.[0]
  if (firstContent) {
    const src = firstContent.thumbnailUrl || firstContent.mediaUrl || (firstContent.mediaUrls && firstContent.mediaUrls[0]) || null
    if (src) {
      const a = firstContent.aspect && ASPECT_TO_CSS[firstContent.aspect]
        ? ASPECT_TO_CSS[firstContent.aspect]
        : '9 / 16' // reels default
      return { src, aspect: a }
    }
  }
  if (pin.type !== 'spotlight' && 'heroPhotoUrl' in pin && pin.heroPhotoUrl) {
    return { src: pin.heroPhotoUrl, aspect: '4 / 3' }
  }
  if (pin.type === 'spotlight' && pin.heroPhotoUrl) {
    return { src: pin.heroPhotoUrl, aspect: '4 / 3' }
  }
  return { src: null, aspect: '1 / 1' }
}

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
  /** Width-to-height ratio of the agent's map shape (1 for the
   *  geometric shapes, varies for state shapes — NJ ~0.43, TX
   *  ~1.1). The peek slot's bbox sizes itself to this aspect so
   *  the silhouette fills the peek tightly instead of rendering
   *  as a thin sliver in a wide rectangle surrounded by empty
   *  cardbg topography. */
  shapeAspect?: number
  /** Layout strategy for listings — `scroller` (3 visible, drag right
   *  to scroll) or `grid` (wraps onto more rows instead of scrolling). */
  listingsLayout?: 'scroller' | 'grid'
  /** Agent's resolved palette — body of each card uses a TINTED
   *  version of palette.accent (~22% accent + 78% white, top→bottom
   *  gradient) so the brand color still reads as accent but the
   *  large surface area doesn't overwhelm. Body ink is hardcoded to
   *  near-black since the tinted bg is always on the light end,
   *  regardless of how dark the accent itself is. */
  palette: Palette
  /** Agent's chosen font pairing — body of each card uses font.body
   *  for everything (price, address, beds/baths, description). The
   *  status chip on the thumbnail keeps its own mono caps style. */
  font: FontPairing
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
  palette,
  font,
  shapeAspect = 1,
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
        {showMap && <style>{`
          /* Map peek slot — height is a FIXED pixel value (not
             vh-relative), so the silhouette renders at the same
             size on a short-viewport landscape phone as it does
             on a tall-viewport desktop. The page just scrolls
             vertically when there isn't enough room — nothing
             distorts or compresses. Width derives from the
             shape aspect ratio set inline on the element below,
             so the silhouette tightly fills the peek.
             ExpandedMapView reads this div's bbox imperatively
             to compute the shape size. */
          .listings-map-peek {
            height: 280px;
            margin-left: auto;
            margin-right: auto;
            max-width: 100%;
          }
        `}</style>}
        {showMap && <div
          ref={peekRef}
          className="listings-map-peek block mb-6 rounded-[20px] relative"
          style={{
            // Width derives from height × shape aspect — narrow
            // states (NJ ~0.43) get a narrow peek, square shapes
            // (heart, circle) get a square peek, wide states
            // (Wyoming ~1.43) get a wide peek. `max-width: 100%`
            // in the class above caps it at cardbg width so a
            // very wide shape on a narrow card still fits.
            aspectRatio: `${shapeAspect} / 1`,
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
          <GridLayout pins={visiblePins} listingFrame={listingFrame} palette={palette} font={font} onSelectPin={onSelectPin} />
        ) : (
          <ScrollerLayout pins={visiblePins} listingFrame={listingFrame} palette={palette} font={font} onSelectPin={onSelectPin} />
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
  palette,
  font,
  onSelectPin,
}: {
  pins: Pin[]
  listingFrame: FrameStyle
  palette: Palette
  font: FontPairing
  onSelectPin: (pin: Pin) => void
}) {
  const total = pins.length

  if (total === 1) {
    return (
      // Single-pin layout: centered, capped at ~one masonry column's
      // width so a tall (9:16 reel) thumbnail doesn't balloon to the
      // full container height. Matches the visual weight of a card
      // sitting in a 4-column grid.
      <div className="flex justify-center">
        <div className="w-full max-w-[240px]">
          <ListingCardZillow pin={pins[0]} frame={listingFrame} palette={palette} font={font} onClick={() => onSelectPin(pins[0])} />
        </div>
      </div>
    )
  }

  if (total === 2) {
    // Two cards fill the row at 50% each — mirrors GridLayout's
    // 2-pin case so card sizing stays consistent between layouts
    // (the only difference between grid and scroller should be how
    // the rest of the cards flow, not how the first two render).
    const wantsShadow = listingFrame === 'shadow' || listingFrame === 'border_shadow'
    const gap = wantsShadow ? 16 : 12
    return (
      <div className="grid grid-cols-2 items-start" style={{ gap: `${gap}px` }}>
        {pins.map((pin) => (
          <ListingCardZillow key={pin.id} pin={pin} frame={listingFrame} palette={palette} font={font} onClick={() => onSelectPin(pin)} />
        ))}
      </div>
    )
  }

  // 3+ cards — horizontal scroller. Visible card count tracks the
  // grid layout's breakpoint (2 mobile / 3 sm / 4 lg) so a card in
  // the scroller renders at the same size as a card in the grid —
  // the only thing that differs between the two layouts is how the
  // overflow is handled (scroller runs the row + scrolls, grid
  // wraps into a masonry).
  //
  // Padding-inline on the scroll wrapper (NOT spacer divs, NOT parent
  // padding) gives the cardbg-edge buffer. Scroll-wrapper padding
  // stays put while content scrolls — so the buffer is always
  // visible on both sides regardless of scroll position.
  //
  // `-mx-5 md:-mx-7` extends the scroller's BOX to the cardbg's
  // outer edges (cancelling the parent's `px-5 md:px-7` padding so
  // the scroller can place its own buffer instead).
  //
  // `overflow-x: auto` forces `overflow-y: auto` per spec, which would
  // clip the card's outline (+3px) and offset shadow (+6px / +6px).
  // Vertical padding (with matching negative margin) lets the frame
  // chrome fully render without being chopped.
  //
  // Shadow frames offset 6px right — bump the inter-card gap so card
  // N's shadow doesn't kiss card N+1's left edge.
  const visibleCount = useMasonryColCount(pins.length)
  const wantsShadow = listingFrame === 'shadow' || listingFrame === 'border_shadow'
  const gap = wantsShadow ? 16 : 8
  const leadPad = 20
  const trailPad = 20
  return (
    <div
      className="overflow-x-auto -mx-5 md:-mx-7 -my-2 py-2"
      style={{
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        // padding-LEFT on the scroll wrapper is honored — it stays
        // put on the left side regardless of scroll position. We
        // can't use padding-right symmetrically because Webkit/Blink
        // has a long-standing bug where horizontal scroll containers
        // "eat" trailing padding, so the right buffer comes from a
        // flex-child spacer at the end of the list instead.
        paddingLeft: `${leadPad}px`,
        // Prevent horizontal overscroll bounce so the trailing
        // spacer doesn't slide off-screen past max-scroll.
        overscrollBehaviorX: 'contain',
      }}
    >
      <style>{`.listings-scroller::-webkit-scrollbar { display: none }`}</style>
      {/* items-start lets each card keep its native thumbnail height
          (instead of flex's default stretch-to-tallest), so the
          scroller reads like the masonry grid — different-height
          rectangles in a row instead of one uniform strip.
          w-full pins the flex container to the scroll wrapper's
          content-area width so child percentages resolve against it
          (instead of the flex container's overflowed max-content). */}
      <div className="listings-scroller flex items-start w-full" style={{ gap: `${gap}px` }}>
        {pins.map((pin) => (
          <div
            key={pin.id}
            className="shrink-0"
            // `visibleCount` cards + (visibleCount - 1) inter-card
            // gaps + 1 gap before the trailing spacer + trailing
            // spacer = 100% of the scroller's content area. So
            // exactly `visibleCount` cards are visible when the
            // scroller starts at scrollLeft = 0; the rest are
            // pushed off-screen to the right and reveal on scroll.
            style={{ width: `calc((100% - ${gap}px * ${visibleCount} - ${trailPad}px) / ${visibleCount})` }}
          >
            <ListingCardZillow pin={pin} frame={listingFrame} palette={palette} font={font} onClick={() => onSelectPin(pin)} />
          </div>
        ))}
        <div className="shrink-0" style={{ width: `${trailPad}px`, minWidth: `${trailPad}px` }} aria-hidden="true" />
      </div>
    </div>
  )
}

/* ─────────────── Grid layout (masonry / Pinterest) ───────────────
   Each card's thumbnail keeps its native aspect ratio (9:16 reels,
   4:3 listing photos, 1:1 type-icon fallbacks). Column width is
   uniform, height varies — cards in column 1 flow vertically
   independent of column 2/3, so the section reads as a collage of
   different-height rectangles rather than a strict row grid.
   Implementation uses CSS multi-column (column-count + break-inside:
   avoid) — zero JS, no virtualization, works in every browser. */
function GridLayout({
  pins,
  listingFrame,
  palette,
  font,
  onSelectPin,
}: {
  pins: Pin[]
  listingFrame: FrameStyle
  palette: Palette
  font: FontPairing
  onSelectPin: (pin: Pin) => void
}) {
  const total = pins.length

  if (total === 1) {
    return (
      // Single-pin layout: centered, capped at ~one masonry column's
      // width so a tall (9:16 reel) thumbnail doesn't balloon to the
      // full container height. Matches the visual weight of a card
      // sitting in a 4-column grid.
      <div className="flex justify-center">
        <div className="w-full max-w-[240px]">
          <ListingCardZillow pin={pins[0]} frame={listingFrame} palette={palette} font={font} onClick={() => onSelectPin(pins[0])} />
        </div>
      </div>
    )
  }

  // Shadow frames offset 6px right + down — bump the gap so a card's
  // shadow doesn't kiss its column / row neighbors.
  const wantsShadow = listingFrame === 'shadow' || listingFrame === 'border_shadow'
  const gap = wantsShadow ? 16 : 12

  // JS-driven flex columns (instead of CSS multi-column). The
  // multi-column approach kept rendering "ghost" outlines/shadows
  // from adjacent columns onto the top of cards (a Webkit/Blink
  // quirk around `break-inside-avoid` + `outline` + box-shadow),
  // and on mobile occasionally clipped card bottoms when the column
  // height balancing landed mid-shadow. Splitting into N separate
  // flex columns sidesteps the multi-column engine entirely —
  // each card lives in a simple vertical stack, no fragmentation.
  const colCount = useMasonryColCount(total)
  const columns = useMemo(() => {
    const cols: Pin[][] = Array.from({ length: colCount }, () => [])
    const heights = Array.from({ length: colCount }, () => 0)
    pins.forEach((pin) => {
      const { aspect } = resolveThumb(pin)
      const [aw, ah] = aspect.split('/').map((s) => parseFloat(s.trim()))
      // Card height per unit width = thumb (h/w) + ~0.35 for the
      // text body below. Place each pin into the currently-shortest
      // column so totals stay balanced (mirrors what CSS column-fill:
      // balance was doing).
      const cardHeight = ah / aw + 0.35
      let target = 0
      for (let i = 1; i < colCount; i++) {
        if (heights[i] < heights[target]) target = i
      }
      cols[target].push(pin)
      heights[target] += cardHeight
    })
    return cols
  }, [pins, colCount])

  return (
    <div className="flex items-start" style={{ gap: `${gap}px` }}>
      {columns.map((col, i) => (
        <div key={i} className="flex-1 min-w-0 flex flex-col" style={{ gap: `${gap}px` }}>
          {col.map((pin) => (
            <ListingCardZillow
              key={pin.id}
              pin={pin}
              frame={listingFrame}
              palette={palette}
              font={font}
              onClick={() => onSelectPin(pin)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Tracks viewport width and picks a masonry column count that
 *  mirrors the old Tailwind breakpoints (2 / sm:3 / lg:4). Caps
 *  at `total` so a 3-pin set never renders a stray empty column. */
function useMasonryColCount(total: number): number {
  const [colCount, setColCount] = useState<number>(() => {
    if (typeof window === 'undefined') return Math.min(2, total)
    return computeMasonryColCount(window.innerWidth, total)
  })
  useEffect(() => {
    const onResize = () => setColCount(computeMasonryColCount(window.innerWidth, total))
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [total])
  return colCount
}

function computeMasonryColCount(viewportWidth: number, total: number): number {
  let target = 2
  if (viewportWidth >= 1024) target = 4
  else if (viewportWidth >= 640) target = 3
  return Math.max(1, Math.min(target, total))
}

/* ─────────────── Listing card (Zillow style) ───────────────
   Thumbnail on top at its native aspect ratio, text content stacked
   below. Card width matches column width; height varies with the
   thumbnail's aspect + the fixed text rows below. Single card design
   reused by both grid (masonry) and scroller (uniform-width) layouts. */

function ListingCardZillow({
  pin,
  frame = 'none',
  forceAspect,
  palette,
  font,
  onClick,
}: {
  pin: Pin
  frame?: FrameStyle
  /** When set, override the thumbnail's native aspect ratio. Used by
   *  the horizontal scroller layout to force uniform card heights so
   *  the carousel reads as a clean strip; the masonry grid leaves
   *  this undefined so each thumbnail keeps its native ratio. */
  forceAspect?: string
  palette: Palette
  font: FontPairing
  onClick: () => void
}) {
  const wantsBorder = frame === 'border' || frame === 'border_shadow'
  const wantsShadow = frame === 'shadow' || frame === 'border_shadow'

  const { src: thumbSrc, aspect: nativeAspect } = resolveThumb(pin)
  const thumbAspect = forceAspect || nativeAspect

  const isSold = pin.type === 'sold'
  const isSpotlight = pin.type === 'spotlight'
  const fp = !isSpotlight ? (pin as ForSalePin | SoldPin) : null
  const sp = isSpotlight ? (pin as SpotlightPin) : null
  const price = fp ? ('price' in fp ? fp.price : (fp as SoldPin).soldPrice) : null
  const beds = fp && 'beds' in fp ? (fp as ForSalePin | SoldPin).beds : null
  const baths = fp && 'baths' in fp ? (fp as ForSalePin | SoldPin).baths : null
  const sqft = fp && 'sqft' in fp ? (fp as ForSalePin | SoldPin).sqft : null

  const openHouse: OpenHouse | null | undefined =
    pin.type === 'for_sale' && 'openHouse' in pin ? (pin as ForSalePin).openHouse : null
  const hasOpenHouse = nextSession(openHouse) !== null

  // Top-right glyphs — open-house badge + content-type indicator.
  const firstContent = pin.content?.[0]
  const contentType = firstContent?.type
  const hasMultiplePhotos = (firstContent?.mediaUrls?.length ?? 0) > 1
  const hasReel = contentType === 'reel'

  // Top-left status pill copy + color.
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

  // Trailing context label in the detail row (Zillow's
  // "House for sale"). Spotlight cards skip this since they use
  // a different body layout entirely.
  const contextLabel = isSold ? 'Sold home' : 'House for sale'

  // Body styling — bg is a tinted gradient of palette.accent (soft
  // brand pop, doesn't overwhelm at large surface area). Ink is
  // always near-black since the tinted bg is always on the light
  // end of the spectrum (22% accent over 78% white).
  const bodyBg = cardBodyBackground(palette.accent)
  const bodyInk = '#0A0E17'
  const bodyMuted = 'rgba(10,14,23,0.62)'
  const bodySubtle = 'rgba(10,14,23,0.36)'

  return (
    <button
      onClick={onClick}
      className="group relative block w-full overflow-hidden text-left cursor-pointer rounded-[14px]"
      style={{
        outline: wantsBorder ? '3px solid var(--accent, #D94A1F)' : undefined,
        outlineOffset: wantsBorder ? '0' : undefined,
        boxShadow: wantsShadow
          ? '6px 6px 0 0 var(--accent, #D94A1F)'
          : '0 1px 2px rgba(10,14,23,0.06), 0 6px 18px -10px rgba(10,14,23,0.18)',
        border: wantsBorder ? undefined : '1px solid rgba(10,14,23,0.06)',
      }}
    >
      {/* Thumbnail — full card width, native aspect. */}
      <div className="relative w-full" style={{ aspectRatio: thumbAspect }}>
        {thumbSrc ? (
          <ProgressiveImage
            src={thumbSrc}
            alt={pin.address}
            className="absolute inset-0 w-full h-full"
            fit="cover"
            fallback={<TypeIconFallback isSold={isSold} isSpotlight={isSpotlight} />}
          />
        ) : (
          <TypeIconFallback isSold={isSold} isSpotlight={isSpotlight} />
        )}

        {/* Top-left: status pill (For Sale / Sold / Spotlight / Open House) */}
        <div className="absolute top-2 left-2">
          <span
            className="inline-flex items-center px-2 py-1 rounded-[8px] bg-warm-white/95"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: statusColor,
            }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Top-right: open-house badge + content-type icon. */}
        {(hasOpenHouse || hasMultiplePhotos || hasReel) && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            {hasOpenHouse && <OpenHouseBadge size={22} />}
            {(hasMultiplePhotos || hasReel) && (
              <div
                className="text-white"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.65))' }}
              >
                {hasReel
                  ? <Play weight="fill" size={16} />
                  : <CarouselGlyph size={16} />}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body — text content below the thumbnail. Bg + font follow
          the agent's palette + chosen font; ink is computed for
          contrast against cardBg (always black or white, intentionally
          ignoring the agent's customFontColor here so the body stays
          maximally legible). Spotlight pins use a name + description
          layout; for_sale/sold use Zillow's price → bds | ba | sqft
          → type → address stack. */}
      <div
        className="px-3 pt-2.5 pb-3"
        style={{
          background: bodyBg,
          color: bodyInk,
          fontFamily: font.body,
        }}
      >
        {isSpotlight ? (
          <>
            <p
              className="truncate"
              style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.018em', lineHeight: 1.2 }}
            >
              {sp?.name || displayAddressWithUnit(pin.address, pin.unit).split(',')[0]}
            </p>
            {sp?.description && (
              <p
                className="mt-1"
                style={{
                  color: bodyMuted,
                  fontSize: '12.5px',
                  fontWeight: 400,
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {sp.description}
              </p>
            )}
          </>
        ) : (
          <>
            {price != null && (
              <p
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '-0.012em',
                  lineHeight: 1.1,
                }}
              >
                {formatPrice(price)}
              </p>
            )}
            <p
              className="mt-1 truncate"
              style={{ color: bodyMuted, fontSize: '12.5px', fontWeight: 400, lineHeight: 1.4 }}
            >
              {beds != null && <><strong style={{ fontWeight: 600, color: bodyInk }}>{beds}</strong> bds </>}
              {beds != null && baths != null && <span style={{ color: bodySubtle }}> | </span>}
              {baths != null && <><strong style={{ fontWeight: 600, color: bodyInk }}>{baths}</strong> ba </>}
              {baths != null && sqft != null && <span style={{ color: bodySubtle }}> | </span>}
              {sqft != null && <><strong style={{ fontWeight: 600, color: bodyInk }}>{sqft.toLocaleString()}</strong> sqft </>}
              {(beds != null || baths != null || sqft != null) && <span style={{ color: bodySubtle }}> | </span>}
              <span>{contextLabel}</span>
            </p>
            <p
              className="mt-1 truncate"
              style={{ color: bodyMuted, fontSize: '12.5px', fontWeight: 500 }}
            >
              {displayAddressWithUnit(pin.address, pin.unit)}
            </p>
          </>
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

/**
 * Type-icon fallback for ProgressiveImage when a hero photo fails to
 * load. Shows the same gradient block + pin-type icon we use for pins
 * that never had a photo, so offline / 404 / broken-Storage cards
 * stay on-brand instead of rendering the browser's broken-image glyph.
 */
function TypeIconFallback({ isSold, isSpotlight }: { isSold: boolean; isSpotlight: boolean }) {
  const Icon = isSold ? Key : isSpotlight ? Compass : Home
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
