"use client"

import { useEffect, useRef } from "react"
import createGlobe from "cobe"

interface PinMarker {
  id: string
  location: [number, number]
  thumbnail: string
}

interface GlobeProps {
  markers?: PinMarker[]
  className?: string
  speed?: number
}

const defaultMarkers: PinMarker[] = [
  { id: "pin-1", location: [25.76, -80.19], thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=80&h=80&fit=crop" },
  { id: "pin-2", location: [34.05, -118.24], thumbnail: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=80&h=80&fit=crop" },
  { id: "pin-3", location: [40.71, -74.01], thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=80&h=80&fit=crop" },
  { id: "pin-4", location: [37.77, -122.42], thumbnail: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=80&h=80&fit=crop" },
  { id: "pin-5", location: [51.51, -0.13], thumbnail: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=80&h=80&fit=crop" },
  { id: "pin-6", location: [-33.87, 151.21], thumbnail: "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=80&h=80&fit=crop" },
  { id: "pin-7", location: [48.86, 2.35], thumbnail: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=80&h=80&fit=crop" },
  { id: "pin-8", location: [35.68, 139.69], thumbnail: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=80&h=80&fit=crop" },
]

export function Globe({
  markers = defaultMarkers,
  className = "",
  speed = 0.003,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let animationId: number
    let phi = 0

    function init() {
      const width = canvas.offsetWidth
      if (width === 0 || globe) return

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        // dark: 1 inverts the color scheme — land dots become baseColor on a transparent bg
        dark: 1,
        diffuse: 3,
        mapSamples: 24000,
        mapBrightness: 6,
        // Tangerine dots for the continents
        baseColor: [1, 0.42, 0.24],
        markerColor: [1, 0.42, 0.24],
        glowColor: [1, 0.97, 0.95],
        markerElevation: 0,
        markers: markers.map((m) => ({
          location: m.location,
          size: 0.04,
          id: m.id,
        })),
        arcs: [],
        arcColor: [1, 0.42, 0.24],
        arcWidth: 0.5,
        arcHeight: 0.25,
        opacity: 0.35,
      })

      function animate() {
        phi += speed
        globe!.update({ phi, theta: 0.2 })
        animationId = requestAnimationFrame(animate)
      }
      animate()
      setTimeout(() => canvas && (canvas.style.opacity = "1"))
    }

    if (canvas.offsetWidth > 0) {
      init()
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (globe) globe.destroy()
    }
  }, [markers, speed])

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          touchAction: "none",
          pointerEvents: "none",
        }}
      />
      {/* Circular thumbnail pins — tangerine ring + listing photo */}
      {markers.map((m) => (
        <div
          key={m.id}
          style={{
            position: "absolute",
            // @ts-expect-error CSS Anchor Positioning
            positionAnchor: `--cobe-${m.id}`,
            bottom: "anchor(top)",
            left: "anchor(center)",
            translate: "-50% 50%",
            pointerEvents: "none" as const,
            opacity: `var(--cobe-visible-${m.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 6px))`,
            transition: "opacity 0.4s ease, filter 0.4s ease",
          }}
        >
          {/* Outer tangerine ring */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "3px solid #FF6B3D",
              background: "#fff",
              boxShadow: "0 2px 10px rgba(255,107,61,0.35), 0 4px 20px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={m.thumbnail}
              alt=""
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
