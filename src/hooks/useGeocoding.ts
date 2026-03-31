import { useState, useCallback, useRef } from 'react'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

interface GeocodingResult {
  placeName: string
  center: [number, number] // [lng, lat]
  text: string
}

export function useGeocoding() {
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((query: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (!query.trim() || query.length < 3) {
      setResults([])
      return
    }

    timeoutRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)

      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=us&types=address&limit=5`
        const res = await fetch(url, { signal: controller.signal })
        const data = await res.json()

        if (data.features) {
          setResults(
            data.features.map((f: { place_name: string; center: [number, number]; text: string }) => ({
              placeName: f.place_name,
              center: f.center,
              text: f.text,
            }))
          )
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, 300) // 300ms debounce
  }, [])

  const clear = useCallback(() => {
    setResults([])
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (abortRef.current) abortRef.current.abort()
  }, [])

  return { results, loading, search, clear }
}
