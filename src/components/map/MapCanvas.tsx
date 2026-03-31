import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useMapStore } from '@/stores/mapStore'
import { pinsToGeoJSON } from '@/hooks/usePins'
import { formatPrice, getBounds } from '@/lib/firestore'
import type { Pin, PinType } from '@/lib/types'

const MAPBOX_STYLE = 'mapbox://styles/mauntaingoat/cmndhmm7m000h01s5b0pvf9zx'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

interface MapCanvasProps {
  pins: Pin[]
  onPinClick?: (pin: Pin) => void
  className?: string
  fitToPins?: boolean
  interactive?: boolean
}

export function MapCanvas({ pins, onPinClick, className = '', fitToPins = true, interactive = true }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const { center, zoom, setCenter, setZoom, activeFilter } = useMapStore()

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

    map.on('load', () => {
      // Add the GeoJSON source for pins
      map.addSource('pins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      // Cluster circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'pins',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#FF6B3D',
          'circle-radius': ['step', ['get', 'point_count'], 24, 10, 30, 50, 36],
          'circle-opacity': 0.9,
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255, 107, 61, 0.3)',
        },
      })

      // Cluster count text
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'pins',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 14,
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
            'live', 12,
            'open_house', 10,
            'story', 18,
            8,
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': [
            'match', ['get', 'type'],
            'story', 3,
            2,
          ],
          'circle-stroke-color': [
            'match', ['get', 'type'],
            'story', '#E8522A',
            'live', 'rgba(255, 59, 48, 0.4)',
            'open_house', 'rgba(255, 170, 0, 0.4)',
            'rgba(255, 255, 255, 0.2)',
          ],
        },
      })

      // Pin labels (price pills for listings/sold)
      map.addLayer({
        id: 'pin-labels',
        type: 'symbol',
        source: 'pins',
        filter: ['all',
          ['!', ['has', 'point_count']],
          ['in', ['get', 'type'], ['literal', ['listing', 'sold']]],
        ],
        layout: {
          'text-field': [
            'case',
            ['==', ['get', 'type'], 'sold'],
            ['concat', 'SOLD'],
            ['get', 'price'],
          ],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-offset': [0, -2],
          'text-anchor': 'bottom',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': [
            'match', ['get', 'type'],
            'listing', '#3B82F6',
            'sold', '#34C759',
            '#FF6B3D',
          ],
          'text-halo-width': 6,
          'text-halo-blur': 1,
        },
      })

      // Live/Open house labels
      map.addLayer({
        id: 'pin-status-labels',
        type: 'symbol',
        source: 'pins',
        filter: ['all',
          ['!', ['has', 'point_count']],
          ['in', ['get', 'type'], ['literal', ['live', 'open_house']]],
        ],
        layout: {
          'text-field': [
            'match', ['get', 'type'],
            'live', 'LIVE',
            'open_house', 'OPEN',
            '',
          ],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-offset': [0, -2],
          'text-anchor': 'bottom',
          'text-allow-overlap': true,
          'text-letter-spacing': 0.1,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': [
            'match', ['get', 'type'],
            'live', '#FF3B30',
            'open_house', '#FFAA00',
            '#FF6B3D',
          ],
          'text-halo-width': 6,
          'text-halo-blur': 1,
        },
      })
    })

    // Click handlers
    map.on('click', 'pin-circles', (e) => {
      if (!e.features?.length) return
      const feature = e.features[0]
      const pinId = feature.properties?.id
      if (pinId && onPinClick) {
        const pin = pins.find((p) => p.id === pinId)
        if (pin) onPinClick(pin)
      }
    })

    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
      const clusterId = features[0]?.properties?.cluster_id
      const source = map.getSource('pins') as mapboxgl.GeoJSONSource
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || !features[0].geometry || features[0].geometry.type !== 'Point') return
        map.easeTo({
          center: features[0].geometry.coordinates as [number, number],
          zoom: zoom!,
        })
      })
    })

    // Cursor changes
    map.on('mouseenter', 'pin-circles', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'pin-circles', () => { map.getCanvas().style.cursor = '' })
    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })

    // Track viewport
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update pin data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const filteredPins = activeFilter === 'all' ? pins : pins.filter((p) => p.type === activeFilter)
    const geojson = pinsToGeoJSON(filteredPins)

    const source = map.getSource('pins') as mapboxgl.GeoJSONSource | undefined
    if (source) {
      source.setData(geojson as GeoJSON.FeatureCollection)
    }

    // Fit to pins on data change
    if (fitToPins && filteredPins.length > 0) {
      const coords = filteredPins.map((p) => p.coordinates)
      if (coords.length === 1) {
        map.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 800 })
      } else {
        const bounds = getBounds(coords)
        map.fitBounds(bounds, { padding: 60, duration: 800 })
      }
    }
  }, [pins, activeFilter, fitToPins])

  // Re-bind click handler when pins change
  const handlePinClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    const map = mapRef.current
    if (!map || !onPinClick) return
    const features = map.queryRenderedFeatures(e.point, { layers: ['pin-circles'] })
    if (!features.length) return
    const pinId = features[0].properties?.id
    const pin = pins.find((p) => p.id === pinId)
    if (pin) onPinClick(pin)
  }, [pins, onPinClick])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.off('click', 'pin-circles', handlePinClick as any)
    map.on('click', 'pin-circles', handlePinClick as any)
    return () => { map.off('click', 'pin-circles', handlePinClick as any) }
  }, [handlePinClick])

  return (
    <div ref={mapContainer} className={`w-full h-full ${className}`} />
  )
}
