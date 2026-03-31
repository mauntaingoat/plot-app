import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useMapStore } from '@/stores/mapStore'
import { getBounds } from '@/lib/firestore'
import { type Pin, type PinType } from '@/lib/types'

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

function pinsToGeoJSON(pins: Pin[]) {
  return {
    type: 'FeatureCollection' as const,
    features: pins.map((pin) => {
      const price = 'price' in pin ? pin.price
        : 'soldPrice' in pin ? pin.soldPrice
        : 'listingPrice' in pin ? pin.listingPrice
        : 0
      const priceK = price >= 1_000_000 ? `$${(price / 1_000_000).toFixed(1)}M`
        : price >= 1_000 ? `$${(price / 1_000).toFixed(0)}K`
        : price > 0 ? `$${price}` : ''
      return {
        type: 'Feature' as const,
        id: pin.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [pin.coordinates.lng, pin.coordinates.lat],
        },
        properties: {
          id: pin.id,
          type: pin.type,
          price: priceK,
          label: pin.type === 'live' ? 'LIVE'
            : pin.type === 'open_house' ? 'OPEN'
            : pin.type === 'sold' ? 'SOLD'
            : priceK || '',
        },
      }
    }),
  }
}

const PIN_COLORS: Record<PinType, string> = {
  listing: '#3B82F6',
  sold: '#34C759',
  story: '#FF6B3D',
  reel: '#A855F7',
  live: '#FF3B30',
  open_house: '#FFAA00',
}

export function MapCanvas({ pins, agentPhotoUrl, onPinClick, onMapMoved, className = '', fitToPins = true, interactive = true, showBackButton, onBack }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const fittedRef = useRef(false)
  const pinsRef = useRef(pins)
  pinsRef.current = pins
  const { center, zoom } = useMapStore()

  const pinClickRef = useRef(onPinClick)
  pinClickRef.current = onPinClick

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

    map.on('style.load', () => {
      // Remove weather layers
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
      // GeoJSON source with built-in clustering
      map.addSource('pins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 45,
      })

      // Cluster circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'pins',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#FF6B3D',
          'circle-radius': ['step', ['get', 'point_count'], 22, 5, 28, 15, 34],
          'circle-opacity': 0.92,
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255, 107, 61, 0.25)',
        },
      })

      // Cluster count label
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'pins',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 13,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      // Individual pin circles (unclustered)
      map.addLayer({
        id: 'pin-circles',
        type: 'circle',
        source: 'pins',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match', ['get', 'type'],
            'listing', '#3B82F6',
            'sold', '#34C759',
            'story', '#FF6B3D',
            'reel', '#A855F7',
            'live', '#FF3B30',
            'open_house', '#FFAA00',
            '#FF6B3D',
          ],
          'circle-radius': [
            'match', ['get', 'type'],
            'story', 16,
            'reel', 14,
            'live', 14,
            10,
          ],
          'circle-opacity': 0.92,
          'circle-stroke-width': [
            'match', ['get', 'type'],
            'story', 3,
            'live', 3,
            2,
          ],
          'circle-stroke-color': [
            'match', ['get', 'type'],
            'story', '#E8522A',
            'live', 'rgba(255, 59, 48, 0.35)',
            'open_house', 'rgba(255, 170, 0, 0.35)',
            'rgba(255, 255, 255, 0.15)',
          ],
        },
      })

      // Pin type icon letter inside circle
      map.addLayer({
        id: 'pin-icons',
        type: 'symbol',
        source: 'pins',
        filter: ['all',
          ['!', ['has', 'point_count']],
          ['in', ['get', 'type'], ['literal', ['story', 'reel', 'live']]],
        ],
        layout: {
          'text-field': [
            'match', ['get', 'type'],
            'story', 'S',
            'reel', 'R',
            'live', 'L',
            '',
          ],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      // Price/status labels above pins
      map.addLayer({
        id: 'pin-labels',
        type: 'symbol',
        source: 'pins',
        filter: ['all',
          ['!', ['has', 'point_count']],
          ['!=', ['get', 'label'], ''],
        ],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-offset': [0, -2.2],
          'text-anchor': 'bottom',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': [
            'match', ['get', 'type'],
            'listing', '#3B82F6',
            'sold', '#34C759',
            'live', '#FF3B30',
            'open_house', '#FFAA00',
            '#FF6B3D',
          ],
          'text-halo-width': 6,
          'text-halo-blur': 1,
        },
      })

      // Click handlers
      map.on('click', 'pin-circles', (e) => {
        if (!e.features?.length) return
        const pinId = e.features[0].properties?.id
        if (pinId) {
          const pin = pinsRef.current.find((p) => p.id === pinId)
          if (pin) pinClickRef.current?.(pin)
        }
      })

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        if (!features.length) return
        const clusterId = features[0].properties?.cluster_id
        const source = map.getSource('pins') as mapboxgl.GeoJSONSource
        source.getClusterExpansionZoom(clusterId, (err, z) => {
          if (err || !features[0].geometry || features[0].geometry.type !== 'Point') return
          map.easeTo({
            center: features[0].geometry.coordinates as [number, number],
            zoom: z!,
            duration: 400,
          })
        })
      })

      // Cursors
      map.on('mouseenter', 'pin-circles', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'pin-circles', () => { map.getCanvas().style.cursor = '' })
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })

      // Initial data load
      updateSource(map, pinsRef.current)

      // Fit to pins
      if (fitToPins && pinsRef.current.length > 0) {
        const coords = pinsRef.current.map((p) => p.coordinates)
        if (coords.length === 1) {
          map.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 800 })
        } else {
          map.fitBounds(getBounds(coords), { padding: 80, duration: 800 })
        }
      }
    })

    map.on('moveend', () => onMapMoved?.())

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, []) // eslint-disable-line

  // Update source data when pins change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    updateSource(map, pins)

    if (fitToPins && pins.length > 0 && !fittedRef.current) {
      fittedRef.current = true
      const coords = pins.map((p) => p.coordinates)
      if (coords.length === 1) {
        map.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 800 })
      } else {
        map.fitBounds(getBounds(coords), { padding: 80, duration: 800 })
      }
    }
  }, [pins, fitToPins])

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

function updateSource(map: mapboxgl.Map, pins: Pin[]) {
  const source = map.getSource('pins') as mapboxgl.GeoJSONSource | undefined
  if (source) {
    source.setData(pinsToGeoJSON(pins) as GeoJSON.FeatureCollection)
  }
}
