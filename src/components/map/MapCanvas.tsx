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
  className?: string
  fitToPins?: boolean
  interactive?: boolean
  showBackButton?: boolean
  onBack?: () => void
}

// Ring colors per pin type
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
  const isLive = pin.type === 'live'
  const isOpenHouse = pin.type === 'open_house'
  const hasImage = 'heroPhotoUrl' in pin && pin.heroPhotoUrl
    || 'thumbnailUrl' in pin && pin.thumbnailUrl
    || 'mediaUrl' in pin && pin.mediaUrl && pin.type === 'story'
  const imageUrl = 'heroPhotoUrl' in pin ? pin.heroPhotoUrl
    : 'thumbnailUrl' in pin ? pin.thumbnailUrl
    : 'mediaUrl' in pin ? pin.mediaUrl
    : null

  const size = pin.type === 'story' || pin.type === 'reel' ? 48 : 42
  const ringWidth = 3

  // Price label for listings/sold
  const priceLabel = 'price' in pin ? formatPrice(pin.price)
    : 'soldPrice' in pin ? formatPrice(pin.soldPrice)
    : 'listingPrice' in pin ? formatPrice(pin.listingPrice)
    : null

  el.style.cssText = `width:${size}px;height:${size + (priceLabel ? 20 : 0) + ((isLive || isOpenHouse) ? 18 : 0)}px;cursor:pointer;position:relative;`

  // Pulse ring for live/open house
  const pulseHtml = (isLive || isOpenHouse) ? `
    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:0.3;animation:pulse-live 2s ease-in-out infinite;"></div>
  ` : ''

  // Main circle
  const innerSize = size - ringWidth * 2
  const imgHtml = hasImage && imageUrl
    ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : agentPhotoUrl
      ? `<img src="${agentPhotoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
      : `<div style="width:100%;height:100%;border-radius:50%;background:#1C2130;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:${innerSize * 0.4}px;font-weight:700;">${PIN_CONFIG[pin.type].label[0]}</span>
        </div>`

  // Status label for live/open house
  const statusHtml = isLive
    ? `<div style="position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);background:#FF3B30;color:white;font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;white-space:nowrap;letter-spacing:0.5px;">LIVE</div>`
    : isOpenHouse
      ? `<div style="position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);background:#FFAA00;color:white;font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;white-space:nowrap;letter-spacing:0.5px;">OPEN</div>`
      : ''

  // Price pill for listings/sold
  const priceHtml = priceLabel && !isOpenHouse
    ? `<div style="position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);background:${color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;font-family:'JetBrains Mono',monospace;box-shadow:0 2px 8px ${color}60;">${priceLabel}</div>`
    : ''

  el.innerHTML = `
    ${pulseHtml}
    <div style="width:${size}px;height:${size}px;border-radius:50%;padding:${ringWidth}px;background:${pin.type === 'story' ? 'linear-gradient(135deg, #FF6B3D, #E8522A, #FF3B7A)' : color};position:relative;box-shadow:0 2px 10px ${color}40;">
      <div style="width:${innerSize}px;height:${innerSize}px;border-radius:50%;overflow:hidden;background:#0A0E17;padding:1.5px;">
        <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;">
          ${imgHtml}
        </div>
      </div>
    </div>
    ${statusHtml}
    ${priceHtml}
  `

  return el
}

function createClusterElement(count: number, previewUrl?: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'plot-cluster'

  const size = 52
  el.style.cssText = `width:${size}px;height:${size + 20}px;cursor:pointer;position:relative;`

  const imgHtml = previewUrl
    ? `<img src="${previewUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#FF6B3D,#E8522A);display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:16px;font-weight:800;">${count}</span>
      </div>`

  el.innerHTML = `
    <div style="width:${size}px;height:${size}px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#FF6B3D,#E8522A);box-shadow:0 2px 14px rgba(255,107,61,0.4);">
      <div style="width:${size - 6}px;height:${size - 6}px;border-radius:50%;overflow:hidden;background:#0A0E17;padding:1.5px;">
        <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;">
          ${imgHtml}
        </div>
      </div>
    </div>
    <div style="position:absolute;top:${size - 6}px;left:50%;transform:translateX(-50%);background:#1C2130;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;border:1.5px solid rgba(255,107,61,0.3);">+${count - 1} more</div>
  `

  return el
}

export function MapCanvas({ pins, agentPhotoUrl, onPinClick, className = '', fitToPins = true, interactive = true, showBackButton, onBack }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const { center, zoom, setCenter, setZoom } = useMapStore()

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: center,
      zoom: zoom,
      attributionControl: false,
      logoPosition: 'bottom-left',
      interactive,
      pitchWithRotate: false,
    })

    map.on('moveend', () => {
      const c = map.getCenter()
      setCenter([c.lng, c.lat])
      setZoom(map.getZoom())
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line

  // Update markers when pins change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Wait for style to load
    const update = () => {
      // Clear old markers
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      // Simple client-side clustering
      const zoomLevel = map.getZoom()
      const shouldCluster = zoomLevel < 13 && pins.length > 3

      if (shouldCluster) {
        // Group pins by proximity
        const clusters: { pins: Pin[]; center: { lat: number; lng: number } }[] = []
        const used = new Set<string>()
        const threshold = 0.01 * Math.pow(2, 14 - zoomLevel) // adaptive threshold

        for (const pin of pins) {
          if (used.has(pin.id)) continue
          const cluster: Pin[] = [pin]
          used.add(pin.id)

          for (const other of pins) {
            if (used.has(other.id)) continue
            const dist = Math.abs(pin.coordinates.lat - other.coordinates.lat) + Math.abs(pin.coordinates.lng - other.coordinates.lng)
            if (dist < threshold) {
              cluster.push(other)
              used.add(other.id)
            }
          }

          const avgLat = cluster.reduce((s, p) => s + p.coordinates.lat, 0) / cluster.length
          const avgLng = cluster.reduce((s, p) => s + p.coordinates.lng, 0) / cluster.length
          clusters.push({ pins: cluster, center: { lat: avgLat, lng: avgLng } })
        }

        for (const cluster of clusters) {
          if (cluster.pins.length === 1) {
            // Single pin
            const pin = cluster.pins[0]
            const el = createPinElement(pin, agentPhotoUrl)
            el.addEventListener('click', (e) => { e.stopPropagation(); onPinClick?.(pin) })
            const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
              .setLngLat([pin.coordinates.lng, pin.coordinates.lat])
              .addTo(map)
            markersRef.current.push(marker)
          } else {
            // Cluster
            const previewPin = cluster.pins[0]
            const previewUrl = 'heroPhotoUrl' in previewPin ? previewPin.heroPhotoUrl
              : 'thumbnailUrl' in previewPin ? previewPin.thumbnailUrl
              : agentPhotoUrl || undefined
            const el = createClusterElement(cluster.pins.length, previewUrl || undefined)
            el.addEventListener('click', (e) => {
              e.stopPropagation()
              map.easeTo({ center: [cluster.center.lng, cluster.center.lat], zoom: Math.min(zoomLevel + 2, 18) })
            })
            const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
              .setLngLat([cluster.center.lng, cluster.center.lat])
              .addTo(map)
            markersRef.current.push(marker)
          }
        }
      } else {
        // No clustering — individual markers
        for (const pin of pins) {
          const el = createPinElement(pin, agentPhotoUrl)
          el.addEventListener('click', (e) => { e.stopPropagation(); onPinClick?.(pin) })
          const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([pin.coordinates.lng, pin.coordinates.lat])
            .addTo(map)
          markersRef.current.push(marker)
        }
      }

      // Fit to pins
      if (fitToPins && pins.length > 0) {
        const coords = pins.map((p) => p.coordinates)
        if (coords.length === 1) {
          map.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 800 })
        } else {
          const bounds = getBounds(coords)
          map.fitBounds(bounds, { padding: 80, duration: 800 })
        }
      }
    }

    if (map.isStyleLoaded()) {
      update()
    } else {
      map.on('load', update)
    }

    // Re-cluster on zoom
    const onZoom = () => {
      // Debounce re-render
      clearTimeout((map as any)._plotTimeout)
      ;(map as any)._plotTimeout = setTimeout(update, 200)
    }
    map.on('zoomend', onZoom)

    return () => {
      map.off('zoomend', onZoom)
    }
  }, [pins, agentPhotoUrl, fitToPins, onPinClick])

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          className="absolute top-[calc(env(safe-area-inset-top,12px)+60px)] left-4 z-50 glass-heavy rounded-full px-4 py-2 text-[13px] font-semibold text-white"
        >
          Exit Preview
        </button>
      )}
    </div>
  )
}
