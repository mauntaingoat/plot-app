import { useEffect, useRef, useState } from 'react'
import createGlobe from 'cobe'

/**
 * Animated dotted globe with listing pins popping in.
 * Uses `cobe` (5KB WebGL) — same renderer GitHub uses on their homepage.
 *
 * The globe rotates slowly. At random intervals, a pin "pops" from a dot
 * on the globe surface — the orange ring + thumbnail circle from the real app.
 */

interface GlobePin {
  id: number
  lat: number
  lng: number
  opacity: number
  scale: number
}

// Real-ish city coordinates for pin pop-ins
const PIN_LOCATIONS: [number, number][] = [
  [25.76, -80.19],   // Miami
  [34.05, -118.24],  // LA
  [40.71, -74.01],   // NYC
  [30.27, -97.74],   // Austin
  [37.77, -122.42],  // San Francisco
  [41.88, -87.63],   // Chicago
  [29.76, -95.37],   // Houston
  [33.45, -112.07],  // Phoenix
  [47.61, -122.33],  // Seattle
  [39.74, -104.99],  // Denver
  [36.17, -115.14],  // Las Vegas
  [32.72, -117.16],  // San Diego
  [42.36, -71.06],   // Boston
  [35.23, -80.84],   // Charlotte
  [28.54, -81.38],   // Orlando
  [26.12, -80.14],   // Fort Lauderdale
  [51.51, -0.13],    // London
  [48.86, 2.35],     // Paris
  [35.68, 139.69],   // Tokyo
  [-33.87, 151.21],  // Sydney
]

export function Globe({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)
  const phiRef = useRef(0)
  const [pins, setPins] = useState<GlobePin[]>([])
  const pinIdRef = useRef(0)

  // Pop a new pin every 2-4 seconds
  useEffect(() => {
    const addPin = () => {
      const [lat, lng] = PIN_LOCATIONS[Math.floor(Math.random() * PIN_LOCATIONS.length)]
      const id = pinIdRef.current++
      setPins((prev) => {
        // Keep max 6 visible pins
        const kept = prev.length >= 6 ? prev.slice(1) : prev
        return [...kept, { id, lat, lng, opacity: 0, scale: 0 }]
      })
      // Animate in
      requestAnimationFrame(() => {
        setPins((prev) => prev.map((p) => (p.id === id ? { ...p, opacity: 1, scale: 1 } : p)))
      })
    }
    addPin() // initial
    const interval = setInterval(addPin, 2500 + Math.random() * 1500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    let width = 0

    const onResize = () => {
      if (canvasRef.current) width = canvasRef.current.offsetWidth
    }
    window.addEventListener('resize', onResize)
    onResize()

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 1.2,
      baseColor: [1, 1, 1],
      markerColor: [1, 0.42, 0.24], // tangerine
      glowColor: [1, 1, 1],
      markers: PIN_LOCATIONS.map(([lat, lng]) => ({
        location: [lat, lng],
        size: 0.04,
      })),
      opacity: 0.85,
      offset: [0, 0],
      scale: 1,
      onRender: (state) => {
        // Slow auto-rotation
        if (!pointerInteracting.current) {
          phiRef.current += 0.003
        }
        state.phi = phiRef.current + pointerInteractionMovement.current
        state.width = width * 2
        state.height = width * 2
      },
    })

    return () => {
      globe.destroy()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full aspect-square"
        style={{
          contain: 'layout paint size',
          maxWidth: '100%',
        }}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerInteractionMovement.current
          canvasRef.current!.style.cursor = 'grabbing'
        }}
        onPointerUp={() => {
          pointerInteracting.current = null
          canvasRef.current!.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          pointerInteracting.current = null
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current
            pointerInteractionMovement.current = delta / 200
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current
            pointerInteractionMovement.current = delta / 200
          }
        }}
      />

      {/* Floating pin badges that pop in */}
      {pins.map((pin) => {
        // Project lat/lng to rough screen position on the globe
        // This is approximate — pins float around the globe edges
        const angle = ((pin.lng + 180) / 360) * Math.PI * 2 + phiRef.current
        const x = 50 + Math.cos(angle) * 35
        const y = 50 + (pin.lat / 90) * -30
        return (
          <div
            key={pin.id}
            className="absolute pointer-events-none"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) scale(${pin.scale})`,
              opacity: pin.opacity,
              transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
            }}
          >
            <div className="relative">
              {/* Outer ring — tangerine */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-[2.5px] border-tangerine bg-white shadow-lg flex items-center justify-center">
                {/* Inner thumbnail circle */}
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-tangerine/20 to-ember/30" />
              </div>
              {/* Pulse ring */}
              <div
                className="absolute inset-0 rounded-full border-2 border-tangerine/40 animate-[pulse-live_2s_ease-in-out_infinite]"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
