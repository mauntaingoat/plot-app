import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useMapStore } from '@/stores/mapStore'
import { formatPrice, getBounds } from '@/lib/firestore'
import { PIN_CONFIG, type Pin, type PinType } from '@/lib/types'

const MAPBOX_STYLE = 'mapbox://styles/mauntaingoat/cmndhmm7m000h01s5b0pvf9zx'
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

const PIN_SIZE = 40
const RING_PAD = 6
const TANGERINE = '#FF6B3D'

const RING_COLORS: Record<PinType, string> = {
  for_sale: '#3B82F6', sold: '#34C759', spotlight: '#FF6B3D',
}

// Gradient companion colors for animated pins (shifted hue)
const RING_GRADIENT_COLORS: Record<PinType, string> = {
  for_sale: '#8B5CF6',  // blue → purple
  sold: '#6EE7B7',      // green → pale mint
  spotlight: '#E8522A', // tangerine → ember
}

interface MapCanvasProps {
  pins: Pin[]
  agentPhotoUrl?: string | null
  onPinClick?: (pin: Pin) => void
  onMapMoved?: () => void
  className?: string
  fitToPins?: boolean
  interactive?: boolean
  showBackButton?: boolean
  onBack?: () => void
}

function pinsToGeoJSON(pins: Pin[]) {
  // Detect same-address pins and offset them so they sit side by side
  const coordKey = (p: Pin) => `${p.coordinates.lat.toFixed(6)},${p.coordinates.lng.toFixed(6)}`
  const groups = new Map<string, Pin[]>()
  for (const pin of pins) {
    const key = coordKey(pin)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(pin)
  }

  // Small lng offset (~30m at equator, enough to separate visually at high zoom)
  const OFFSET = 0.0003

  return {
    type: 'FeatureCollection' as const,
    features: pins.map((pin) => {
      const key = coordKey(pin)
      const group = groups.get(key)!
      let lng = pin.coordinates.lng
      let lat = pin.coordinates.lat

      if (group.length > 1) {
        const idx = group.indexOf(pin)
        const total = group.length
        // Spread pins horizontally: center them around the original point
        const spreadOffset = (idx - (total - 1) / 2) * OFFSET
        lng += spreadOffset
      }

      const price = 'price' in pin ? pin.price : 'soldPrice' in pin ? pin.soldPrice : 0
      const priceK = price >= 1_000_000 ? `$${(price / 1_000_000).toFixed(1)}M` : price >= 1_000 ? `$${(price / 1_000).toFixed(0)}K` : price > 0 ? `$${price}` : ''
      // Label: price for for_sale, SOLD for sold, name for spotlight
      const label = pin.type === 'sold' ? 'SOLD'
        : pin.type === 'spotlight' ? ('name' in pin ? pin.name : '')
        : priceK || ''
      // Check for live or open house indicators
      const isLive = pin.type === 'for_sale' && 'isLive' in pin && pin.isLive
      const hasOpenHouse = pin.type === 'for_sale' && 'openHouse' in pin && !!pin.openHouse?.sessions?.length
      return {
        type: 'Feature' as const, id: pin.id,
        geometry: { type: 'Point' as const, coordinates: [lng, lat] },
        properties: {
          id: pin.id, type: pin.type,
          label: isLive ? 'LIVE' : label,
          isLive: isLive ? 'true' : 'false',
          hasOpenHouse: hasOpenHouse ? 'true' : 'false',
        },
      }
    }),
  }
}

// SVG icon paths for pin type fallbacks (from lucide: Home, BadgeCheck, Compass)
// Stroke colors match the pin creation flow: blue for_sale, green sold, tangerine spotlight.
const PIN_TYPE_ICONS: Record<string, string> = {
  for_sale: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  sold: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  spotlight: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
}

// Pre-load all pin type icons at module init so they're decoded and
// ready before any pin image is created. Data URIs decode fast but
// img.complete can be false on the first synchronous access.
const iconImageCache = new Map<string, HTMLImageElement>()
;(() => {
  for (const [type, svg] of Object.entries(PIN_TYPE_ICONS)) {
    const img = new Image()
    img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`
    iconImageCache.set(type, img)
  }
})()
function getPinTypeIcon(type: string): HTMLImageElement | null {
  return iconImageCache.get(type) ?? null
}

function createPinImage(img: HTMLImageElement | null, ringColor: string, pinType: string, size: number = PIN_SIZE + RING_PAD): ImageData {
  const canvas = document.createElement('canvas')
  const s = size * 2
  canvas.width = s; canvas.height = s
  const ctx = canvas.getContext('2d')!
  const cx = s / 2, cy = s / 2, outerR = s / 2
  const ringW = (RING_PAD / 2) * 2, innerR = outerR - ringW
  ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2); ctx.fillStyle = ringColor; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fillStyle = '#0A0E17'; ctx.fill()
  let tainted = false
  if (img && img.complete && img.naturalWidth > 0) {
    try {
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2); ctx.clip()
      const imgSize = (innerR - 2) * 2
      ctx.drawImage(img, cx - innerR + 2, cy - innerR + 2, imgSize, imgSize)
      ctx.restore()
      // Test if canvas is tainted before returning
      ctx.getImageData(0, 0, 1, 1)
    } catch {
      // Cross-origin image tainted the canvas — redraw with icon fallback
      tainted = true
      ctx.clearRect(0, 0, s, s)
      ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2); ctx.fillStyle = ringColor; ctx.fill()
      ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fillStyle = '#0A0E17'; ctx.fill()
    }
  }
  if (tainted || !img || !img.complete || img.naturalWidth === 0) {
    const icon = getPinTypeIcon(pinType)
    if (icon && icon.complete && icon.naturalWidth > 0) {
      const iconSize = innerR * 1.1
      ctx.drawImage(icon, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize)
    } else {
      const letter = (PIN_CONFIG[pinType as keyof typeof PIN_CONFIG]?.label || 'P')[0]
      ctx.fillStyle = '#ffffff'; ctx.font = `bold ${innerR * 0.7}px Outfit, sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, cx, cy)
    }
  }
  return ctx.getImageData(0, 0, s, s)
}

// ── Draw a rounded house shape ──
function drawHouseShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, cornerR: number, raised: number, chimneyT: number) {
  const roofPeakY = cy - r * 1.05
  const eaveY = cy - r * 0.2
  const baseY = cy + r * 0.75 - raised
  const leftX = cx - r * 0.88
  const rightX = cx + r * 0.88

  ctx.beginPath()
  // Start from bottom-left, go clockwise with rounded corners
  ctx.moveTo(leftX + cornerR, baseY)
  ctx.lineTo(rightX - cornerR, baseY)
  ctx.arcTo(rightX, baseY, rightX, baseY - cornerR, cornerR)
  ctx.lineTo(rightX, eaveY + cornerR)
  ctx.arcTo(rightX, eaveY, rightX - cornerR, eaveY - cornerR, cornerR * 0.5)
  ctx.lineTo(cx + 2, roofPeakY)
  ctx.arcTo(cx, roofPeakY - 2, cx - 2, roofPeakY, 3)
  ctx.lineTo(leftX + cornerR * 0.5, eaveY - cornerR * 0.5)
  ctx.arcTo(leftX, eaveY, leftX, eaveY + cornerR, cornerR * 0.5)
  ctx.lineTo(leftX, baseY - cornerR)
  ctx.arcTo(leftX, baseY, leftX + cornerR, baseY, cornerR)
  ctx.closePath()
}

// ── Draw a transparent door cutout that animates upward ──
function drawDoor(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, raised: number, doorT: number) {
  if (doorT <= 0) return
  const baseY = cy + r * 0.75 - raised
  const doorW = r * 0.28
  const doorH = r * 0.45 * doorT
  const doorX = cx - doorW / 2
  const doorY = baseY - doorH
  const doorR = 3

  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.roundRect(doorX, doorY, doorW, doorH, [doorR, doorR, 0, 0])
  ctx.fill()
  ctx.restore()
}

// ── Interpolate between circle and a shape path ──
// t: 0 = circle, 1 = target shape
function drawMorphedPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, raised: number, cornerR: number, chimneyT: number) {
  if (t <= 0.001) {
    // Pure circle
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath()
    return
  }
  if (t >= 0.999) {
    // Pure house
    drawHouseShape(ctx, cx, cy, r, cornerR, raised, chimneyT)
    return
  }

  // For intermediate morph values, sample points from both shapes and lerp
  const steps = 72
  const circlePoints: { x: number; y: number }[] = []
  const housePoints: { x: number; y: number }[] = []

  // Sample circle
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2 - Math.PI / 2
    circlePoints.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r })
  }

  // Sample house shape by rendering to a temp path and extracting points
  // Approximation: use key vertices of the house, distributed across steps
  const roofPeakY = cy - r * 1.05
  const eaveY = cy - r * 0.2
  const baseY = cy + r * 0.75 - raised
  const leftX = cx - r * 0.88
  const rightX = cx + r * 0.88

  // Define house outline as sequential points
  const houseOutline = [
    { x: cx, y: roofPeakY },              // peak
    { x: rightX, y: eaveY },              // right eave
    { x: rightX, y: baseY },              // bottom-right
    { x: leftX, y: baseY },               // bottom-left
    { x: leftX, y: eaveY },               // left eave
  ]

  // Distribute house points evenly along perimeter
  const segments: { x: number; y: number }[] = []
  let totalLen = 0
  const segLens: number[] = []
  for (let i = 0; i < houseOutline.length; i++) {
    const next = houseOutline[(i + 1) % houseOutline.length]
    const dx = next.x - houseOutline[i].x, dy = next.y - houseOutline[i].y
    const len = Math.sqrt(dx * dx + dy * dy)
    segLens.push(len); totalLen += len
  }
  for (let i = 0; i < steps; i++) {
    let target = (i / steps) * totalLen
    let seg = 0
    while (seg < segLens.length - 1 && target > segLens[seg]) { target -= segLens[seg]; seg++ }
    const segProgress = target / segLens[seg]
    const p1 = houseOutline[seg], p2 = houseOutline[(seg + 1) % houseOutline.length]
    housePoints.push({ x: p1.x + (p2.x - p1.x) * segProgress, y: p1.y + (p2.y - p1.y) * segProgress })
  }

  // Lerp and draw
  ctx.beginPath()
  for (let i = 0; i < steps; i++) {
    const px = circlePoints[i].x + (housePoints[i].x - circlePoints[i].x) * t
    const py = circlePoints[i].y + (housePoints[i].y - circlePoints[i].y) * t
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

// Animation timing (40 frames total, ~160ms/frame = ~6.4s cycle):
// Phase 1: Circle hold (1s)        = frames 0-5    (6 frames)
// Phase 2: Morph to house (0.8s)   = frames 6-10   (5 frames)
// Phase 3: Door + shake (1.6s)     = frames 11-20  (10 frames)
// Phase 4: House hold (2.1s)       = frames 21-34  (14 frames)
// Phase 5: Morph back (0.8s)       = frames 35-39  (5 frames)
const OH_CIRCLE_END = 6
const OH_MORPH_IN_END = 11
const OH_SHAKE_END = 21
const OH_HOUSE_HOLD_END = 35

const ANIM_FRAMES = 40
const ANIM_EXTRA_SIZE = 12 // extra canvas space for chimney + pulse ring

function createOpenHouseFrame(img: HTMLImageElement | null, pinType: string, frame: number, ringColor: string, gradientColor: string): ImageData {
  const size = PIN_SIZE + RING_PAD + ANIM_EXTRA_SIZE
  const canvas = document.createElement('canvas')
  const s = size * 2
  canvas.width = s; canvas.height = s
  const ctx = canvas.getContext('2d')!
  const cx = s / 2, cy = s / 2
  const outerR = (PIN_SIZE + RING_PAD) * 2 / 2
  const ringW = (RING_PAD / 2) * 2, innerR = outerR - ringW
  const raisedAmount = 4
  const houseCornerR = 6

  // Create gradient for animated fills
  const grad = ctx.createLinearGradient(cx - outerR, cy - outerR, cx + outerR, cy + outerR)
  grad.addColorStop(0, ringColor)
  grad.addColorStop(1, gradientColor)

  let morph = 0
  let chimneyT = 0
  let doorT = 0
  let shakeAngle = 0
  let fillT = 0 // 0 = show thumbnail, 1 = solid color fill

  if (frame < OH_CIRCLE_END) {
    // Phase 1: circle hold — thumbnail visible
    morph = 0
    fillT = 0
  } else if (frame < OH_MORPH_IN_END) {
    // Phase 2: morph to house + fill in solid
    const t = (frame - OH_CIRCLE_END) / (OH_MORPH_IN_END - OH_CIRCLE_END)
    morph = 1 - (1 - t) * (1 - t)
    fillT = t
  } else if (frame < OH_SHAKE_END) {
    // Phase 3: solid house + chimney pop + door rise + shake
    morph = 1
    fillT = 1
    const shakeProgress = (frame - OH_MORPH_IN_END) / (OH_SHAKE_END - OH_MORPH_IN_END)
    chimneyT = Math.min(1, shakeProgress * 3)
    doorT = Math.min(1, shakeProgress * 3) // door rises at same time as chimney
    const shakeDecay = Math.max(0, 1 - shakeProgress * 0.8)
    shakeAngle = Math.sin(shakeProgress * Math.PI * 6) * 4 * shakeDecay
  } else if (frame < OH_HOUSE_HOLD_END) {
    // Phase 4: solid house hold with chimney + door
    morph = 1
    fillT = 1
    chimneyT = 1
    doorT = 1
  } else {
    // Phase 5: morph back to circle + reveal thumbnail
    const t = (frame - OH_HOUSE_HOLD_END) / (ANIM_FRAMES - OH_HOUSE_HOLD_END)
    morph = 1 - t * t
    fillT = 1 - t
    chimneyT = 1 - t
    doorT = 1 - t
  }

  // Apply shake rotation
  if (shakeAngle !== 0) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((shakeAngle * Math.PI) / 180)
    ctx.translate(-cx, -cy)
  }

  // Outer ring / house outline
  ctx.fillStyle = grad
  drawMorphedPath(ctx, cx, cy, outerR, morph, raisedAmount, houseCornerR, chimneyT)
  ctx.fill()

  // Inner area
  drawMorphedPath(ctx, cx, cy, innerR, morph, raisedAmount, houseCornerR - 2, chimneyT > 0 ? chimneyT * 0.8 : 0)

  if (fillT >= 0.999) {
    // Fully solid — fill with gradient
    ctx.fillStyle = grad; ctx.fill()
    // Draw door on top of solid fill
    drawDoor(ctx, cx, cy, outerR, raisedAmount, doorT)
  } else if (fillT <= 0.001) {
    // Fully thumbnail — dark bg + image
    ctx.fillStyle = '#0A0E17'; ctx.fill()
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save()
      drawMorphedPath(ctx, cx, cy, innerR - 2, morph, raisedAmount, houseCornerR - 2, 0)
      ctx.clip()
      const imgSize = (innerR - 2) * 2
      ctx.drawImage(img, cx - innerR + 2, cy - innerR + 2, imgSize, imgSize)
      ctx.restore()
    } else {
      const icon = getPinTypeIcon(pinType)
      if (icon && icon.complete && icon.naturalWidth > 0) {
        const iconSize = innerR * 1.1
        ctx.drawImage(icon, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize)
      }
    }
  } else {
    // Transitioning — draw thumbnail then overlay solid color with opacity
    ctx.fillStyle = '#0A0E17'; ctx.fill()
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save()
      drawMorphedPath(ctx, cx, cy, innerR - 2, morph, raisedAmount, houseCornerR - 2, 0)
      ctx.clip()
      const imgSize = (innerR - 2) * 2
      ctx.drawImage(img, cx - innerR + 2, cy - innerR + 2, imgSize, imgSize)
      ctx.restore()
    } else {
      const icon = getPinTypeIcon(pinType)
      if (icon && icon.complete && icon.naturalWidth > 0) {
        const iconSize = innerR * 1.1
        ctx.drawImage(icon, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize)
      }
    }
    // Overlay solid color with transition opacity
    ctx.save()
    ctx.globalAlpha = fillT
    drawMorphedPath(ctx, cx, cy, innerR, morph, raisedAmount, houseCornerR - 2, chimneyT > 0 ? chimneyT * 0.8 : 0)
    ctx.fillStyle = grad; ctx.fill()
    ctx.restore()
    // Draw door on top
    if (doorT > 0) drawDoor(ctx, cx, cy, outerR, raisedAmount, doorT)
  }

  if (shakeAngle !== 0) ctx.restore()

  return ctx.getImageData(0, 0, s, s)
}

// Livestream: pulsing ring that expands and fades, color matches pin type
function createLiveFrame(img: HTMLImageElement | null, pinType: string, frame: number, ringColor: string, gradientColor: string): ImageData {
  const size = PIN_SIZE + RING_PAD + ANIM_EXTRA_SIZE
  const canvas = document.createElement('canvas')
  const s = size * 2
  canvas.width = s; canvas.height = s
  const ctx = canvas.getContext('2d')!
  const cx = s / 2, cy = s / 2
  const outerR = (PIN_SIZE + RING_PAD) * 2 / 2
  const ringW = (RING_PAD / 2) * 2, innerR = outerR - ringW

  // Parse ringColor hex to RGB for pulse rgba
  const rc = parseInt(ringColor.slice(1), 16)
  const rr = (rc >> 16) & 255, rg = (rc >> 8) & 255, rb = rc & 255

  // Pulse on a shorter cycle (20 frames) so it pulses twice per full animation loop
  const pulseFrames = 20
  const progress = (frame % pulseFrames) / pulseFrames
  const pulseR = outerR + (ANIM_EXTRA_SIZE * 2) * progress
  const pulseOpacity = 0.6 * (1 - progress)
  if (pulseOpacity > 0.01) {
    ctx.beginPath(); ctx.arc(cx, cy, pulseR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${rr}, ${rg}, ${rb}, ${pulseOpacity})`
    ctx.lineWidth = 3
    ctx.stroke()
  }

  // Second pulse ring, offset
  const progress2 = ((frame + pulseFrames / 2) % pulseFrames) / pulseFrames
  const pulseR2 = outerR + (ANIM_EXTRA_SIZE * 2) * progress2
  const pulseOpacity2 = 0.4 * (1 - progress2)
  if (pulseOpacity2 > 0.01) {
    ctx.beginPath(); ctx.arc(cx, cy, pulseR2, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${rr}, ${rg}, ${rb}, ${pulseOpacity2})`
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // Main pin ring with gradient
  const grad = ctx.createLinearGradient(cx - outerR, cy - outerR, cx + outerR, cy + outerR)
  grad.addColorStop(0, ringColor)
  grad.addColorStop(1, gradientColor)
  ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fillStyle = '#0A0E17'; ctx.fill()

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2); ctx.clip()
    const imgSize = (innerR - 2) * 2
    ctx.drawImage(img, cx - innerR + 2, cy - innerR + 2, imgSize, imgSize)
    ctx.restore()
  } else {
    const icon = getPinTypeIcon(pinType)
    if (icon && icon.complete && icon.naturalWidth > 0) {
      const iconSize = innerR * 1.1
      ctx.drawImage(icon, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize)
    } else {
      const letter = (PIN_CONFIG[pinType as keyof typeof PIN_CONFIG]?.label || 'P')[0]
      ctx.fillStyle = '#ffffff'; ctx.font = `bold ${innerR * 0.7}px Outfit, sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, cx, cy)
    }
  }

  return ctx.getImageData(0, 0, s, s)
}

// Create a pill-shaped badge image with custom bg color
function createPillImage(text: string, bgColor: string, textColor: string = '#ffffff'): ImageData {
  const canvas = document.createElement('canvas')
  const scale = 2
  const tmpCtx = canvas.getContext('2d')!
  tmpCtx.font = `bold ${10 * scale}px Outfit, sans-serif`
  const textW = tmpCtx.measureText(text).width
  const padX = 8 * scale, padY = 4 * scale
  const w = textW + padX * 2, h = 14 * scale + padY * 2
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  const r = h / 2
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.fillStyle = bgColor; ctx.fill()
  ctx.fillStyle = textColor; ctx.font = `bold ${10 * scale}px Outfit, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2)
  return ctx.getImageData(0, 0, w, h)
}

// Generate animation frames in non-blocking batches (5 frames per batch, yield between)
function queueFrameGeneration(
  map: mapboxgl.Map,
  loadedSet: Set<string>,
  pinId: string,
  prefix: string,
  totalFrames: number,
  createFrame: (frame: number) => ImageData
) {
  const BATCH_SIZE = 5
  let f = 0
  const processBatch = () => {
    if (!map.isStyleLoaded()) { setTimeout(processBatch, 100); return }
    const end = Math.min(f + BATCH_SIZE, totalFrames)
    for (; f < end; f++) {
      const frameId = `pin-${prefix}-${pinId}-${f}`
      if (!loadedSet.has(frameId)) {
        const frameData = createFrame(f)
        if (!map.hasImage(frameId)) { map.addImage(frameId, frameData, { pixelRatio: 2 }); loadedSet.add(frameId) }
      }
    }
    if (f < totalFrames) {
      // Yield to browser — use requestIdleCallback if available, else setTimeout
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(processBatch, { timeout: 200 })
      } else {
        setTimeout(processBatch, 0)
      }
    }
  }
  // Start after a small delay so static pins render first
  setTimeout(processBatch, 50)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function MapCanvas({ pins, agentPhotoUrl, onPinClick, onMapMoved, className = '', fitToPins = true, interactive = true, showBackButton, onBack }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const fittedRef = useRef(false)
  const pinsRef = useRef(pins); pinsRef.current = pins
  const loadedImagesRef = useRef<Set<string>>(new Set())
  const { center, zoom } = useMapStore()
  const pinClickRef = useRef(onPinClick); pinClickRef.current = onPinClick

  const animatedPinIds = useRef<{ openHouse: string[]; live: string[] }>({ openHouse: [], live: [] })
  const pinFrames = useRef<Map<string, number>>(new Map()) // per-pin frame counter
  const prevVisibleIds = useRef<Set<string>>(new Set()) // track which pins were visible last tick
  const animIntervalRef = useRef<number | null>(null)

  const loadPinImages = useCallback(async (map: mapboxgl.Map, pinList: Pin[]) => {
    // Load all images in parallel. Priority for each pin's thumbnail:
    // 1. First content item's thumbnailUrl (if content exists)
    // 2. Listing heroPhotoUrl (MLS photos)
    // 3. Agent's profile photo
    // 4. Pin-type icon fallback (handled in createPinImage)
    const agentImgPromise = agentPhotoUrl ? loadImage(agentPhotoUrl).catch(() => null) : Promise.resolve(null)
    const pinImagePromises = pinList.map((pin) => {
      const contentThumb = pin.content?.[0]?.thumbnailUrl || ''
      const heroUrl = 'heroPhotoUrl' in pin ? pin.heroPhotoUrl : ''
      const url = contentThumb || heroUrl
      return url ? loadImage(url).catch(() => null) : Promise.resolve(null)
    })
    const [agentImg, ...pinImages] = await Promise.all([agentImgPromise, ...pinImagePromises])

    const newOpenHouse: string[] = []
    const newLive: string[] = []

    for (let idx = 0; idx < pinList.length; idx++) {
      const pin = pinList[idx]
      const color = RING_COLORS[pin.type] || '#FF6B3D'
      const pType = pin.type
      const img = pinImages[idx] || agentImg

      const isLive = pin.type === 'for_sale' && 'isLive' in pin && pin.isLive
      const hasOpenHouse = pin.type === 'for_sale' && 'openHouse' in pin && !!pin.openHouse?.sessions?.length

      // Queue animation frame generation (non-blocking)
      if (hasOpenHouse) {
        newOpenHouse.push(pin.id)
        const ohImg = img, ohColor = color, ohGrad = RING_GRADIENT_COLORS[pin.type] || color, ohType = pType, ohId = pin.id
        queueFrameGeneration(map, loadedImagesRef.current, ohId, 'oh', ANIM_FRAMES, (f) => createOpenHouseFrame(ohImg, ohType, f, ohColor, ohGrad))
      }

      if (isLive) {
        newLive.push(pin.id)
        const liveImg = img, liveColor = color, liveGrad = RING_GRADIENT_COLORS[pin.type] || color, liveType = pType, liveId = pin.id
        queueFrameGeneration(map, loadedImagesRef.current, liveId, 'live', ANIM_FRAMES, (f) => createLiveFrame(liveImg, liveType, f, liveColor, liveGrad))
      }

      // Type-colored ring version (for individual pins).
      // Always regenerate — pin content/photos may have changed since
      // the last render, and the thumbnail should reflect the latest.
      const imgId = `pin-img-${pin.id}`
      const imageData = createPinImage(img, color, pType)
      if (map.hasImage(imgId)) {
        map.removeImage(imgId)
      }
      map.addImage(imgId, imageData, { pixelRatio: 2 })
      loadedImagesRef.current.add(imgId)

      // Orange ring version (for mixed-type clusters)
      const orangeId = `pin-img-orange-${pin.id}`
      const orangeData = createPinImage(img, TANGERINE, pType)
      if (map.hasImage(orangeId)) {
        map.removeImage(orangeId)
      }
      map.addImage(orangeId, orangeData, { pixelRatio: 2 })
      loadedImagesRef.current.add(orangeId)

      // Per-pin label pill (price/status/neighborhood name in type-colored pill)
      const label = pin.type === 'sold' ? 'SOLD'
        : pin.type === 'spotlight' && 'name' in pin ? pin.name
        : ('price' in pin ? formatPrice((pin as any).price) : 'soldPrice' in pin ? formatPrice((pin as any).soldPrice) : '')
      if (label) {
        const labelId = `label-${pin.id}`
        if (!loadedImagesRef.current.has(labelId)) {
          const labelData = createPillImage(label, color)
          if (!map.hasImage(labelId)) { map.addImage(labelId, labelData, { pixelRatio: 2 }); loadedImagesRef.current.add(labelId) }
        }
      }
    }

    animatedPinIds.current = { openHouse: newOpenHouse, live: newLive }

    // Pre-render cluster badge pills
    for (let i = 1; i <= 20; i++) {
      const badgeId = `badge-${i}`
      if (!loadedImagesRef.current.has(badgeId)) {
        const badgeData = createPillImage(`+${i} more`, TANGERINE)
        if (!map.hasImage(badgeId)) { map.addImage(badgeId, badgeData, { pixelRatio: 2 }); loadedImagesRef.current.add(badgeId) }
      }
    }
  }, [agentPhotoUrl])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    const map = new mapboxgl.Map({
      container: mapContainer.current, style: MAPBOX_STYLE, center, zoom,
      attributionControl: false, interactive, pitchWithRotate: false,
      dragRotate: false, touchPitch: false, minZoom: 3, maxZoom: 16.8, fadeDuration: 0,
    })

    map.on('style.load', () => {})

    map.on('load', async () => {
      await loadPinImages(map, pinsRef.current)

      map.addSource('pins', {
        type: 'geojson',
        data: pinsToGeoJSON(pinsRef.current) as GeoJSON.FeatureCollection,
        cluster: true, clusterMaxZoom: 16, clusterRadius: 30,
        clusterProperties: {
          // First pin's ID
          firstPinId: [['coalesce', ['accumulated'], ['get', 'firstPinId']], ['get', 'id']],
          // Track if cluster has mixed types: concatenate types, check later
          typeSet: [['concat', ['accumulated'], ',', ['get', 'typeSet']], ['get', 'type']],
        },
      })

      // ── Cluster icon — orange ring if mixed, type-color if uniform ──
      map.addLayer({
        id: 'cluster-icons',
        type: 'symbol',
        source: 'pins',
        filter: ['has', 'point_count'],
        layout: {
          'icon-image': [
            'case',
            // Check if typeSet contains a comma (meaning multiple different types)
            ['!=', ['index-of', ',', ['get', 'typeSet']], -1],
            // Mixed types → orange ring version
            ['concat', 'pin-img-orange-', ['get', 'firstPinId']],
            // Single type → use the normal type-colored version
            ['concat', 'pin-img-', ['get', 'firstPinId']],
          ],
          'icon-size': [
            'interpolate', ['linear'], ['get', 'point_count'],
            2, 0.92, 3, 0.98, 4, 1.04, 5, 1.08, 6, 1.12, 7, 1.15, 50, 1.15,
          ],
          'icon-allow-overlap': true,
        },
      })

      // ── "+X more" badge below cluster (pre-rendered pill image) ──
      map.addLayer({
        id: 'cluster-badge',
        type: 'symbol',
        source: 'pins',
        filter: ['has', 'point_count'],
        layout: {
          'icon-image': [
            'concat', 'badge-',
            ['to-string', ['min', ['-', ['get', 'point_count'], 1], 20]],
          ],
          'icon-offset': [0, 28],
          'icon-allow-overlap': true,
        },
      })

      // ── Individual pin icons ──
      map.addLayer({
        id: 'pin-icons',
        type: 'symbol',
        source: 'pins',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['concat', 'pin-img-', ['get', 'id']],
          'icon-size': 0.9,
          'icon-allow-overlap': true,
          'icon-anchor': 'center',
        },
      })

      // ── Price/status label pills (pre-rendered images) ──
      map.addLayer({
        id: 'pin-labels',
        type: 'symbol',
        source: 'pins',
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'label'], '']],
        layout: {
          'icon-image': ['concat', 'label-', ['get', 'id']],
          'icon-offset': [0, 28],
          'icon-allow-overlap': true,
        },
      })

      // ── Clicks ──
      map.on('click', 'pin-icons', (e) => {
        if (!e.features?.length) return
        const pinId = e.features[0].properties?.id
        if (pinId) { const pin = pinsRef.current.find((p) => p.id === pinId); if (pin) pinClickRef.current?.(pin) }
      })
      map.on('click', 'cluster-icons', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['cluster-icons'] })
        if (!features.length) return
        const clusterId = features[0].properties?.cluster_id
        const source = map.getSource('pins') as mapboxgl.GeoJSONSource
        source.getClusterExpansionZoom(clusterId, (err, z) => {
          if (err || !features[0].geometry || features[0].geometry.type !== 'Point') return
          map.easeTo({ center: features[0].geometry.coordinates as [number, number], zoom: z!, duration: 400 })
        })
      })
      map.on('mouseenter', 'pin-icons', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'pin-icons', () => { map.getCanvas().style.cursor = '' })
      map.on('mouseenter', 'cluster-icons', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'cluster-icons', () => { map.getCanvas().style.cursor = '' })

      if (fitToPins && pinsRef.current.length > 0 && !fittedRef.current) {
        fittedRef.current = true
        const coords = pinsRef.current.map((p) => p.coordinates)
        if (coords.length === 1) map.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 800 })
        else map.fitBounds(getBounds(coords), { padding: 80, duration: 800 })
      }

      // ── Animation loop using requestAnimationFrame ──
      // Pauses automatically when tab is hidden, throttled to ~160ms/frame
      let lastFrameTime = 0
      const FRAME_INTERVAL = 160 // ms per frame (~6fps, smooth enough for morph)

      const animLoop = (timestamp: number) => {
        animIntervalRef.current = requestAnimationFrame(animLoop)
        if (!map.isStyleLoaded()) return
        if (timestamp - lastFrameTime < FRAME_INTERVAL) return
        lastFrameTime = timestamp

        const { openHouse, live } = animatedPinIds.current
        if (openHouse.length === 0 && live.length === 0) return

        // Check which animated pins are actually visible in the viewport
        const visibleFeatures = map.queryRenderedFeatures(undefined as any, { layers: ['pin-icons'] })
        const visibleIds = new Set(visibleFeatures.map((f) => f.properties?.id))

        const visibleOH = openHouse.filter((id) => visibleIds.has(id))
        const visibleLive = live.filter((id) => visibleIds.has(id))
        // Reset icon to static for any pin that just left the viewport
        if (prevVisibleIds.current.size > 0) {
          const allVisible = new Set([...visibleOH, ...visibleLive])
          let needsReset = false
          for (const id of prevVisibleIds.current) {
            if (!allVisible.has(id)) { pinFrames.current.delete(id); needsReset = true }
          }
          if (needsReset && visibleOH.length === 0 && visibleLive.length === 0) {
            // All gone — reset layer to default static icons
            try { map.setLayoutProperty('pin-icons', 'icon-image', ['concat', 'pin-img-', ['get', 'id']]) } catch {}
            prevVisibleIds.current.clear()
            return
          }
        }

        if (visibleOH.length === 0 && visibleLive.length === 0) {
          prevVisibleIds.current.clear()
          return
        }

        const pinIconExpr: any[] = ['case']

        for (const id of visibleOH) {
          // Reset to frame 0 if pin just became visible
          if (!prevVisibleIds.current.has(id)) pinFrames.current.set(id, 0)
          const frame = pinFrames.current.get(id) || 0
          pinIconExpr.push(['==', ['get', 'id'], id], `pin-oh-${id}-${frame}`)
          pinFrames.current.set(id, (frame + 1) % ANIM_FRAMES)
        }
        for (const id of visibleLive) {
          if (!prevVisibleIds.current.has(id)) pinFrames.current.set(id, 0)
          const frame = pinFrames.current.get(id) || 0
          pinIconExpr.push(['==', ['get', 'id'], id], `pin-live-${id}-${frame}`)
          pinFrames.current.set(id, (frame + 1) % ANIM_FRAMES)
        }

        // Update previous visible set
        prevVisibleIds.current = new Set([...visibleOH, ...visibleLive])

        pinIconExpr.push(['concat', 'pin-img-', ['get', 'id']])

        try {
          map.setLayoutProperty('pin-icons', 'icon-image', pinIconExpr as any)
        } catch {}
      }

      animIntervalRef.current = requestAnimationFrame(animLoop)
    })

    map.on('moveend', () => onMapMoved?.())
    mapRef.current = map
    return () => {
      if (animIntervalRef.current) cancelAnimationFrame(animIntervalRef.current)
      loadedImagesRef.current.clear(); map.remove(); mapRef.current = null
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    loadPinImages(map, pins).then(() => {
      const source = map.getSource('pins') as mapboxgl.GeoJSONSource | undefined
      if (source) source.setData(pinsToGeoJSON(pins) as GeoJSON.FeatureCollection)
    })
    if (fitToPins && pins.length > 0 && !fittedRef.current) {
      fittedRef.current = true
      const coords = pins.map((p) => p.coordinates)
      if (coords.length === 1) map.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 800 })
      else map.fitBounds(getBounds(coords), { padding: 80, duration: 800 })
    }
  }, [pins, fitToPins, loadPinImages])

  const fitTo = useCallback((targetPins: Pin[]) => {
    const map = mapRef.current
    if (!map || targetPins.length === 0) return
    const coords = targetPins.map((p) => p.coordinates)
    if (coords.length === 1) map.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 600 })
    else map.fitBounds(getBounds(coords), { padding: 80, duration: 600 })
  }, [])

  useEffect(() => { if (mapContainer.current) (mapContainer.current as any).__plotFitTo = fitTo }, [fitTo])

  return (
    <div className={`relative w-full h-full touch-none ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      {showBackButton && onBack && (
        <button onClick={onBack} className="absolute bottom-[calc(env(safe-area-inset-bottom,8px)+20px)] left-4 z-50 bg-white/90 backdrop-blur-md rounded-full px-4 py-2.5 text-[13px] font-semibold text-ink shadow-lg border border-black/5">
          Exit Preview
        </button>
      )}
    </div>
  )
}
