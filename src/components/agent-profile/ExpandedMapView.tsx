import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Heart, Check, ShareNetwork as Share2, Crosshair as Locate } from '@phosphor-icons/react'
import { MapCanvas, type MapCanvasHandle } from '@/components/map/MapCanvas'
import { Avatar } from '@/components/ui/Avatar'
import { FilterBar } from '@/components/ui/FilterPill'
import { FilterDropdown } from '@/components/ui/FilterDropdown'
import { useMapStore, applyPropertyFilters } from '@/stores/mapStore'
import type { Pin, UserDoc, PinType } from '@/lib/types'
import { CyclingCountBadge } from './CyclingCountBadge'
import { getShape } from '@/lib/style'
import { ShareModal } from './ShareModal'
import { profileUrl } from '@/lib/shareUrl'

/* ════════════════════════════════════════════════════════════════
   EXPANDED MAP VIEW — Rendered at the AgentProfile card scope so
   it covers the header + tab switcher entirely. Mobile: viewport-
   fixed. Desktop: card-bound (absolute inset-0 inside the
   .agent-profile-card relative container).
   ──────────────────────────────────────────────────────────────── */

interface ExpandedMapViewProps {
  open: boolean
  /** True for the duration of the close animation. Driven by the
   *  parent in the same render batch as `open: true -> false` so
   *  the shell's `is-expanded` className stays applied through the
   *  whole tween — without it, the position would briefly swap
   *  back to absolute mid-animation and the clip-path's numbers
   *  would land in the wrong coord system. */
  closing?: boolean
  /** Bounding rect of the peek captured at expand time. Used as a
   *  fallback if peekEl isn't available. */
  originRect?: DOMRect | null
  /** Live DOM ref to the peek slot. The collapsed clip-path is
   *  pinned to this element's bbox each animation frame. */
  peekEl?: HTMLElement | null
  /** When false, the always-mounted map is hidden — used to keep
   *  the map clipped out while the user is on a tab other than
   *  listings (the peek slot only exists on listings). */
  visible?: boolean
  onClose: () => void
  /** Tap-to-expand handler. Called when the user taps inside the
   *  visible (clip-path-shaped) map area while collapsed. Lets the
   *  shape itself become the click target instead of the rectangular
   *  peek bbox in ListingsTab — clicks on empty space around the
   *  heart/circle/etc no longer trigger expand. */
  onRequestOpen?: (rect: DOMRect | null) => void
  pins: Pin[]
  agent: UserDoc
  agentPhotoUrl?: string | null
  defaultCenter?: [number, number]
  saved: boolean
  onSaveClick: () => void
  onSelectPin: (pin: Pin) => void
  /** Map viewport shape id from the agent's Style tab. Defaults to
   *  the heart (the original signature shape). */
  shapeId?: string
  /** Frame treatment for the map. Applied to the shape itself (not
   *  the rectangular peek bbox) — border = SVG path stroke that
   *  follows the curve; shadow = soft halo via drop-shadow. */
  frame?: 'none' | 'border' | 'shadow' | 'border_shadow'
}

const PIN_TYPE_OPTIONS: { value: PinType; label: string }[] = [
  { value: 'for_sale', label: 'For Sale' },
  { value: 'sold', label: 'Sold' },
  { value: 'spotlight', label: 'Spotlight' },
]

export function ExpandedMapView({
  open,
  closing = false,
  originRect,
  peekEl,
  visible = true,
  onClose,
  onRequestOpen,
  pins,
  agent,
  agentPhotoUrl,
  defaultCenter,
  saved,
  onSaveClick,
  onSelectPin,
  shapeId,
  frame = 'none',
}: ExpandedMapViewProps) {
  const shapeRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const prevOpenRef = useRef<boolean | null>(null)
  const lastClipRef = useRef<string>('')
  // Stroke overlay path — kept in sync with the clipPath updates so
  // the border tracks the shape exactly through morph + scroll.
  const borderPathRef = useRef<SVGPathElement>(null)
  const hasBorder = frame === 'border' || frame === 'border_shadow'
  const hasShadow = frame === 'shadow' || frame === 'border_shadow'

  // Resolve the agent's chosen shape (heart by default). The
  // generator returns a path() string with consistent command
  // structure across calls, so peek↔expanded morphs smoothly within
  // the same shape. Switching shapes (e.g., heart→pebble) snaps —
  // morphing across different command structures isn't reliable.
  // peek/expand scales are per-shape so e.g. circle (fills its bbox)
  // doesn't overflow the peek slot the way heart (sparse bbox) needs to.
  const shapeDef = useMemo(() => getShape(shapeId), [shapeId])
  const shapePath = shapeDef.path
  const peekScale = shapeDef.peekScale
  const expandScale = shapeDef.expandScale
  const expandAnchorOffset = shapeDef.expandAnchorOffset
  // Width/height ratio of the silhouette inside its unit-square
  // bbox (1 for geometric shapes, varies for states). Used to
  // size the shape against the peek's actual dimensions instead
  // of just `min(w, h)` — without this, narrow states (NJ ~0.43)
  // collapse into a tiny silhouette whenever the peek itself is
  // narrowed to match the shape aspect.
  const shapeAspect = shapeDef.aspect

  // Fraction of the shape's bbox that's actually visible (used to
  // size the inscribed pin-fit rectangle). Heart fills less than its
  // bbox because of the cleft + bottom point; rectangle fills its
  // bbox almost entirely.
  const SHAPE_INSCRIBED: Record<string, number> = {
    rectangle: 0.95,
    squircle:  0.78,
    circle:    0.70,
    hex:       0.70,
    heart:     0.55,
    house:     0.70,
  }

  // Compute fitBounds padding so pins land INSIDE the visible shape
  // at the peek slot's location — not the rectangular WebGL canvas
  // (which lives behind the whole agent-profile-card and is much
  // taller than the peek). This is the fix for "pins not visible
  // through the heart": canvas-relative padding has to account for
  // the peek's vertical offset within the card.
  const computePeekFitPadding = useCallback(() => {
    const shape = shapeRef.current
    const peek = peekEl?.getBoundingClientRect() ?? originRect ?? null
    if (!shape || !peek) return undefined
    const shapeBox = shape.getBoundingClientRect()
    if (shapeBox.width <= 0 || shapeBox.height <= 0) return undefined
    const peekCenterX = peek.left - shapeBox.left + peek.width / 2
    const peekCenterY = peek.top - shapeBox.top + peek.height / 2
    // Shape size fits the silhouette to the peek's actual aspect.
    // Silhouette dims = (size * shapeAspect) wide × (size * 1) tall,
    // so we cap size by whichever dimension binds first.
    const shapeSize = Math.min(peek.width / shapeAspect, peek.height) * peekScale
    const inscribed = SHAPE_INSCRIBED[shapeId || 'rectangle'] ?? 0.7
    // Inscribed rect tracks the silhouette's aspect — for narrow
    // states the rect is tall+narrow, not square. Pins fit inside
    // the actual silhouette, not a square that would spill into
    // the empty corners of the bbox.
    const inscribedW = shapeSize * shapeAspect * inscribed
    const inscribedH = shapeSize * inscribed
    return {
      top: Math.max(40, peekCenterY - inscribedH / 2),
      bottom: Math.max(40, shapeBox.height - (peekCenterY + inscribedH / 2)),
      left: Math.max(20, peekCenterX - inscribedW / 2),
      right: Math.max(20, shapeBox.width - (peekCenterX + inscribedW / 2)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeId, peekScale, shapeAspect, peekEl, originRect])
  const buildClip = (cx: number, cy: number, size: number): string => shapePath(cx, cy, size)

  // When the viewport flips breakpoints (desktop ↔ mobile, rotation,
  // zoom), the peek slot lands at a totally different location on
  // the canvas. Without a refit the map's center+zoom stays put and
  // the pins fall outside the heart's new position. Watch the shape
  // ref's bbox + a window resize listener; on either, re-run
  // fitToPins with a freshly-computed peek-inscribed padding so the
  // pins always end up back inside the visible mask.
  useLayoutEffect(() => {
    if (open || closing) return
    const el = shapeRef.current
    if (!el) return
    let prevW = el.clientWidth
    let prevH = el.clientHeight
    const refit = () => {
      const padding = computePeekFitPadding()
      if (padding) mapRef.current?.fitToPins(padding)
    }
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      // Only refit on real layout changes, not subpixel jitter.
      if (Math.abs(w - prevW) > 8 || Math.abs(h - prevH) > 8) {
        prevW = w
        prevH = h
        refit()
      }
    })
    ro.observe(el)
    window.addEventListener('orientationchange', refit)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', refit)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closing, computePeekFitPadding])

  // Mirror the path's `d` to the SVG border overlay AND apply the
  // same clip-path to the shadow duplicate so the offset replica
  // hugs the shape's silhouette. Called in lockstep with every
  // clipPath assignment below.
  const syncBorder = (clipString: string) => {
    if (borderPathRef.current) {
      const m = clipString.match(/path\('([^']+)'\)/)
      if (m) borderPathRef.current.setAttribute('d', m[1])
    }
    if (shadowRef.current) {
      shadowRef.current.style.clipPath = clipString
    }
  }

  // When the shadow div first mounts (e.g., user just turned on the
  // shadow frame), seed it with the current clipPath so it doesn't
  // render as a full unclipped rectangle for one frame.
  useLayoutEffect(() => {
    if (!shadowRef.current) return
    if (lastClipRef.current) shadowRef.current.style.clipPath = lastClipRef.current
  }, [hasShadow, open, closing])

  // Same for the border SVG path. Toggling border off → on remounts
  // the SVG; without this seed the path's `d` attribute would stay
  // empty until the next clipPath assignment (often on next scroll).
  useLayoutEffect(() => {
    if (!borderPathRef.current) return
    if (lastClipRef.current) {
      const m = lastClipRef.current.match(/path\('([^']+)'\)/)
      if (m) borderPathRef.current.setAttribute('d', m[1])
    }
  }, [hasBorder, open, closing])

  const computePeekClip = (): string | null => {
    const el = shapeRef.current
    if (!el) return null
    const shape = el.getBoundingClientRect()
    if (shape.width <= 0 || shape.height <= 0) return null
    const peek = peekEl?.getBoundingClientRect() ?? originRect ?? null
    if (!peek) return null
    const top = peek.top - shape.top
    const left = peek.left - shape.left
    const w = peek.width
    const h = peek.height
    // Aspect-aware shape sizing — silhouette dims = (size * shapeAspect)
    // wide × size tall. Cap by whichever peek dimension binds first so
    // the silhouette fills the peek tightly without overflowing. For
    // narrow states (NJ ~0.43) in a narrow peek, this picks
    // size = peek.height (height binds), keeping the silhouette as
    // tall as the peek instead of collapsing to peek.width
    // (which would shrink it to a tiny sliver). For square shapes
    // (aspect 1) the formula reduces to min(w, h) — same behavior
    // as before. Each shape's peekScale modulates the fit: heart
    // > 1 (sparse bbox needs to scale up), circle/squircle/blobs ≤ 1.
    const size = Math.min(w / shapeAspect, h) * peekScale
    const cx = left + w / 2
    const cy = top + h / 2
    return buildClip(cx, cy, size)
  }

  // Expanded "fullscreen" clip — same heart path, but scaled so big
  // that all curves are well outside the shape's visible area. The
  // user sees the whole map (the heart's interior covers everything),
  // but the path tween from small heart to giant heart morphs
  // smoothly because both have identical vertex structure.
  const computeFullClip = (): string | null => {
    const el = shapeRef.current
    if (!el) return null
    const shape = el.getBoundingClientRect()
    if (shape.width <= 0 || shape.height <= 0) return null
    // expandScale × max(w, h) guarantees every curve lives well
    // outside the visible area, so the visible region is just the
    // shape's full bounds. Tuned per-shape: heart needs 3.0+ to
    // clear the cleft past the rounded card corners; geometric
    // shapes that fill their bbox can use 2.6.
    const size = Math.max(shape.width, shape.height) * expandScale
    let cx = shape.width / 2
    let cy = shape.height / 2
    // State shapes shift (cx, cy) so the polygon's pole of
    // inaccessibility — not the bbox midpoint — lands at the
    // container center. Bbox-centered fails for asymmetric states
    // (Florida's bbox center is in the Gulf of Mexico). Geometric
    // shapes have no offset and skip this. See `expandAnchorOffset`
    // on MapShape for the math.
    if (expandAnchorOffset) {
      cx += expandAnchorOffset.x * size
      cy += expandAnchorOffset.y * size
    }
    return buildClip(cx, cy, size)
  }

  // rAF tracker — runs while collapsed (and not animating closed).
  // Reads peek + shape bboxes every animation frame and writes the
  // clip-path directly to the DOM. This pins the collapsed clip to
  // the peek slot through scroll, resize, and orientation changes.
  // (Resize/rotation work because each frame re-measures fresh.)
  useLayoutEffect(() => {
    const el = shapeRef.current
    if (!el) return
    if (open || closing) return
    let rafId = 0
    const tick = () => {
      const next = computePeekClip()
      if (next && next !== lastClipRef.current) {
        el.style.transition = 'none'
        el.style.clipPath = next
        syncBorder(next)
        lastClipRef.current = next
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (shapeRef.current) shapeRef.current.style.transition = ''
          })
        })
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    // Force-recompute on resize / orientation change — these can
    // trigger sub-pixel layout shifts that the rAF picks up the
    // very next frame anyway, but the explicit listener guarantees
    // the clip is correct at the exact moment the layout settles.
    const onLayoutChange = () => {
      lastClipRef.current = '' // invalidate cache so next tick applies
    }
    window.addEventListener('resize', onLayoutChange)
    window.addEventListener('orientationchange', onLayoutChange)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onLayoutChange)
      window.removeEventListener('orientationchange', onLayoutChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closing, peekEl, originRect, visible, shapePath])

  // Open / close transition. The shell's position (absolute vs
  // fixed) is class-driven; the parent batches `closing: true` with
  // `open: false` so the className stays `is-expanded` for the full
  // close animation. That keeps the shape's bbox stable so the
  // clip-path tween runs smoothly in the same coord system the open
  // animation used.
  useLayoutEffect(() => {
    const el = shapeRef.current
    if (!el) return
    if (prevOpenRef.current === null) {
      prevOpenRef.current = open
      return
    }
    if (prevOpenRef.current === open) return
    const fullClip = computeFullClip()
    if (open) {
      // Class has just become `is-expanded` (position: fixed). Snap
      // to the peek heart in the new (viewport-anchored) coord
      // system, force a reflow, then tween to the giant heart.
      // Same path structure on both ends = smooth shape morph
      // instead of a snap.
      const startClip = computePeekClip()
      if (startClip) {
        el.style.transition = 'none'
        el.style.clipPath = startClip
        syncBorder(startClip)
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        el.offsetHeight
      }
      el.style.transition = ''
      if (fullClip) {
        el.style.clipPath = fullClip
        syncBorder(fullClip)
        lastClipRef.current = fullClip
      }
      // No refit on expand — the canvas size is stable across
      // peek/expanded states (CSS pins both to 100dvh), so the map
      // just unmasks to reveal the same view at a larger visible
      // area. This matches the mobile behavior the user was happy
      // with: clip-path morph only, no zoom change.
    } else {
      // Reverse direction — giant heart morphs back down to the
      // peek-sized heart, anchored on the live peek bbox.
      const target = computePeekClip() ?? fullClip ?? ''
      el.style.transition = ''
      el.style.clipPath = target
      syncBorder(target)
      lastClipRef.current = target
    }
    prevOpenRef.current = open
  }, [open, peekEl, originRect])

  // Re-seed the clipPath the instant the class flips back to
  // collapsed (position changes from fixed to absolute). Without
  // this, the rAF would apply the new clip on its next tick — one
  // frame after the position change, briefly showing a wrong-shape
  // map. Running synchronously after `closing` flips to false picks
  // up the same render commit as the className change.
  useLayoutEffect(() => {
    const el = shapeRef.current
    if (!el) return
    if (open || closing) return
    const next = computePeekClip()
    if (!next) return
    el.style.transition = 'none'
    el.style.clipPath = next
    syncBorder(next)
    lastClipRef.current = next
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (shapeRef.current) shapeRef.current.style.transition = ''
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closing])
  // Imperative ref so the fit-to-pins button can fly the existing map
  // instead of remounting it (which used to wipe pan/zoom state).
  const mapRef = useRef<MapCanvasHandle | null>(null)
  // Refs to the floating chrome elements. Measured at recenter-click
  // time so the fitBounds padding lands the pin bounding box EXACTLY
  // between the bottom edge of the filter row and the top edge of
  // the cycling count badge — pixel-accurate regardless of safe-area
  // inset, breakpoint, or pill content width.
  const filterRowRef = useRef<HTMLDivElement>(null)
  const bottomChromeRef = useRef<HTMLDivElement>(null)
  const handleFitToPins = () => {
    const shape = shapeRef.current
    if (!shape) return mapRef.current?.fitToPins()
    const shapeBox = shape.getBoundingClientRect()
    const filterBox = filterRowRef.current?.getBoundingClientRect() ?? null
    const bottomBox = bottomChromeRef.current?.getBoundingClientRect() ?? null
    // Chrome offsets relative to the shape (which is the map's
    // coord frame). Add a small breathing buffer so pins don't
    // graze the chrome's edge, and a pin-radius buffer so the pin
    // circles themselves (not just their lat/lng points) stay
    // inside the visible area.
    const breathe = 16
    const pinRadius = 36
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768
    const top = filterBox
      ? Math.max(40, filterBox.bottom - shapeBox.top + breathe + pinRadius)
      : (isDesktop ? 140 : 160)
    const bottom = bottomBox
      ? Math.max(40, shapeBox.bottom - bottomBox.top + breathe + pinRadius)
      : (isDesktop ? 100 : 90)
    const sides = isDesktop ? 48 : 24
    mapRef.current?.fitToPins({ top, bottom, left: sides, right: sides })
  }

  // Refit the map to the peek-shape padding when the user dismisses
  // the expanded view, so the collapsed peek lands back at the same
  // pin-framed-in-heart view it had on first load — even if the user
  // panned/zoomed deep into the city while expanded. Fires on the
  // open→false transition only (initial mount has open=false too,
  // but the prevOpenRef guard skips that case).
  const prevOpenForRefitRef = useRef<boolean | null>(null)
  useLayoutEffect(() => {
    if (prevOpenForRefitRef.current === null) {
      prevOpenForRefitRef.current = open
      return
    }
    if (prevOpenForRefitRef.current === true && open === false) {
      const padding = computePeekFitPadding()
      if (padding) mapRef.current?.fitToPins(padding)
    }
    prevOpenForRefitRef.current = open
  }, [open, computePeekFitPadding])

  // Map inits as soon as the agent profile mounts — visitors land on
  // the listings + map peek together, so deferring init only adds
  // perceived latency. The in-style shader trim (fill-extrusion /
  // hillshade / sky stripped after style.load) is what actually
  // protects the Metal cache from evicting other tabs' shaders.

  const [shareOpen, setShareOpen] = useState(false)
  const handleShare = () => setShareOpen(true)
  const firstName = agent.displayName?.split(' ')[0] || agent.username || 'this agent'

  const {
    activeFilters,
    toggleFilter,
    clearFilters,
    propertyFilters,
    togglePropertyFilter,
    clearPropertyFilter,
  } = useMapStore()

  const typeCounts = useMemo(() => {
    const out: Record<PinType, number> = { for_sale: 0, sold: 0, spotlight: 0 }
    for (const p of pins) out[p.type] = (out[p.type] || 0) + 1
    return out
  }, [pins])

  const filteredPins = useMemo(() => {
    let out = pins
    if (activeFilters.size > 0) {
      out = out.filter((p) => activeFilters.has(p.type))
    }
    out = applyPropertyFilters(out, propertyFilters)
    return out
  }, [pins, activeFilters, propertyFilters])

  const counts = useMemo(() => {
    let forSale = 0
    let sold = 0
    let openHouse = 0
    let spotlight = 0
    const now = Date.now()
    for (const p of filteredPins) {
      if (p.type === 'for_sale') {
        forSale++
        const sessions = (p as any).openHouse?.sessions as { date: string; endTime: string }[] | undefined
        if (sessions?.some((s) => {
          const [y, m, d] = s.date.split('-').map(Number)
          const [hh, mm] = s.endTime.split(':').map(Number)
          return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).getTime() > now
        })) openHouse++
      } else if (p.type === 'sold') sold++
      else if (p.type === 'spotlight') spotlight++
    }
    return { forSale, sold, openHouse, spotlight }
  }, [filteredPins])

  // Always-mounted shell. clipPath is the only thing that changes
  // (driven imperatively above). Map tiles stay loaded so opening
  // is instant. Chrome (filter bar, profile pill, X, count badge)
  // fades in only when expanded.
  return (
    <>
      {/* Solid offset shadow — a duplicate of the shape filled with
          the palette's primary text color, clipped to the same path,
          translated bottom-right. Sticker / neobrutalist look. Sibling
          (not child) of the shape so it ISN'T clipped by the shape's
          clip-path region — has its own clip-path applied via
          syncBorder. Hidden during the expand animation since there's
          nothing for the offset to read against in fullscreen. */}
      {hasShadow && !open && !closing && (
        <div
          ref={shadowRef}
          aria-hidden
          className="expanded-map-shape"
          style={{
            // Sticker shadow filled with the palette accent (the dot
            // color) so it matches the avatar / listings / corner-
            // action accents.
            background: 'var(--accent, #D94A1F)',
            pointerEvents: 'none',
            transform: 'translate(8px, 8px)',
            zIndex: 39, /* one below the shape (40) so it renders behind */
            // No clip-path transition here — the shadow snaps with
            // the shape's clip update. The shape's own transition
            // handles the morph; the shadow keeps lockstep.
            transition: 'none',
          }}
        />
      )}
        <motion.div
          ref={shapeRef}
          initial={false}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ duration: 0 }}
          className={`expanded-map-shape${(open || closing) ? ' is-expanded' : ''}`}
          style={{
            // The shape captures pointer events while visible — its
            // clip-path means clicks only register inside the heart /
            // circle / etc, not the empty corners of the bounding box.
            // While hidden (other tab) we let events pass through so
            // there's no invisible blocker.
            pointerEvents: visible ? 'auto' : 'none',
          }}
        >
          <MapCanvas
            ref={mapRef}
            pins={filteredPins}
            agentPhotoUrl={agentPhotoUrl}
            defaultCenter={defaultCenter}
            interactive
            fitToPins
            shapeId={shapeId}
            fitPadding={computePeekFitPadding()}
            onPinClick={onSelectPin}
            className="absolute inset-0"
          />

          {/* Border overlay — SVG path stroked along the same curve
              the clip-path uses. `non-scaling-stroke` keeps the line
              a uniform thickness regardless of the path's pixel size,
              so the heart's stroke reads identically in peek and
              expanded states. The d attribute is updated imperatively
              alongside clipPath assignments above (see syncBorder).
              Same open/closing gate as the offset shadow above —
              border only renders in the collapsed peek state. Hiding
              it during the expand AND collapse animations stops the
              stroke from briefly flashing on the wrong shape mid-tween
              (e.g. revealing the peek-sized border before the shape
              has finished morphing back from fullscreen). */}
          {hasBorder && !open && !closing && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width="100%"
              height="100%"
              aria-hidden
            >
              <path
                ref={borderPathRef}
                fill="none"
                stroke="var(--accent, #D94A1F)"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}

          {/* Tap-to-expand overlay — only mounted while collapsed and
              an `onRequestOpen` handler is provided. Sits above the
              MapCanvas so it absorbs drag/click attempts (the user
              shouldn't be able to pan the map in peek state). The
              parent shape's clip-path applies to this overlay too,
              so the click target is automatically the heart / circle
              / etc shape — not the rectangular bbox around it. */}
          {!open && !closing && onRequestOpen && (
            <button
              type="button"
              onClick={() => onRequestOpen(peekEl?.getBoundingClientRect() ?? null)}
              aria-label="Open fullscreen map"
              className="absolute inset-0 cursor-pointer"
              style={{ background: 'transparent', border: 0, padding: 0 }}
            />
          )}

          {/* Chrome — visible only when expanded. Outer wrapper has
              `pointer-events: none` so map drags pass through;
              individual chrome elements (X, filter bar, profile
              pill, count badge) re-enable on themselves. */}
          <motion.div
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
            style={{ pointerEvents: 'none' }}
          >
          {/* Header — profile pill + chip cluster (centered) and an
              always-visible X dismiss in the top-right corner. */}
          <div
            className="absolute left-0 right-12 z-[10] flex items-center justify-center gap-2 px-3 pointer-events-none"
            style={{
              top: 'max(env(safe-area-inset-top, 12px) + 8px, 16px)',
              fontFamily: 'var(--font-humanist)',
            }}
          >
            <div className="flex items-center gap-2 pointer-events-auto">
              <div
                className="bg-warm-white/96 backdrop-blur-md rounded-full flex items-center gap-3 pl-1.5 pr-5 py-1.5 border border-black/5"
                style={{ boxShadow: '0 6px 22px -6px rgba(10,14,23,0.32)' }}
              >
                <Avatar src={agentPhotoUrl ?? agent.photoURL} name={agent.displayName} size={40} ring="story" />
                <div className="min-w-0 text-left">
                  <p
                    className="text-ink whitespace-nowrap"
                    style={{ fontSize: '14.5px', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1 }}
                  >
                    {agent.displayName || agent.username || 'Agent'}
                  </p>
                  <p
                    className="text-smoke"
                    style={{ fontSize: '11.5px', fontWeight: 500, lineHeight: 1.2 }}
                  >
                    {pins.length} pin{pins.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={onSaveClick}
                aria-label={saved ? 'Subscribed' : 'Subscribe'}
                className="rounded-full w-9 h-9 flex items-center justify-center cursor-pointer border border-black/5"
                style={{
                  background: saved ? '#34C759' : 'rgba(255,255,255,0.96)',
                  color: saved ? '#fff' : '#1A1A1A',
                  boxShadow: '0 4px 16px rgba(10,14,23,0.18)',
                }}
              >
                {saved ? <Check weight="bold" size={15} /> : <Heart weight="bold" size={14} />}
              </button>
              <button
                onClick={handleShare}
                aria-label="Share"
                className="bg-warm-white/96 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center text-ink cursor-pointer border border-black/5"
                style={{ boxShadow: '0 4px 16px rgba(10,14,23,0.18)' }}
              >
                <Share2 size={14} />
              </button>
              <button
                onClick={handleFitToPins}
                aria-label="Fit map to pins"
                className="bg-warm-white/96 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center text-ink cursor-pointer border border-black/5"
                style={{ boxShadow: '0 4px 16px rgba(10,14,23,0.18)' }}
              >
                <Locate size={14} />
              </button>
            </div>
          </div>

          {/* Filter row — light pills (Pin Type · Price · Beds · Baths
              · Type · Sqft · Year · DOM). Centered under the profile
              pill cluster with breathing room. Two-layer setup:
              - Outer container: full-width, centers the FilterBar
                horizontally when content fits
              - FilterBar: w-max so it sizes to content, with max-w-full
                so on narrow viewports it shrinks and scrolls internally
              The FilterBar's own px-4 provides inset on both edges of
              the scrollable content so the first pill never slams
              against the left edge. */}
          <div
            ref={filterRowRef}
            className="absolute left-0 right-0 z-[10] flex justify-center pointer-events-none"
            style={{
              top: 'calc(max(env(safe-area-inset-top, 12px) + 8px, 16px) + 76px)',
            }}
          >
            <div
              className="pointer-events-auto w-max max-w-full"
              style={{ touchAction: 'pan-x' }}
            >
              <FilterBar>
                <FilterDropdown label="Pin Type"
                  options={PIN_TYPE_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} (${typeCounts[o.value] || 0})` }))}
                  selected={activeFilters} onToggle={(v) => toggleFilter(v as PinType)} onClear={clearFilters} />
                <FilterDropdown label="Price"
                  options={[{ value: '0-500k', label: 'Under $500K' }, { value: '500k-1m', label: '$500K–$1M' }, { value: '1m-2m', label: '$1M–$2M' }, { value: '2m-5m', label: '$2M–$5M' }, { value: '5m+', label: '$5M+' }]}
                  selected={propertyFilters.price} onToggle={(v) => togglePropertyFilter('price', v)} onClear={() => clearPropertyFilter('price')} />
                <FilterDropdown label="Beds"
                  options={[{ value: '1', label: '1+' }, { value: '2', label: '2+' }, { value: '3', label: '3+' }, { value: '4', label: '4+' }, { value: '5', label: '5+' }]}
                  selected={propertyFilters.beds} onToggle={(v) => togglePropertyFilter('beds', v)} onClear={() => clearPropertyFilter('beds')} />
                <FilterDropdown label="Baths"
                  options={[{ value: '1', label: '1+' }, { value: '2', label: '2+' }, { value: '3', label: '3+' }, { value: '4', label: '4+' }]}
                  selected={propertyFilters.baths} onToggle={(v) => togglePropertyFilter('baths', v)} onClear={() => clearPropertyFilter('baths')} />
                <FilterDropdown label="Sqft"
                  options={[{ value: '0-1000', label: 'Under 1,000' }, { value: '1000-1500', label: '1,000–1,500' }, { value: '1500-2000', label: '1,500–2,000' }, { value: '2000-3000', label: '2,000–3,000' }, { value: '3000+', label: '3,000+' }]}
                  selected={propertyFilters.sqft} onToggle={(v) => togglePropertyFilter('sqft', v)} onClear={() => clearPropertyFilter('sqft')} />
              </FilterBar>
            </div>
          </div>

          {/* X dismiss — bottom-right, aligned on the same horizontal
              line as the cycling count badge (which is centered). The
              shared `--map-bottom-inset` variable keeps both at the
              exact same `bottom` value across mobile / desktop. */}
          <button
            onClick={onClose}
            aria-label="Close map"
            className="absolute right-4 z-[12] w-12 h-12 rounded-full bg-warm-white/96 backdrop-blur-sm flex items-center justify-center text-ink cursor-pointer border border-black/5"
            style={{
              bottom: 'var(--map-bottom-inset)',
              boxShadow: '0 -4px 18px -6px rgba(10,14,23,0.18), 0 10px 28px -10px rgba(10,14,23,0.3)',
              pointerEvents: 'auto',
            }}
          >
            <X weight="bold" size={16} />
          </button>

          <div ref={bottomChromeRef} style={{ pointerEvents: 'auto' }}>
            <CyclingCountBadge
              forSale={counts.forSale}
              sold={counts.sold}
              openHouse={counts.openHouse}
              spotlight={counts.spotlight}
              onTap={onClose}
            />
          </div>
          </motion.div>
        </motion.div>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        url={profileUrl(agent.username)}
        title={`${agent.displayName || firstName} on Reelst`}
        message={`Check out ${firstName}'s map of listings on Reelst`}
      />
    </>
  )
}
