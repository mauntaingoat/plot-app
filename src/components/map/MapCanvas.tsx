import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useMapStore } from '@/stores/mapStore'
import { formatPrice, getBounds } from '@/lib/firestore'
import { PIN_CONFIG, type Pin, type PinType } from '@/lib/types'

const MAPBOX_STYLE = 'mapbox://styles/mauntaingoat/cmndhmm7m000h01s5b0pvf9zx'
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

const PIN_SIZE = 40
const RING_PAD = 6

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
  return {
    type: 'FeatureCollection' as const,
    features: pins.map((pin) => {
      const price = 'price' in pin ? pin.price : 'soldPrice' in pin ? pin.soldPrice : 'listingPrice' in pin ? pin.listingPrice : 0
      const priceK = price >= 1_000_000 ? `$${(price / 1_000_000).toFixed(1)}M` : price >= 1_000 ? `$${(price / 1_000).toFixed(0)}K` : price > 0 ? `$${price}` : ''
      const imageUrl = 'heroPhotoUrl' in pin ? pin.heroPhotoUrl : 'thumbnailUrl' in pin ? pin.thumbnailUrl : 'mediaUrl' in pin ? pin.mediaUrl : ''
      return {
        type: 'Feature' as const, id: pin.id,
        geometry: { type: 'Point' as const, coordinates: [pin.coordinates.lng, pin.coordinates.lat] },
        properties: {
          id: pin.id, type: pin.type, imageUrl: imageUrl || '',
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
      const imgId = `pin-img-${pin.id}`
      if (loadedImagesRef.current.has(imgId)) continue
      const imageUrl = 'heroPhotoUrl' in pin ? pin.heroPhotoUrl : 'thumbnailUrl' in pin ? pin.thumbnailUrl : 'mediaUrl' in pin ? pin.mediaUrl : ''
      const color = pin.type === 'story' ? '#FF6B3D' : RING_COLORS[pin.type]
      const letter = PIN_CONFIG[pin.type].label[0]
      let img: HTMLImageElement | null = null
      if (imageUrl) img = await loadImage(imageUrl).catch(() => null)
      if (!img && agentImg) img = agentImg
      const imageData = createPinImage(img, color, letter)
      if (!map.hasImage(imgId)) {
        map.addImage(imgId, imageData, { pixelRatio: 2 })
        loadedImagesRef.current.add(imgId)
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

      // Use clusterProperties to carry the first pin's ID into the cluster
      // "firstPinId" will hold the ID of one of the pins in the cluster
      map.addSource('pins', {
        type: 'geojson',
        data: pinsToGeoJSON(pinsRef.current) as GeoJSON.FeatureCollection,
        cluster: true, clusterMaxZoom: 16, clusterRadius: 30,
        clusterProperties: {
          firstPinId: [
            // Reducer: keep the accumulated value (first one wins)
            ['coalesce', ['accumulated'], ['get', 'firstPinId']],
            // Mapper: each feature contributes its id
            ['get', 'id'],
          ],
        },
      })

      // ── Cluster icon — reuses the first pin's already-loaded image ──
      map.addLayer({
        id: 'cluster-icons',
        type: 'symbol',
        source: 'pins',
        filter: ['has', 'point_count'],
        layout: {
          // Use the first pin's image (already loaded as pin-img-{id})
          'icon-image': ['concat', 'pin-img-', ['get', 'firstPinId']],
          'icon-size': [
            'interpolate', ['linear'], ['get', 'point_count'],
            2, 0.9, 10, 1.0, 50, 1.1,
          ],
          'icon-allow-overlap': true,
        },
      })

      // ── "+X more" label below cluster ──
      map.addLayer({
        id: 'cluster-label',
        type: 'symbol',
        source: 'pins',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['concat', '+', ['to-string', ['-', ['get', 'point_count'], 1]], ' more'],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 9,
          'text-offset': [0, 2.2],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#1C2130',
          'text-halo-width': 4,
          'text-halo-blur': 1,
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
