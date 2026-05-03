/* ════════════════════════════════════════════════════════════════
   SHAPES — 6 map viewport shapes
   ────────────────────────────────────────────────────────────────
   Each generator returns a CSS `path('M ... Z')` clip-path string
   centered at (cx, cy) within a square bounding box of side `size`.
   Used at two scales by ExpandedMapView: a small peek-fitted call
   and a giant overflow-the-container call. Because both calls use
   the SAME function, the path command structure is identical and
   CSS interpolates the clip-path smoothly between them — yielding
   the signature shape morph on expand/dismiss.
   ──────────────────────────────────────────────────────────────── */

export type ShapePath = (cx: number, cy: number, size: number) => string

export interface MapShape {
  id: string
  name: string
  vibe: string
  path: ShapePath
  /** Multiplier applied to the peek slot's smaller dimension to size
   *  the shape. Heart needs >1 because the heart doesn't fill its
   *  bbox (cleft + bottom point leave whitespace). Shapes that fill
   *  their bbox more fully (circle, hex, squircle) use <1 so they
   *  don't overflow into the listings grid below. */
  peekScale: number
  /** Multiplier applied to max(container w, h) when expanded. Sized
   *  so the whole shape sits OUTSIDE the visible container — what
   *  you actually see is the shape's interior, which covers every
   *  pixel of the container. Values higher than 2.6 give more slack
   *  for shapes whose bbox isn't a perfect rectangle. */
  expandScale: number
}

/* ── Helpers ── */

function fmt(n: number) {
  return n.toFixed(2)
}

function withFrame(cx: number, cy: number, size: number, yBias = 0) {
  const x0 = cx - size / 2
  const y0 = cy - size / 2 + size * yBias
  return {
    X: (n: number) => fmt(x0 + n * size),
    Y: (n: number) => fmt(y0 + n * size),
  }
}

/** Build a path from a list of vertices, rounding each corner with
 *  a cubic-bezier arc. Used by hex + house so the polygons don't
 *  read as harshly geometric. cornerR is in the same units as the
 *  vertex coords (typically a fraction of `size`). */
function roundedPolygon(vertices: Array<[number, number]>, cornerR: number): string {
  const n = vertices.length
  const cmds: string[] = []
  for (let i = 0; i < n; i++) {
    const v = vertices[i]
    const prev = vertices[(i - 1 + n) % n]
    const next = vertices[(i + 1) % n]

    const upDx = v[0] - prev[0]
    const upDy = v[1] - prev[1]
    const upLen = Math.hypot(upDx, upDy) || 1
    const upR = Math.min(cornerR, upLen / 2)

    const dnDx = next[0] - v[0]
    const dnDy = next[1] - v[1]
    const dnLen = Math.hypot(dnDx, dnDy) || 1
    const dnR = Math.min(cornerR, dnLen / 2)

    const ax = v[0] - (upDx / upLen) * upR
    const ay = v[1] - (upDy / upLen) * upR
    const dx = v[0] + (dnDx / dnLen) * dnR
    const dy = v[1] + (dnDy / dnLen) * dnR

    if (i === 0) cmds.push(`M ${fmt(ax)} ${fmt(ay)}`)
    else cmds.push(`L ${fmt(ax)} ${fmt(ay)}`)
    cmds.push(`C ${fmt(v[0])} ${fmt(v[1])}, ${fmt(v[0])} ${fmt(v[1])}, ${fmt(dx)} ${fmt(dy)}`)
  }
  cmds.push('Z')
  return cmds.join(' ')
}

/* ── Rectangle (rounded, landscape) ──
   Soft-corner rectangle, slightly taller than wide-strict 5:3 —
   y ∈ [0.13, 0.87] gives a 0.74-tall body that reads as a generous
   landscape rectangle without dominating the bbox. Corner radius is
   a percent of the shape's short side so it scales with size and
   stays visually consistent across breakpoints. Drawn as four
   straight edges with quadratic-curve corners (Q control = corner). */
export const rectangle: ShapePath = (cx, cy, size) => {
  const { X, Y } = withFrame(cx, cy, size)
  // Bbox: x ∈ [0,1], y ∈ [0.13, 0.87]. Short side = 0.74 in normalized
  // units. Radius ≈ 11% of short side = 0.082.
  const top = 0.13
  const bot = 0.87
  const r = 0.082
  return [
    `path('M ${X(r)} ${Y(top)}`,
    `L ${X(1 - r)} ${Y(top)}`,
    `Q ${X(1)} ${Y(top)}, ${X(1)} ${Y(top + r)}`,
    `L ${X(1)} ${Y(bot - r)}`,
    `Q ${X(1)} ${Y(bot)}, ${X(1 - r)} ${Y(bot)}`,
    `L ${X(r)} ${Y(bot)}`,
    `Q ${X(0)} ${Y(bot)}, ${X(0)} ${Y(bot - r)}`,
    `L ${X(0)} ${Y(top + r)}`,
    `Q ${X(0)} ${Y(top)}, ${X(r)} ${Y(top)}`,
    `Z')`,
  ].join(' ')
}

/* ── Heart (signature) ── */
export const heart: ShapePath = (cx, cy, size) => {
  const { X, Y } = withFrame(cx, cy, size, 0)
  return [
    `path('M ${X(0.5)} ${Y(0.86)}`,
    `C ${X(0.5)} ${Y(0.86)}, ${X(0.07)} ${Y(0.6)}, ${X(0.07)} ${Y(0.3)}`,
    `C ${X(0.07)} ${Y(0.15)}, ${X(0.18)} ${Y(0.05)}, ${X(0.3)} ${Y(0.05)}`,
    `C ${X(0.4)} ${Y(0.05)}, ${X(0.47)} ${Y(0.11)}, ${X(0.5)} ${Y(0.18)}`,
    `C ${X(0.53)} ${Y(0.11)}, ${X(0.6)} ${Y(0.05)}, ${X(0.7)} ${Y(0.05)}`,
    `C ${X(0.82)} ${Y(0.05)}, ${X(0.93)} ${Y(0.15)}, ${X(0.93)} ${Y(0.3)}`,
    `C ${X(0.93)} ${Y(0.6)}, ${X(0.5)} ${Y(0.86)}, ${X(0.5)} ${Y(0.86)} Z')`,
  ].join(' ')
}

/* ── 2. Squircle (true superellipse — iOS app icon style) ──
   Four cubic curves with control points at 42% along each side from
   the side midpoint. Reads as a "soft square": flat-ish sides with
   pronounced corner softness. */
export const squircle: ShapePath = (cx, cy, size) => {
  const { X, Y } = withFrame(cx, cy, size)
  const k = 0.42
  return [
    `path('M ${X(0.5)} ${Y(0)}`,
    `C ${X(0.5 + k)} ${Y(0)}, ${X(1)} ${Y(0.5 - k)}, ${X(1)} ${Y(0.5)}`,
    `C ${X(1)} ${Y(0.5 + k)}, ${X(0.5 + k)} ${Y(1)}, ${X(0.5)} ${Y(1)}`,
    `C ${X(0.5 - k)} ${Y(1)}, ${X(0)} ${Y(0.5 + k)}, ${X(0)} ${Y(0.5)}`,
    `C ${X(0)} ${Y(0.5 - k)}, ${X(0.5 - k)} ${Y(0)}, ${X(0.5)} ${Y(0)} Z')`,
  ].join(' ')
}

/* ── 3. Circle ── */
export const circle: ShapePath = (cx, cy, size) => {
  const r = size / 2
  const c = r * 0.5523
  const cxs = fmt(cx), cys = fmt(cy)
  return [
    `path('M ${fmt(cx)} ${fmt(cy - r)}`,
    `C ${fmt(cx + c)} ${fmt(cy - r)}, ${fmt(cx + r)} ${fmt(cy - c)}, ${fmt(cx + r)} ${cys}`,
    `C ${fmt(cx + r)} ${fmt(cy + c)}, ${fmt(cx + c)} ${fmt(cy + r)}, ${cxs} ${fmt(cy + r)}`,
    `C ${fmt(cx - c)} ${fmt(cy + r)}, ${fmt(cx - r)} ${fmt(cy + c)}, ${fmt(cx - r)} ${cys}`,
    `C ${fmt(cx - r)} ${fmt(cy - c)}, ${fmt(cx - c)} ${fmt(cy - r)}, ${cxs} ${fmt(cy - r)} Z')`,
  ].join(' ')
}

/* ── 4. Hexagon (rounded corners) ── */
export const hex: ShapePath = (cx, cy, size) => {
  const r = size / 2
  const w = r * (Math.sqrt(3) / 2)
  const verts: Array<[number, number]> = [
    [cx, cy - r],
    [cx + w, cy - r / 2],
    [cx + w, cy + r / 2],
    [cx, cy + r],
    [cx - w, cy + r / 2],
    [cx - w, cy - r / 2],
  ]
  return `path('${roundedPolygon(verts, size * 0.08)}')`
}

/* ── 5. House silhouette (rounded peak + rounded eaves + rounded door top + door cutout) ──
   Soft eave/wall corners AND the door's top-left/top-right are
   rounded so the cutout reads as a friendly arched-ish opening.
   The peak itself uses a Q curve (start ≈0.42, end ≈0.58, control
   above the bbox) so the apex reads as a gentle dome instead of a
   sharp point — the curve still peaks at y≈0.05 visually so the
   overall silhouette doesn't lose height. */
export const house: ShapePath = (cx, cy, size) => {
  const x0 = cx - size / 2
  const y0 = cy - size / 2
  const X = (n: number) => (x0 + n * size).toFixed(2)
  const Y = (n: number) => (y0 + n * size).toFixed(2)
  return [
    `path('M ${X(0.42)} ${Y(0.10)}`,                                           // start: left roof slope, just below peak
    `Q ${X(0.50)} ${Y(0.00)}, ${X(0.58)} ${Y(0.10)}`,                          // rounded peak (control above bbox keeps visible apex at y≈0.05)
    `L ${X(0.93)} ${Y(0.39)}`,                                                 // down to top-right eave
    `Q ${X(0.97)} ${Y(0.42)}, ${X(0.97)} ${Y(0.46)}`,                          // round eave corner
    `L ${X(0.97)} ${Y(0.91)}`,                                                 // down right wall
    `Q ${X(0.97)} ${Y(0.95)}, ${X(0.93)} ${Y(0.95)}`,                          // round to floor
    `L ${X(0.60)} ${Y(0.95)}`,                                                 // along floor to door
    `L ${X(0.60)} ${Y(0.71)}`,                                                 // up door right wall
    `Q ${X(0.60)} ${Y(0.68)}, ${X(0.57)} ${Y(0.68)}`,                          // round door top-right corner
    `L ${X(0.43)} ${Y(0.68)}`,                                                 // across door top
    `Q ${X(0.40)} ${Y(0.68)}, ${X(0.40)} ${Y(0.71)}`,                          // round door top-left corner
    `L ${X(0.40)} ${Y(0.95)}`,                                                 // down door left wall
    `L ${X(0.07)} ${Y(0.95)}`,                                                 // along floor to bottom-left
    `Q ${X(0.03)} ${Y(0.95)}, ${X(0.03)} ${Y(0.91)}`,                          // round corner
    `L ${X(0.03)} ${Y(0.46)}`,                                                 // up left wall
    `Q ${X(0.03)} ${Y(0.42)}, ${X(0.07)} ${Y(0.39)}`,                          // round eave
    `Z')`,                                                                     // Z closes left eave (0.07, 0.39) → start (0.42, 0.10) — left roof slope
  ].join(' ')
}


export const SHAPES: MapShape[] = [
  { id: 'rectangle', name: 'Rectangle', vibe: 'Hard-edged, editorial',  path: rectangle, peekScale: 0.95, expandScale: 2.6 },
  { id: 'squircle',  name: 'Squircle',  vibe: 'Soft, premium',          path: squircle,  peekScale: 0.92, expandScale: 2.8 },
  { id: 'circle',    name: 'Circle',    vibe: 'Clean',                  path: circle,    peekScale: 0.90, expandScale: 2.8 },
  { id: 'hex',       name: 'Hex',       vibe: 'Architectural',          path: hex,       peekScale: 0.95, expandScale: 2.8 },
  { id: 'heart',     name: 'Heart',     vibe: 'Signature',              path: heart,     peekScale: 1.15, expandScale: 3.0 },
  { id: 'house',     name: 'House',     vibe: 'Literal, playful',       path: house,     peekScale: 1.0,  expandScale: 3.0 },
]

export const SHAPE_BY_ID: Record<string, MapShape> = Object.fromEntries(
  SHAPES.map((s) => [s.id, s])
)

export const DEFAULT_SHAPE_ID = 'heart'

export function getShape(id: string | undefined | null): MapShape {
  return SHAPE_BY_ID[id || DEFAULT_SHAPE_ID] || SHAPE_BY_ID[DEFAULT_SHAPE_ID]
}
