"use client"

import { useEffect, useRef, useCallback } from "react"
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

// Circular thumbnail pins — same look as the agent profile map pins
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
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const isPausedRef = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
    isPausedRef.current = true
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
    }
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        }
      }
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerUp])

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
        dark: 0,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 1.2,
        baseColor: [1, 1, 1],
        markerColor: [1, 0.42, 0.24], // tangerine
        glowColor: [1, 1, 1],
        markerElevation: 0,
        markers: markers.map((m) => ({
          location: m.location,
          size: 0.03,
          id: m.id,
        })),
        arcs: [],
        arcColor: [1, 0.42, 0.24],
        arcWidth: 0.5,
        arcHeight: 0.25,
        opacity: 0.7,
      })

      function animate() {
        if (!isPausedRef.current) phi += speed
        globe!.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        })
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
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          touchAction: "none",
        }}
      />
      {/* Circular thumbnail pins — tangerine ring + listing photo inside */}
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
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "2.5px solid #FF6B3D",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(255,107,61,0.3), 0 4px 16px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* Inner thumbnail */}
            <img
              src={m.thumbnail}
              alt=""
              style={{
                width: 30,
                height: 30,
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
