"use client"

import { useEffect, useRef, useCallback } from "react"
import createGlobe from "cobe"

interface LabelMarker {
  id: string
  location: [number, number]
  text: string
  color: string
  rotate: number
}

interface GlobeProps {
  markers?: LabelMarker[]
  className?: string
  speed?: number
}

// Real estate pin labels — styled like the pins on an agent profile
const defaultMarkers: LabelMarker[] = [
  { id: "pin-1", location: [25.76, -80.19], text: "$1.35M · Brickell", color: "#3B82F6", rotate: -5 },
  { id: "pin-2", location: [34.05, -118.24], text: "SOLD $2.1M", color: "#34C759", rotate: 4 },
  { id: "pin-3", location: [40.71, -74.01], text: "Open House Sat", color: "#FFAA00", rotate: -3 },
  { id: "pin-4", location: [37.77, -122.42], text: "$890K · SoMa", color: "#3B82F6", rotate: 6 },
  { id: "pin-5", location: [51.51, -0.13], text: "SOLD $4.5M", color: "#34C759", rotate: -4 },
  { id: "pin-6", location: [-33.87, 151.21], text: "$975K · Bondi", color: "#3B82F6", rotate: 5 },
  { id: "pin-7", location: [48.86, 2.35], text: "Open House Sun", color: "#FFAA00", rotate: -6 },
  { id: "pin-8", location: [35.68, 139.69], text: "SOLD $1.8M", color: "#34C759", rotate: 3 },
  { id: "pin-9", location: [29.76, -95.37], text: "$650K · Heights", color: "#3B82F6", rotate: -4 },
  { id: "pin-10", location: [41.88, -87.63], text: "Open House Fri", color: "#FFAA00", rotate: 5 },
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
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 9,
        baseColor: [1, 1, 1],
        markerColor: [1, 0.42, 0.24], // tangerine
        glowColor: [0.98, 0.97, 0.96],
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
      {markers.map((m) => (
        <div
          key={m.id}
          style={{
            position: "absolute",
            // @ts-expect-error CSS Anchor Positioning
            positionAnchor: `--cobe-${m.id}`,
            bottom: "anchor(top)",
            left: "anchor(center)",
            translate: "-50% 0",
            marginBottom: -10,
            padding: "0.35rem 0.6rem 0.3rem",
            background: m.color,
            color: "#fff",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap" as const,
            transform: `rotate(${m.rotate}deg)`,
            borderRadius: 5,
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.2), 0 3px 8px rgba(0,0,0,0.1), inset 0 -1px 0 rgba(0,0,0,0.15)",
            textShadow: "0 1px 1px rgba(0,0,0,0.25)",
            pointerEvents: "none" as const,
            overflow: "hidden",
            opacity: `var(--cobe-visible-${m.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
            transition: "opacity 0.3s, filter 0.3s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "50%",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)",
              borderRadius: "5px 5px 50% 50%",
              pointerEvents: "none" as const,
            }}
          />
          {m.text}
        </div>
      ))}
    </div>
  )
}
