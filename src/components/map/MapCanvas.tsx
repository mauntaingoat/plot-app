import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useMapStore } from '@/stores/mapStore'
import { formatPrice, getBounds } from '@/lib/firestore'
import { PIN_CONFIG, type Pin, type PinType } from '@/lib/types'

const MAPBOX_STYLE = 'mapbox://styles/mauntaingoat/cmndhmm7m000h01s5b0pvf9zx'
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

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

const RING_COLORS: Record<PinType, string> = {
  listing: '#3B82F6',
  sold: '#34C759',
  story: '#FF6B3D',
  reel: '#A855F7',
  live: '#FF3B30',
  open_house: '#FFAA00',
}

function createPinElement(pin: Pin, agentPhotoUrl?: string | null): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'plot-pin'
  const color = RING_COLORS[pin.type]
  const hasImage = ('heroPhotoUrl' in pin && pin.heroPhotoUrl)
    || ('thumbnailUrl' in pin && pin.thumbnailUrl)
    || ('mediaUrl' in pin && pin.mediaUrl && pin.type === 'story')
  const imageUrl = 'heroPhotoUrl' in pin ? pin.heroPhotoUrl
    : 'thumbnailUrl' in pin ? pin.thumbnailUrl
    : 'mediaUrl' in pin ? pin.mediaUrl
    : null

  const size = pin.type === 'story' || pin.type === 'reel' ? 48 : 42
  const ringWidth = 3
  const priceLabel = 'price' in pin ? formatPrice(pin.price)
    : 'soldPrice' in pin ? formatPrice(pin.soldPrice)
    : 'listingPrice' in pin ? formatPrice(pin.listingPrice)
    : null

  const isLive = pin.type === 'live'
  const isOpenHouse = pin.type === 'open_house'
  const statusLabel = isLive ? 'LIVE' : isOpenHouse ? 'OPEN' : null
  const statusColor = isLive ? '#FF3B30' : '#FFAA00'
  const extraHeight = (priceLabel && !isOpenHouse ? 20 : 0) + (statusLabel ? 18 : 0)

  el.style.cssText = `width:${size}px;height:${size + extraHeight}px;cursor:pointer;position:relative;pointer-events:auto;`

  const innerSize = size - ringWidth * 2
  const imgHtml = hasImage && imageUrl
    ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" loading="lazy" />`
    : agentPhotoUrl
      ? `<img src="${agentPhotoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" loading="lazy" />`
      : `<div style="width:100%;height:100%;border-radius:50%;background:#1C2130;display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:${innerSize * 0.4}px;font-weight:700;">${PIN_CONFIG[pin.type].label[0]}</span></div>`

  const ringBg = pin.type === 'story'
    ? 'linear-gradient(135deg, #FF6B3D, #E8522A, #FF3B7A)'
    : color

  const statusHtml = statusLabel
    ? `<div style="position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);background:${statusColor};color:white;font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;white-space:nowrap;letter-spacing:0.5px;font-family:'Outfit',sans-serif;">${statusLabel}</div>`
    : ''

  const priceHtml = priceLabel && !isOpenHouse
    ? `<div style="position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);background:${color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;font-family:'JetBrains Mono',monospace;box-shadow:0 2px 8px ${color}40;">${priceLabel}</div>`
    : ''

  el.innerHTML = `
    <div style="width:${size}px;height:${size}px;border-radius:50%;padding:${ringWidth}px;background:${ringBg};position:relative;box-shadow:0 2px 8px ${color}30;">
      <div style="width:${innerSize}px;height:${innerSize}px;border-radius:50%;overflow:hidden;background:#0A0E17;padding:1.5px;">
        <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;">${imgHtml}</div>
      </div>
    </div>
    ${statusHtml}${priceHtml}
  `
  return el
}

function createClusterElement(count: number, previewUrl?: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'plot-cluster'
  const size = 52
  el.style.cssText = `width:${size}px;height:${size + 20}px;cursor:pointer;position:relative;pointer-events:auto;`

  const imgHtml = previewUrl
    ? `<img src="${previewUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" loading="lazy" />`
    : `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#FF6B3D,#E8522A);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:16px;font-weight:800;">${count}</span></div>`

  el.innerHTML = `
    <div style="width:${size}px;height:${size}px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#FF6B3D,#E8522A);box-shadow:0 2px 14px rgba(255,107,61,0.3);">
      <div style="width:${size - 6}px;height:${size - 6}px;border-radius:50%;overflow:hidden;background:#0A0E17;padding:1.5px;">
        <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;">${imgHtml}</div>
      </div>
    </div>
    <div style="position:absolute;top:${size - 4}px;left:50%;transform:translateX(-50%);background:#1C2130;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;border:1.5px solid rgba(255,107,61,0.25);font-family:'Outfit',sans-serif;">+${count - 1} more</div>
  `
  return el
}

export function MapCanvas({ pins, agentPhotoUrl, onPinClick, onMapMoved, className = '', fitToPins = true, interactive = true, showBackButton, onBack }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const fittedRef = useRef(false)
  const { center, zoom } = useMapStore()

  // Init map
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
    })

    // Disable weather/precipitation layers once style loads
    map.on('style.load', () => {
      const style = map.getStyle()
      if (style?.layers) {
        for (const layer of style.layers) {
          const id = layer.id.toLowerCase()
          if (id.includes('rain') || id.includes('snow') || id.includes('precip') || id.includes('weather') || id.includes('particle')) {
            map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        }
      }
    })

    map.on('moveend', () => onMapMoved?.())

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, []) // eslint-disable-line

  // Stable pin click handler
  const pinClickRef = useRef(onPinClick)
  pinClickRef.current = onPinClick

  // Update markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const renderMarkers = () => {
      // Clear old
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      if (pins.length === 0) return

      // Pixel-based clustering: project all pins to screen, group by proximity
      const CLUSTER_RADIUS_PX = 55 // pins within 55px of each other cluster
      const projected = pins.map((pin) => {
        const pt = map.project([pin.coordinates.lng, pin.coordinates.lat])
        return { pin, x: pt.x, y: pt.y }
      })

      const clusters: { pins: Pin[]; cx: number; cy: number }[] = []
      const used = new Set<string>()

      for (const item of projected) {
        if (used.has(item.pin.id)) continue
        const group = [item.pin]
        let cx = item.x, cy = item.y
        used.add(item.pin.id)

        for (const other of projected) {
          if (used.has(other.pin.id)) continue
          const dx = cx / group.length - other.x
          const dy = cy / group.length - other.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CLUSTER_RADIUS_PX) {
            group.push(other.pin)
            cx += other.x
            cy += other.y
            used.add(other.pin.id)
          }
        }
        clusters.push({ pins: group, cx: cx / group.length, cy: cy / group.length })
      }

      const zoomLevel = map.getZoom()

      for (const cluster of clusters) {
        if (cluster.pins.length === 1) {
          const pin = cluster.pins[0]
          const el = createPinElement(pin, agentPhotoUrl)
          el.addEventListener('click', (e) => { e.stopPropagation(); pinClickRef.current?.(pin) })
          const m = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([pin.coordinates.lng, pin.coordinates.lat]).addTo(map)
          markersRef.current.push(m)
        } else {
          // Cluster marker at average lnglat
          const avgLat = cluster.pins.reduce((s, p) => s + p.coordinates.lat, 0) / cluster.pins.length
          const avgLng = cluster.pins.reduce((s, p) => s + p.coordinates.lng, 0) / cluster.pins.length
          const preview = cluster.pins[0]
          const url = 'heroPhotoUrl' in preview ? preview.heroPhotoUrl : 'thumbnailUrl' in preview ? preview.thumbnailUrl : agentPhotoUrl || undefined
          const el = createClusterElement(cluster.pins.length, url || undefined)
          el.addEventListener('click', (e) => {
            e.stopPropagation()
            map.easeTo({ center: [avgLng, avgLat], zoom: Math.min(zoomLevel + 2.5, 18), duration: 400 })
          })
          const m = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([avgLng, avgLat]).addTo(map)
          markersRef.current.push(m)
        }
      }
    }

    // Fit to pins on first load or when pins change
    const fitAndRender = () => {
      if (fitToPins && pins.length > 0 && !fittedRef.current) {
        fittedRef.current = true
        const coords = pins.map((p) => p.coordinates)
        if (coords.length === 1) {
          map.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 800 })
        } else {
          map.fitBounds(getBounds(coords), { padding: 80, duration: 800 })
        }
      }
      renderMarkers()
    }

    if (map.isStyleLoaded()) {
      fitAndRender()
    } else {
      map.once('load', fitAndRender)
    }

    // Re-render on zoom (for clustering)
    const onZoomEnd = () => renderMarkers()
    map.on('zoomend', onZoomEnd)
    return () => { map.off('zoomend', onZoomEnd) }
  }, [pins, agentPhotoUrl, fitToPins])

  // Public method: fit to specific pins
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

  // Expose fitTo via ref on the container
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
          className="absolute bottom-[calc(env(safe-area-inset-bottom,8px)+100px)] left-4 z-50 bg-white/90 backdrop-blur-md rounded-full px-4 py-2.5 text-[13px] font-semibold text-ink shadow-lg border border-black/5"
        >
          Exit Preview
        </button>
      )}
    </div>
  )
}
