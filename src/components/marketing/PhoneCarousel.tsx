import { useRef, useEffect, useState } from 'react'

/**
 * 3D rotating phone carousel — two videos (Map + Content) on opposite
 * sides of a Y-axis rotation. Fast spin to switch, slow pause to watch.
 */

const VIDEOS = [
  '/marketing/Map.MOV',
  '/marketing/Content.MOV',
]

const PAUSE_DURATION = 2500 // ms to watch each video
const SPIN_DURATION = 600   // ms for the fast rotation

export function PhoneCarousel({ className = '' }: { className?: string }) {
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Which face is showing (0 = Map, 1 = Content)
  const activeFace = Math.round(rotation / 180) % 2 === 0 ? 0 : 1

  useEffect(() => {
    function cycle() {
      // Start spin
      setIsSpinning(true)
      setRotation((prev) => prev + 180)

      // After spin completes, pause to watch
      timerRef.current = setTimeout(() => {
        setIsSpinning(false)
        // After watching, spin again
        timerRef.current = setTimeout(cycle, PAUSE_DURATION)
      }, SPIN_DURATION)
    }

    // Initial pause before first spin
    timerRef.current = setTimeout(cycle, PAUSE_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Set different start times on mount
  useEffect(() => {
    const v0 = videoRefs.current[0]
    const v1 = videoRefs.current[1]
    if (v0) v0.currentTime = 0
    if (v1) v1.currentTime = 3 // start Content video at 3s
  }, [])

  // Play/pause videos based on which face is visible
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === activeFace && !isSpinning) {
        v.play().catch(() => {})
      } else {
        v.pause()
      }
    })
  }, [activeFace, isSpinning])

  // Resting tilt — angled slightly when paused
  const tiltX = isSpinning ? 0 : 5
  const tiltZ = isSpinning ? 0 : -2

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ perspective: 1400 }}>
      <div
        style={{
          width: 300,
          height: 620,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotation}deg) rotateX(${tiltX}deg) rotateZ(${tiltZ}deg)`,
          transition: isSpinning
            ? `transform ${SPIN_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
            : `transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)`,
        }}
      >
        {/* Face 1 — Map video (front) */}
        <div
          className="absolute inset-0 rounded-[22px] overflow-hidden shadow-2xl bg-midnight"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
        >
          <video
            ref={(el) => { videoRefs.current[0] = el }}
            src={VIDEOS[0]}
            className="w-full h-full object-contain bg-black"
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>

        {/* Face 2 — Content video (back, rotated 180deg) */}
        <div
          className="absolute inset-0 rounded-[22px] overflow-hidden shadow-2xl bg-midnight"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <video
            ref={(el) => { videoRefs.current[1] = el }}
            src={VIDEOS[1]}
            className="w-full h-full object-contain bg-black"
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>
      </div>
    </div>
  )
}
