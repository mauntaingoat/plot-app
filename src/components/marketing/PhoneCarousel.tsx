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

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ perspective: 1200 }}>
      <div
        style={{
          width: 280,
          height: 560,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotation}deg)`,
          transition: isSpinning
            ? `transform ${SPIN_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
            : 'transform 0.1s ease',
        }}
      >
        {/* Face 1 — Map video (front) */}
        <div
          className="absolute inset-0 rounded-[28px] overflow-hidden shadow-2xl bg-midnight"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
        >
          <video
            ref={(el) => { videoRefs.current[0] = el }}
            src={VIDEOS[0]}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>

        {/* Face 2 — Content video (back, rotated 180deg) */}
        <div
          className="absolute inset-0 rounded-[28px] overflow-hidden shadow-2xl bg-midnight"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <video
            ref={(el) => { videoRefs.current[1] = el }}
            src={VIDEOS[1]}
            className="w-full h-full object-cover"
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
