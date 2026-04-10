import { useRef, useEffect } from 'react'

/**
 * 3D rotating phone carousel — Linktree-style continuous rotation.
 * Two videos on opposite faces. Slow/paused when facing viewer (tilted),
 * fast spin through the edge to the next face. Smooth CSS animation.
 */

const VIDEOS = [
  '/marketing/Map.MOV',
  '/marketing/Content.MOV',
]

// Total cycle: 8s
// 0-30%: rest at front face (tilted 15deg) — 2.4s viewing
// 30-50%: fast spin 180deg through edge — 1.6s
// 50-80%: rest at back face (tilted 195deg) — 2.4s viewing
// 80-100%: fast spin 180deg back — 1.6s

export function PhoneCarousel({ className = '' }: { className?: string }) {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  useEffect(() => {
    // Different start times
    const v0 = videoRefs.current[0]
    const v1 = videoRefs.current[1]
    if (v0) { v0.currentTime = 0; v0.play().catch(() => {}) }
    if (v1) { v1.currentTime = 3 }
  }, [])

  // Auto-play/pause based on which face is visible
  useEffect(() => {
    const el = document.querySelector('.phone-spinner') as HTMLElement
    if (!el) return

    // Watch the rotation and play/pause accordingly
    const interval = setInterval(() => {
      const style = getComputedStyle(el)
      const transform = style.transform
      // Parse the Y rotation from the matrix3d
      if (transform && transform !== 'none') {
        const match = transform.match(/matrix3d\((.+)\)/)
        if (match) {
          const values = match[1].split(',').map(Number)
          // cos(Y) is at index 0, sin(Y) is at index 8
          const cosY = values[0]
          // If front face is roughly facing us (cosY > 0), play video 0
          // If back face is roughly facing us (cosY < 0), play video 1
          const v0 = videoRefs.current[0]
          const v1 = videoRefs.current[1]
          if (cosY > 0.5) {
            v0?.play().catch(() => {})
            v1?.pause()
          } else if (cosY < -0.5) {
            v1?.play().catch(() => {})
            v0?.pause()
          } else {
            // Edge-on — pause both
            v0?.pause()
            v1?.pause()
          }
        }
      }
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ perspective: 1200 }}>
      <div
        className="phone-spinner"
        style={{
          width: 290,
          height: 600,
          position: 'relative',
          transformStyle: 'preserve-3d',
          animation: 'phoneRotate 8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
        }}
      >
        {/* Face 1 — Map video (front) */}
        <div
          className="absolute inset-0 rounded-[24px] overflow-hidden bg-midnight"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg) translateZ(1px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)',
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

        {/* Face 2 — Content video (back) */}
        <div
          className="absolute inset-0 rounded-[24px] overflow-hidden bg-midnight"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(1px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)',
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

      <style>{`
        @keyframes phoneRotate {
          /* Front face — resting, tilted */
          0% { transform: rotateY(15deg) rotateX(3deg) rotateZ(-1deg); }
          28% { transform: rotateY(15deg) rotateX(3deg) rotateZ(-1deg); }
          /* Fast spin through to back face */
          50% { transform: rotateY(195deg) rotateX(3deg) rotateZ(1deg); }
          /* Back face — resting, tilted */
          52% { transform: rotateY(195deg) rotateX(3deg) rotateZ(1deg); }
          78% { transform: rotateY(195deg) rotateX(3deg) rotateZ(1deg); }
          /* Fast spin back to front */
          100% { transform: rotateY(375deg) rotateX(3deg) rotateZ(-1deg); }
        }
      `}</style>
    </div>
  )
}
