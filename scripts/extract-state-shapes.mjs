/**
 * One-off build script — extracts each US state's SVG path from
 * scripts/data/us.svg, normalizes it into a [0,1]×[0,1] unit
 * coordinate space (centered, aspect-preserving with light
 * padding), and writes the result to src/lib/style/stateShapes.ts.
 *
 * Run when the source SVG changes:
 *   node scripts/extract-state-shapes.mjs
 *
 * Source: simplemaps.com US SVG (free for commercial use).
 *
 * The output is committed to the repo — there's no runtime cost.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, 'data', 'us.svg')
const OUT = path.join(__dirname, '..', 'src', 'lib', 'style', 'stateShapes.ts')

// Padding (fraction of the unit box) reserved on each side so the
// state outline doesn't crop right at the bounding box edge —
// gives the silhouette some breathing room when used as a peek
// clip-path. 0.04 ≈ 4% padding per side, 92% effective area.
const PADDING = 0.04

// We keep only the LARGEST subpath per state. Every state's main
// land mass becomes its silhouette: HI → Big Island, AK → mainland
// (no Aleutians), MA → mainland (no islands), FL → mainland (no
// Keys). Result: every state appears at "similar scale" in the
// picker because each state's main-land bbox normalizes to fill
// the same fraction of unit space, and bbox-centered rendering is
// always interior to a contiguous polygon (no empty ocean gaps to
// worry about at expand scale).

// ── Read source ──
const svg = fs.readFileSync(SRC, 'utf8')

// ── Extract per-state path entries ──
// Each path looks like:
//   <path id="MA" data-name="Massachusetts" data-id="MA" ... d="m..." />
// Attribute order varies — pull each piece independently.
const pathBlockRe = /<path\b([^>]*?)\/?>/g
const states = []
let m
while ((m = pathBlockRe.exec(svg)) !== null) {
  const attrs = m[1]
  const idMatch = attrs.match(/\bid="([A-Z]{2})"/)
  if (!idMatch) continue
  const code = idMatch[1]
  const nameMatch = attrs.match(/\bdata-name="([^"]+)"/)
  const dMatch = attrs.match(/\bd="([^"]+)"/)
  if (!dMatch) continue
  states.push({ code, name: nameMatch?.[1] ?? code, d: dMatch[1] })
}

if (states.length === 0) {
  console.error('No state paths found — abort.')
  process.exit(1)
}

console.log(`Extracted ${states.length} state paths.`)

// ── Path parser ──
// Handles M/m, L/l, Z/z and implicit line-tos after moveto.
// Returns an array of {type: 'M'|'L'|'Z', x?, y?} with absolute coords.
function parsePath(d) {
  const tokens = []
  const re = /([MmLlZz])|(-?\d+(?:\.\d+)?)/g
  let match
  while ((match = re.exec(d)) !== null) {
    if (match[1]) tokens.push({ kind: 'cmd', value: match[1] })
    else tokens.push({ kind: 'num', value: parseFloat(match[2]) })
  }

  const commands = []
  let cx = 0, cy = 0       // current point
  let mx = 0, my = 0       // last moveto target (Z resets here)
  let prevCmd = null
  let i = 0

  while (i < tokens.length) {
    let cmd
    if (tokens[i].kind === 'cmd') {
      cmd = tokens[i].value
      i++
    } else {
      // Implicit continuation: after M/m the implicit command is L/l
      if (prevCmd === 'M') cmd = 'L'
      else if (prevCmd === 'm') cmd = 'l'
      else cmd = prevCmd
    }

    if (cmd === 'M' || cmd === 'm') {
      const x = tokens[i++].value
      const y = tokens[i++].value
      // Per SVG spec: the very first 'm' in a path is treated as 'M'.
      if (cmd === 'm' && commands.length > 0) { cx += x; cy += y }
      else { cx = x; cy = y }
      mx = cx; my = cy
      commands.push({ type: 'M', x: cx, y: cy })
    } else if (cmd === 'L' || cmd === 'l') {
      const x = tokens[i++].value
      const y = tokens[i++].value
      if (cmd === 'l') { cx += x; cy += y }
      else { cx = x; cy = y }
      commands.push({ type: 'L', x: cx, y: cy })
    } else if (cmd === 'Z' || cmd === 'z') {
      cx = mx; cy = my
      commands.push({ type: 'Z' })
    } else {
      console.warn(`Unhandled command "${cmd}" in path — skipping.`)
      break
    }

    prevCmd = cmd
  }

  return commands
}

// ── Pole of inaccessibility ──
// The interior point most distant from the polygon boundary —
// guaranteed inside, with maximum clearance to the silhouette
// edge. Used as the EXPAND anchor: the runtime renderer puts this
// point at the container center so the container's projection in
// unit space stays well inside the silhouette regardless of
// shape, aspect, or viewport orientation. Critical for shapes
// like Florida where the bbox center sits in the Gulf of Mexico,
// not on land. Algorithm: grid-search the bbox, point-in-polygon
// test each cell, take the inside point with the largest distance
// to the nearest edge. Returns the point AND the clearance (used
// to size expandScale per-state). */
function pointInPolygon(p, vertices) {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1]
    const xj = vertices[j][0], yj = vertices[j][1]
    const intersect = (yi > p[1]) !== (yj > p[1]) &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  let t = lengthSq === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  const cx = a[0] + t * dx
  const cy = a[1] + t * dy
  return Math.hypot(p[0] - cx, p[1] - cy)
}

function poleOfInaccessibility(commands) {
  // Extract polygon vertices (M/L only) — for our pruned single
  // subpath state shapes this is one closed loop.
  const verts = []
  for (const c of commands) {
    if (c.type === 'M' || c.type === 'L') verts.push([c.x, c.y])
  }
  if (verts.length < 3) return { x: 0.5, y: 0.5, clearance: 0 }

  // Edges as segment pairs (closed polygon — last → first).
  const edges = []
  for (let i = 0; i < verts.length; i++) {
    edges.push([verts[i], verts[(i + 1) % verts.length]])
  }

  const b = bbox(commands)
  const N = 100  // grid resolution — 10k samples is fast in Node.

  let best = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, clearance: 0 }
  for (let ix = 0; ix < N; ix++) {
    for (let iy = 0; iy < N; iy++) {
      const x = b.minX + ((ix + 0.5) / N) * b.w
      const y = b.minY + ((iy + 0.5) / N) * b.h
      if (!pointInPolygon([x, y], verts)) continue
      let minDist = Infinity
      for (const [a, c] of edges) {
        const d = distanceToSegment([x, y], a, c)
        if (d < minDist) minDist = d
      }
      if (minDist > best.clearance) {
        best = { x, y, clearance: minDist }
      }
    }
  }
  return best
}

// ── Bbox over a list of commands ──
function bbox(commands) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of commands) {
    if (c.type === 'M' || c.type === 'L') {
      if (c.x < minX) minX = c.x
      if (c.y < minY) minY = c.y
      if (c.x > maxX) maxX = c.x
      if (c.y > maxY) maxY = c.y
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

// ── Split commands into subpaths (each starts with M, ends after Z) ──
function splitSubpaths(commands) {
  const subs = []
  let cur = []
  for (const c of commands) {
    if (c.type === 'M' && cur.length > 0) {
      subs.push(cur)
      cur = []
    }
    cur.push(c)
  }
  if (cur.length > 0) subs.push(cur)
  return subs
}

// ── Keep only the largest subpath ──
// We discard every subpath except the biggest one. For most states
// there's only ever a single mainland subpath, so this is a no-op.
// For multi-piece states (HI, AK, MA, FL+Keys, NY+Long Island,
// CA+Channel Islands, etc.) we end up with just the contiguous
// main land mass — gives us a single, simply-connected polygon
// that's reliably interior at its bbox center, which is what the
// runtime renderer needs to fully cover the container at expand.
function keepLargestSubpath(commands) {
  const subs = splitSubpaths(commands)
  if (subs.length <= 1) return commands
  let best = subs[0]
  let bestArea = 0
  for (const sub of subs) {
    const b = bbox(sub)
    const a = b.w * b.h
    if (a > bestArea) {
      bestArea = a
      best = sub
    }
  }
  return best
}

// ── Normalize to unit [0,1] x [0,1] preserving aspect ──
// Aspect-preserving fit: longer edge spans (1 - 2*PADDING), shorter
// edge centered with proportional padding on both sides.
function normalize(commands) {
  const b = bbox(commands)
  const usable = 1 - 2 * PADDING
  const longest = Math.max(b.w, b.h)
  const scale = usable / longest
  // Centering offsets so the shorter edge sits in the middle
  const offX = PADDING + (usable - b.w * scale) / 2
  const offY = PADDING + (usable - b.h * scale) / 2

  return commands.map((c) => {
    if (c.type === 'Z') return { type: 'Z' }
    return {
      type: c.type,
      x: offX + (c.x - b.minX) * scale,
      y: offY + (c.y - b.minY) * scale,
    }
  })
}

// ── Emit normalized commands as a clean d string (M/L/Z, 4 decimals) ──
function emit(commands) {
  const fmt = (n) => Number(n.toFixed(4)).toString()
  const parts = []
  for (const c of commands) {
    if (c.type === 'M') parts.push(`M${fmt(c.x)} ${fmt(c.y)}`)
    else if (c.type === 'L') parts.push(`L${fmt(c.x)} ${fmt(c.y)}`)
    else parts.push('Z')
  }
  return parts.join(' ')
}

// ── Process every state ──
const processed = states
  .map((s) => {
    try {
      const parsed = parsePath(s.d)
      const mainland = keepLargestSubpath(parsed)
      const b0 = bbox(mainland)
      const normalized = normalize(mainland)
      const pole = poleOfInaccessibility(normalized)
      return {
        code: s.code,
        name: s.name,
        d: emit(normalized),
        aspect: b0.w / b0.h,
        poleX: pole.x,
        poleY: pole.y,
        clearance: pole.clearance,
        commandCount: normalized.length,
        droppedSubpaths: splitSubpaths(parsed).length - 1,
      }
    } catch (err) {
      console.error(`Failed for ${s.code}: ${err.message}`)
      return null
    }
  })
  .filter(Boolean)
  // Sort alphabetically by name for stable output
  .sort((a, b) => a.name.localeCompare(b.name))

console.log(`Normalized ${processed.length} states.`)

// ── Write the TS data file ──
const header = `/* eslint-disable */
/* AUTO-GENERATED by scripts/extract-state-shapes.mjs — do not edit by hand.
   Source: scripts/data/us.svg (Simplemaps US SVG, free for commercial use).
   Each path is normalized into a [0,1]×[0,1] unit coordinate space, centered
   and aspect-preserving with ${(PADDING * 100).toFixed(0)}% padding per side. */

export interface StateShapeData {
  /** Two-letter postal code (e.g. "FL"). */
  code: string
  /** Full state name (e.g. "Florida"). */
  name: string
  /** SVG path \`d\` in [0,1]×[0,1] unit space. M/L/Z only. The
   *  silhouette is the state's largest contiguous land mass —
   *  Hawaii is Big Island, Massachusetts is the mainland (no Cape
   *  Cod islands), Alaska is the mainland (no Aleutians), etc. */
  d: string
  /** Original bbox aspect ratio (width / height). Reference only. */
  aspect: number
  /** Pole of inaccessibility — the most-interior point of the
   *  silhouette, in unit space. Used as the EXPAND anchor by the
   *  runtime renderer (peek stays bbox-centered). */
  poleX: number
  poleY: number
  /** Distance from the pole to the nearest polygon edge in unit
   *  space — used to compute a per-state expandScale that
   *  guarantees the container's projection fits inside the
   *  silhouette around the pole. */
  clearance: number
}

export const STATE_SHAPES: StateShapeData[] = [
`

const rows = processed
  .map((s) => `  { code: '${s.code}', name: ${JSON.stringify(s.name)}, d: ${JSON.stringify(s.d)}, aspect: ${s.aspect.toFixed(3)}, poleX: ${s.poleX.toFixed(4)}, poleY: ${s.poleY.toFixed(4)}, clearance: ${s.clearance.toFixed(4)} },`)
  .join('\n')

const footer = '\n]\n'

fs.writeFileSync(OUT, header + rows + footer)

const totalChars = processed.reduce((sum, s) => sum + s.d.length, 0)
const totalCmds = processed.reduce((sum, s) => sum + s.commandCount, 0)
console.log(`Wrote ${OUT}`)
console.log(`  Total command count: ${totalCmds}`)
console.log(`  Total path-string size: ${(totalChars / 1024).toFixed(1)} KB`)
