import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import Supercluster from 'supercluster'
import { useMapStore } from '@/stores/mapStore'
import { formatPrice, getBounds } from '@/lib/firestore'
import { PIN_CONFIG, type Pin, type PinType } from '@/lib/types'

const MAPBOX_STYLE = 'mapbox://styles/mauntaingoat/cmndhmm7m000h01s5b0pvf9zx'
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

// ── Visual config ──
const PIN_RADIUS = 18    // px — rendered pin circle size
const PIN_DIAMETER = PIN_RADIUS * 2
const CLUSTER_BASE = 20  // px — cluster starts barely bigger than a pin
const CLUSTER_GROW = 0.4 // px per additional point in cluster
const CLUSTER_MAX = 28   // px — max cluster radius
const RING_WIDTH = 3     // px — colored ring border
const TRANSITION_MS = 280 // ms — merge/split animation duration

const RING_COLORS: Record<PinType, string> = {
  listing: '#3B82F6',
  sold: '#34C759',
  story: '#FF6B3D',
  reel: '#A855F7',
  live: '#FF3B30',
  open_house: '#FFAA00',
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

// ── Create pin DOM element ──
function createPinEl(pin: Pin, agentPhotoUrl?: string | null): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'plot-marker'
  const color = RING_COLORS[pin.type]

  const imageUrl = 'heroPhotoUrl' in pin ? pin.heroPhotoUrl
    : 'thumbnailUrl' in pin ? pin.thumbnailUrl
    : 'mediaUrl' in pin ? pin.mediaUrl
    : agentPhotoUrl || null

  const label = pin.type === 'live' ? 'LIVE'
    : pin.type === 'open_house' ? 'OPEN'
    : ('price' in pin ? formatPrice(pin.price)
      : 'soldPrice' in pin ? formatPrice(pin.soldPrice)
      : 'listingPrice' in pin ? formatPrice(pin.listingPrice)
      : '')

  const ringBg = pin.type === 'story'
    ? 'linear-gradient(135deg, #FF6B3D, #E8522A, #FF3B7A)' : color

  const inner = PIN_DIAMETER - RING_WIDTH * 2
  const imgHtml = imageUrl
    ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" loading="lazy"/>`
    : `<div style="width:100%;height:100%;border-radius:50%;background:#1C2130;display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:${inner * 0.35}px;font-weight:700;font-family:Outfit,sans-serif;">${PIN_CONFIG[pin.type].label[0]}</span></div>`

  const labelHtml = label
    ? `<div class="plot-marker-label" style="position:absolute;top:${PIN_DIAMETER + 2}px;left:50%;transform:translateX(-50%);background:${color};color:white;font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px;white-space:nowrap;font-family:'JetBrains Mono',monospace;box-shadow:0 1px 4px ${color}40;">${label}</div>`
    : ''

  el.style.cssText = `
    width:${PIN_DIAMETER}px;height:${PIN_DIAMETER}px;cursor:pointer;
    transition:transform ${TRANSITION_MS}ms ease,opacity ${TRANSITION_MS}ms ease;
    will-change:transform,opacity;
  `
  el.innerHTML = `
    <div style="width:${PIN_DIAMETER}px;height:${PIN_DIAMETER}px;border-radius:50%;padding:${RING_WIDTH}px;background:${ringBg};box-shadow:0 2px 6px ${color}25;">
      <div style="width:${inner}px;height:${inner}px;border-radius:50%;overflow:hidden;background:#0A0E17;padding:1px;">
        <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;">${imgHtml}</div>
      </div>
    </div>
    ${labelHtml}
  `
  return el
}

// ── Create cluster DOM element ──
function createClusterEl(count: number, types: Set<string>, previewUrl?: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'plot-cluster-marker'
  const size = Math.min(CLUSTER_BASE + count * CLUSTER_GROW, CLUSTER_MAX) * 2

  // Orange ring if mixed types, else the single type's color
  const ringColor = types.size > 1 ? '#FF6B3D'
    : RING_COLORS[types.values().next().value as PinType] || '#FF6B3D'

  const inner = size - RING_WIDTH * 2
  const imgHtml = previewUrl
    ? `<img src="${previewUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" loading="lazy"/>`
    : `<div style="width:100%;height:100%;border-radius:50%;background:#1C2130;display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:${inner * 0.35}px;font-weight:800;font-family:Outfit,sans-serif;">${count}</span></div>`

  el.style.cssText = `
    width:${size}px;height:${size}px;cursor:pointer;
    transition:transform ${TRANSITION_MS}ms ease,opacity ${TRANSITION_MS}ms ease,width ${TRANSITION_MS}ms ease,height ${TRANSITION_MS}ms ease;
    will-change:transform,opacity;
  `
  el.innerHTML = `
    <div style="width:${size}px;height:${size}px;border-radius:50%;padding:${RING_WIDTH}px;background:${ringColor};box-shadow:0 2px 8px ${ringColor}30;transition:all ${TRANSITION_MS}ms ease;">
      <div style="width:${inner}px;height:${inner}px;border-radius:50%;overflow:hidden;background:#0A0E17;padding:1px;transition:all ${TRANSITION_MS}ms ease;">
        <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;">${imgHtml}</div>
      </div>
    </div>
    <div style="position:absolute;top:${size + 1}px;left:50%;transform:translateX(-50%);background:#1C2130;color:white;font-size:9px;font-weight:700;padding:1px 7px;border-radius:8px;white-space:nowrap;border:1px solid ${ringColor}30;font-family:Outfit,sans-serif;">${count} pins</div>
  `
  return el
}

// ── Types ──
type FeatureId = string // "pin-{id}" or "cluster-{clusterId}"

interface ManagedMarker {
  id: FeatureId
  marker: mapboxgl.Marker
  lngLat: [number, number]
  isCluster: boolean
}

export function MapCanvas({ pins, agentPhotoUrl, onPinClick, onMapMoved, className = '', fitToPins = true, interactive = true, showBackButton, onBack }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const fittedRef = useRef(false)
  const markersRef = useRef<Map<FeatureId, ManagedMarker>>(new Map())
  const clusterRef = useRef<Supercluster | null>(null)
  const pinsRef = useRef(pins)
  pinsRef.current = pins
  const { center, zoom } = useMapStore()

  const pinClickRef = useRef(onPinClick)
  pinClickRef.current = onPinClick

  // Build supercluster index when pins change
  useEffect(() => {
    const sc = new Supercluster({
      radius: PIN_DIAMETER + 4, // cluster when pins visually overlap (diameter + small buffer)
      maxZoom: 17,
      minPoints: 2,
    })

    const features = pins.map((pin) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [pin.coordinates.lng, pin.coordinates.lat] as [number, number],
      },
      properties: { pinId: pin.id, type: pin.type },
    }))

    sc.load(features)
    clusterRef.current = sc

    // If map is ready, re-render
    if (mapRef.current) renderMarkers(mapRef.current)
  }, [pins]) // eslint-disable-line

  // ── Core render function — diffs against existing markers ──
  const renderMarkers = useCallback((map: mapboxgl.Map) => {
    const sc = clusterRef.current
    if (!sc) return

    const bounds = map.getBounds()
    const z = Math.floor(map.getZoom())
    const clusters = sc.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      z
    )

    const currentIds = new Set<FeatureId>()
    const prevMarkers = markersRef.current

    for (const feature of clusters) {
      const coords = feature.geometry.coordinates as [number, number]
      const props = feature.properties

      if (props.cluster) {
        // ── Cluster feature ──
        const fid: FeatureId = `cluster-${props.cluster_id}`
        currentIds.add(fid)
        const count = props.point_count

        // Collect types in this cluster
        const leaves = sc.getLeaves(props.cluster_id, Infinity)
        const types = new Set(leaves.map((l: any) => l.properties.type))

        // Find a preview image from the first leaf
        const firstLeaf = leaves[0]
        const firstPin = firstLeaf ? pinsRef.current.find((p) => p.id === firstLeaf.properties.pinId) : null
        const previewUrl = firstPin
          ? ('heroPhotoUrl' in firstPin ? firstPin.heroPhotoUrl
            : 'thumbnailUrl' in firstPin ? firstPin.thumbnailUrl
            : 'mediaUrl' in firstPin ? firstPin.mediaUrl
            : agentPhotoUrl || undefined)
          : agentPhotoUrl || undefined

        const existing = prevMarkers.get(fid)
        if (existing) {
          // Update position smoothly
          existing.marker.setLngLat(coords)
          existing.lngLat = coords
        } else {
          // New cluster — check if any of its children had a marker (merge animation)
          const el = createClusterEl(count, types, previewUrl)

          // Start with scale 0 for merge-in effect
          el.style.opacity = '0'
          el.style.transform = 'scale(0.6)'

          el.addEventListener('click', (e) => {
            e.stopPropagation()
            const expansionZoom = sc.getClusterExpansionZoom(props.cluster_id)
            map.easeTo({ center: coords, zoom: expansionZoom, duration: 400 })
          })

          const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat(coords)
            .addTo(map)

          prevMarkers.set(fid, { id: fid, marker, lngLat: coords, isCluster: true })

          // Animate in
          requestAnimationFrame(() => {
            el.style.opacity = '1'
            el.style.transform = 'scale(1)'
          })
        }
      } else {
        // ── Individual pin feature ──
        const pinId = props.pinId
        const fid: FeatureId = `pin-${pinId}`
        currentIds.add(fid)

        const pin = pinsRef.current.find((p) => p.id === pinId)
        if (!pin) continue

        const existing = prevMarkers.get(fid)
        if (existing) {
          // Already exists — just update position (shouldn't change, but safe)
          existing.marker.setLngLat(coords)
        } else {
          // New individual pin — might be splitting from a cluster
          const el = createPinEl(pin, agentPhotoUrl)

          // Start small for split-out effect
          el.style.opacity = '0'
          el.style.transform = 'scale(0.5)'

          el.addEventListener('click', (e) => {
            e.stopPropagation()
            pinClickRef.current?.(pin)
          })

          const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat(coords)
            .addTo(map)

          prevMarkers.set(fid, { id: fid, marker, lngLat: coords, isCluster: false })

          // Animate in
          requestAnimationFrame(() => {
            el.style.opacity = '1'
            el.style.transform = 'scale(1)'
          })
        }
      }
    }

    // ── Remove markers no longer in view / now clustered ──
    for (const [fid, managed] of prevMarkers) {
      if (!currentIds.has(fid)) {
        // Animate out
        const el = managed.marker.getElement()
        el.style.opacity = '0'
        el.style.transform = 'scale(0.5)'

        setTimeout(() => {
          managed.marker.remove()
          prevMarkers.delete(fid)
        }, TRANSITION_MS)
      }
    }
  }, [agentPhotoUrl])

  // ── Init map ──
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center,
      zoom,
      attributionControl: false,
      interactive,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      minZoom: 3,
      maxZoom: 18,
      fadeDuration: 0,
    })

    // Remove weather layers
    map.on('style.load', () => {
      const style = map.getStyle()
      if (style?.layers) {
        for (const layer of style.layers) {
          const id = layer.id.toLowerCase()
          if (id.includes('rain') || id.includes('snow') || id.includes('precip') ||
              id.includes('weather') || id.includes('particle') || id.includes('fog') ||
              id.includes('haze') || id.includes('cloud') || id.includes('storm')) {
            try { map.removeLayer(layer.id) } catch {}
          }
        }
      }
      if (style?.sources) {
        for (const srcId of Object.keys(style.sources)) {
          const sid = srcId.toLowerCase()
          if (sid.includes('weather') || sid.includes('precip') || sid.includes('rain') || sid.includes('snow')) {
            try { map.removeSource(srcId) } catch {}
          }
        }
      }
    })

    map.on('load', () => {
      // Fit to pins on first load
      if (fitToPins && pinsRef.current.length > 0 && !fittedRef.current) {
        fittedRef.current = true
        const coords = pinsRef.current.map((p) => p.coordinates)
        if (coords.length === 1) {
          map.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 800 })
        } else {
          map.fitBounds(getBounds(coords), { padding: 80, duration: 800 })
        }
      }

      // Initial render after a short delay for fit animation
      setTimeout(() => renderMarkers(map), 900)
    })

    // Re-render on map movement (zoom, pan) — only on idle (after animation settles)
    map.on('idle', () => renderMarkers(map))
    map.on('moveend', () => onMapMoved?.())

    mapRef.current = map
    return () => {
      // Clean up all markers
      for (const [, managed] of markersRef.current) {
        managed.marker.remove()
      }
      markersRef.current.clear()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line

  // ── Fit to specific pins (called from filter change) ──
  const fitTo = useCallback((targetPins: Pin[]) => {
    const map = mapRef.current
    if (!map || targetPins.length === 0) return
    const coords = targetPins.map((p) => p.coordinates)
    if (coords.length === 1) {
      map.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 600 })
    } else {
      map.fitBounds(getBounds(coords), { padding: 80, duration: 600 })
    }
  }, [])

  useEffect(() => {
    if (mapContainer.current) {
      (mapContainer.current as any).__plotFitTo = fitTo
    }
  }, [fitTo])

  return (
    <div className={`relative w-full h-full touch-none ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          className="absolute bottom-[calc(env(safe-area-inset-bottom,8px)+20px)] left-4 z-50 bg-white/90 backdrop-blur-md rounded-full px-4 py-2.5 text-[13px] font-semibold text-ink shadow-lg border border-black/5"
        >
          Exit Preview
        </button>
      )}
    </div>
  )
}
