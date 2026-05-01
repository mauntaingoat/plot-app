import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'

interface LoadingScreenProps {
  agentName?: string
  agentPhoto?: string | null
  onComplete?: () => void
  minDuration?: number // ms, default 2000
}

const MESSAGES = [
  'Loading the map...',
  'Dropping pins...',
  'Curating content...',
  'Almost there...',
]

export function LoadingScreen({ agentName, agentPhoto, onComplete, minDuration = 2200 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [messageIdx, setMessageIdx] = useState(0)
  const isAgent = !!agentName

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const durationRef = useRef(minDuration)

  useEffect(() => {
    const dur = durationRef.current
    const startTime = Date.now()
    let raf: number

    const tick = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / dur, 1)

      let p: number
      if (t < 0.3) {
        p = t * 2.2 * 100 / 3
      } else if (t < 0.7) {
        p = 22 + (t - 0.3) * 1.4 * 100 / 3
      } else {
        p = 40 + (t - 0.7) * 2.0 * 100
      }
      p = Math.min(p, 100)

      setProgress(p)

      if (p < 25) setMessageIdx(0)
      else if (p < 50) setMessageIdx(1)
      else if (p < 80) setMessageIdx(2)
      else setMessageIdx(3)

      if (p < 100) {
        raf = requestAnimationFrame(tick)
      } else {
        setTimeout(() => onCompleteRef.current?.(), 200)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="flex flex-col items-center justify-center px-6"
      style={{
        minHeight: '100dvh',
        // Match the profile's card surface, NOT the page canvas. Card
        // bg is always a solid color so it's consistent regardless of
        // palette (page canvas can be a gradient/pattern). Visually
        // continuous with the profile that comes next, and the soft
        // transition keeps the swap unnoticeable when the agent's
        // palette resolves mid-load.
        background: 'var(--card-bg)',
        transition: 'background 0.32s ease',
      }}
    >
      {/* Logo lockup — colors derive from CSS variables set by the
          parent agent profile so a dark palette (e.g., Midnight) gets
          light text instead of clashing with the dark canvas. The
          fallbacks match the original design for routes that haven't
          set the palette vars (sign-in, marketing, etc). */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2 mb-8"
      >
        <img src="/reelst-logo.png" alt="Reelst" className="w-10 h-10" />
        <span
          className="text-[24px] font-extrabold tracking-tight"
          style={{ color: 'var(--text-primary, #0A0E17)' }}
        >
          Reelst
        </span>
      </motion.div>

      {/* Agent personalization */}
      {isAgent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex flex-col items-center mb-8"
        >
          <Avatar src={agentPhoto} name={agentName} size={56} ring="story" />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[14px] mt-3 text-center"
            style={{ color: 'var(--text-secondary, #3A3F4A)' }}
          >
            Exploring{' '}
            <span style={{ color: 'var(--text-primary, #0A0E17)', fontWeight: 600 }}>
              {agentName}
            </span>
            's map
          </motion.p>
        </motion.div>
      )}

      {/* Progress bar — track shaded from the muted text color so it
          stays readable on any canvas (light or dark). */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-[200px]"
      >
        <div
          className="h-[3px] rounded-full overflow-hidden"
          style={{ background: 'color-mix(in srgb, var(--text-muted, #6B6F7A) 24%, transparent)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: 'var(--accent, linear-gradient(to right, #FF8552, #D94A1F))',
            }}
          />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[11px] text-center mt-3"
          style={{ color: 'var(--text-muted, #6B6F7A)' }}
        >
          {isAgent ? MESSAGES[messageIdx] : 'Loading...'}
        </motion.p>
      </motion.div>
    </div>
  )
}

// Simple version — uses midnight bg to match agent loading screen (no flash)
export function SimpleLoadingScreen() {
  return (
    <div className="min-h-screen bg-midnight flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-6"
      >
        <img src="/reelst-logo.png" alt="Reelst" className="w-10 h-10" />
        <span className="text-[24px] font-extrabold text-white tracking-tight">Reelst</span>
      </motion.div>
      <div className="w-[160px] h-[3px] bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-tangerine to-ember rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}
