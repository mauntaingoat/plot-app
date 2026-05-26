/**
 * ListingsTab — the body of the public agent profile.
 *
 * Renders, in order:
 *   1. Map peek (shape placeholder ExpandedMapView reads imperatively)
 *   2. Optional aboveListingsSlot (Custom Links "above content" slot)
 *   3. PinHighlightStrip — horizontal scroll of all visible pins as
 *      stories-style avatar circles + price/sold/spotlight pills
 *
 * The old multi-layout card grid (scroller / grid / Zillow-style
 * cards) was retired in favor of the highlight strip — heterogeneous
 * card content (listings w/ photos, listings w/o, spotlights, etc.)
 * was making the surface feel chaotic. The strip standardizes the
 * visual treatment and matches the map pin vocabulary (ring color
 * by type, price/sold/name pill underneath).
 *
 * Tapping a pin in the strip routes through the same `onSelectPin`
 * callback the map pin tap uses — parent decides whether to open
 * ContentFeed (when pin has content) or ListingModal (when not).
 */
import { useEffect, useMemo, useRef } from 'react'
import { ArrowsOut as Maximize } from '@phosphor-icons/react'
import { PinHighlightStrip } from './PinHighlightStrip'
import type { Palette, FontPairing } from '@/lib/style'
import type { Pin, UserDoc } from '@/lib/types'

interface ListingsTabProps {
  pins: Pin[]
  agent: UserDoc | null
  agentPhotoUrl?: string | null
  defaultCenter?: [number, number] | null
  onSelectPin: (pin: Pin) => void
  onRequestExpandMap: (rect: DOMRect | null) => void
  mapExpanded: boolean
  onPeekElChange?: (el: HTMLElement | null) => void
  /** Whether to render the map peek section. */
  showMap?: boolean
  /** Aspect ratio of the map shape — width derives from height ×
   *  shapeAspect so narrow states fill the peek tightly. */
  shapeAspect?: number
  /** Slot rendered between the map peek and the highlight strip.
   *  Used by Custom Links for the "Above content" position. */
  aboveListingsSlot?: React.ReactNode
  /** Whether to render the highlight strip. When false, ListingsTab
   *  still renders the map peek + aboveListingsSlot (so agents who
   *  hide content can still show map + links). */
  showListings?: boolean
  /** Agent's resolved palette + font — handed to PinHighlightStrip. */
  palette: Palette
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
  showMap = true,
  aboveListingsSlot,
  showListings = true,
  palette,
  font,
  shapeAspect = 1,
}: ListingsTabProps) {
  // Visible pins on the public profile = enabled + non-archived.
  const visiblePins = useMemo(() => pins.filter((p) => p.enabled), [pins])
  const peekRef = useRef<HTMLDivElement>(null)

  // Hand the peek element up so AgentProfile's always-mounted
  // ExpandedMapView can imperatively track its bbox each frame.
  // `showMap` is in the deps so toggling the map section off then
  // on re-fires the handoff with the freshly-mounted button.
  useEffect(() => {
    if (showMap) onPeekElChange?.(peekRef.current)
    else onPeekElChange?.(null)
    return () => onPeekElChange?.(null)
  }, [showMap, onPeekElChange])

  return (
    <div className="px-5 md:px-7 pb-32" style={{ fontFamily: 'var(--font-humanist)' }}>
      {/* Render order: strip → map → links.
          - Strip sits at the top so every pin is above-the-fold.
          - Map sits in the middle as the spatial index.
          - Links sit immediately below the map so the agent's curated
            CTAs are the last thing before the footer. */}

      {showListings && visiblePins.length > 0 ? (
        <PinHighlightStrip
          pins={visiblePins}
          palette={palette}
          font={font}
          onSelectPin={onSelectPin}
        />
      ) : null}

      {/* Map peek — non-interactive layout placeholder. The shape
          itself (drawn by ExpandedMapView) is the clickable surface;
          this div just reserves the slot and feeds its bbox up. */}
      {showMap && <style>{`
        .listings-map-peek {
          height: 280px;
          margin-left: auto;
          margin-right: auto;
          max-width: 100%;
        }
      `}</style>}
      {showMap && <div
        ref={peekRef}
        className="listings-map-peek block rounded-[20px] relative"
        style={{
          aspectRatio: `${shapeAspect} / 1`,
          background: 'transparent',
          pointerEvents: 'none',
        }}
      >
        {/* "Open map" pill — separate clickable affordance since the
            transparent peek bbox doesn't take taps. */}
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

      {/* Custom Links slot — sits directly below the map peek.
          (Prop is named `aboveListingsSlot` for legacy reasons; the
          listings grid has been retired so it now means "below map".) */}
      {aboveListingsSlot ? <div className="mt-6">{aboveListingsSlot}</div> : null}
    </div>
  )
}
