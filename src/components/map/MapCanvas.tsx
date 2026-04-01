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
  listing: '#3B82F6', sold: '#34C759', story: '#FF6B3D',
  reel: '#A855F7', live: '#FF3B30', open_house: '#FFAA00',
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

      const price = 'price' in pin ? pin.price : 'soldPrice' in pin ? pin.soldPrice : 'listingPrice' in pin ? pin.listingPrice : 0
      const priceK = price >= 1_000_000 ? `$${(price / 1_000_000).toFixed(1)}M` : price >= 1_000 ? `$${(price / 1_000).toFixed(0)}K` : price > 0 ? `$${price}` : ''
      return {
        type: 'Feature' as const, id: pin.id,
        geometry: { type: 'Point' as const, coordinates: [lng, lat] },
        properties: {
          id: pin.id, type: pin.type,
          label: pin.type === 'live' ? 'LIVE' : pin.type === 'open_house' ? 'OPEN' : pin.type === 'sold' ? 'SOLD' : priceK || '',
        },
      }
    }),
  }
}

function createPinImage(img: HTMLImageElement | null, ringColor: string, fallbackLetter: string, size: number = PIN_SIZE + RING_PAD): ImageData {
  const canvas = document.createElement('canvas')
  const s = size * 2
  canvas.width = s; canvas.height = s
  const ctx = canvas.getContext('2d')!
  const cx = s / 2, cy = s / 2, outerR = s / 2
  const ringW = (RING_PAD / 2) * 2, innerR = outerR - ringW
  ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2); ctx.fillStyle = ringColor; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fillStyle = '#0A0E17'; ctx.fill()
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2); ctx.clip()
    const imgSize = (innerR - 2) * 2
    ctx.drawImage(img, cx - innerR + 2, cy - innerR + 2, imgSize, imgSize)
    ctx.restore()
  } else if (fallbackLetter) {
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${innerR * 0.7}px Outfit, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fallbackLetter, cx, cy)
  }
  return ctx.getImageData(0, 0, s, s)
}

// Create a pill-shaped badge image for "+X more"
function createBadgeImage(text: string): ImageData {
  const canvas = document.createElement('canvas')
  const scale = 2
  // Measure text
  const tmpCtx = canvas.getContext('2d')!
  tmpCtx.font = `bold ${10 * scale}px Outfit, sans-serif`
  const textW = tmpCtx.measureText(text).width
  const padX = 8 * scale, padY = 4 * scale
  const w = textW + padX * 2, h = 14 * scale + padY * 2
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  // Pill background (tangerine)
  const r = h / 2
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.fillStyle = TANGERINE; ctx.fill()
  // Text (white)
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${10 * scale}px Outfit, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2)
  return ctx.getImageData(0, 0, w, h)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img); img.onerror = reject; img.src = url
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

  const loadPinImages = useCallback(async (map: mapboxgl.Map, pinList: Pin[]) => {
    const agentImg = agentPhotoUrl ? await loadImage(agentPhotoUrl).catch(() => null) : null
    for (const pin of pinList) {
      const imageUrl = 'heroPhotoUrl' in pin ? pin.heroPhotoUrl : 'thumbnailUrl' in pin ? pin.thumbnailUrl : 'mediaUrl' in pin ? pin.mediaUrl : ''
      const color = pin.type === 'story' ? '#FF6B3D' : RING_COLORS[pin.type]
      const letter = PIN_CONFIG[pin.type].label[0]
      let img: HTMLImageElement | null = null
      if (imageUrl) img = await loadImage(imageUrl).catch(() => null)
      if (!img && agentImg) img = agentImg

      // Type-colored ring version (for individual pins)
      const imgId = `pin-img-${pin.id}`
      if (!loadedImagesRef.current.has(imgId)) {
        const imageData = createPinImage(img, color, letter)
        if (!map.hasImage(imgId)) { map.addImage(imgId, imageData, { pixelRatio: 2 }); loadedImagesRef.current.add(imgId) }
      }

      // Orange ring version (for mixed-type clusters)
      const orangeId = `pin-img-orange-${pin.id}`
      if (!loadedImagesRef.current.has(orangeId)) {
        const orangeData = createPinImage(img, TANGERINE, letter)
        if (!map.hasImage(orangeId)) { map.addImage(orangeId, orangeData, { pixelRatio: 2 }); loadedImagesRef.current.add(orangeId) }
      }
    }

    // Pre-render badge images for common counts
    for (let i = 1; i <= 20; i++) {
      const badgeId = `badge-${i}`
      if (!loadedImagesRef.current.has(badgeId)) {
        const badgeData = createBadgeImage(`+${i} more`)
        if (!map.hasImage(badgeId)) { map.addImage(badgeId, badgeData, { pixelRatio: 2 }); loadedImagesRef.current.add(badgeId) }
      }
    }
  }, [agentPhotoUrl])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    const map = new mapboxgl.Map({
      container: mapContainer.current, style: MAPBOX_STYLE, center, zoom,
      attributionControl: false, interactive, pitchWithRotate: false,
      dragRotate: false, touchPitch: false, minZoom: 3, maxZoom: 18, fadeDuration: 0,
    })

    map.on('style.load', () => {
      const style = map.getStyle()
      if (style?.layers) {
        for (const layer of style.layers) {
          const id = layer.id.toLowerCase()
          if (id.includes('rain') || id.includes('snow') || id.includes('precip') || id.includes('weather') || id.includes('particle') || id.includes('fog') || id.includes('haze') || id.includes('cloud') || id.includes('storm'))
            try { map.removeLayer(layer.id) } catch {}
        }
      }
    })

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
            2, 0.9, 10, 1.0, 50, 1.1,
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

      // ── Price/status labels ──
      map.addLayer({
        id: 'pin-labels',
        type: 'symbol',
        source: 'pins',
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'label'], '']],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 10, 'text-offset': [0, 2.0], 'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': [
            'match', ['get', 'type'],
            'listing', '#3B82F6', 'sold', '#34C759', 'live', '#FF3B30', 'open_house', '#FFAA00', '#FF6B3D',
          ],
          'text-halo-width': 5, 'text-halo-blur': 1,
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
    })

    map.on('moveend', () => onMapMoved?.())
    mapRef.current = map
    return () => { loadedImagesRef.current.clear(); map.remove(); mapRef.current = null }
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
