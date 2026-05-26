/**
 * CyclingCountBadge — Zillow-style single pill that cycles through
 * "{N} homes for sale → {N} homes sold → {N} open houses →
 * {N} spotlights" every ~2.6s, skipping any count that's zero.
 *
 * Used by ExpandedMapView as the floating CTA above the map shape.
 * Lives in its own file because it's the only piece of the old
 * card-grid era that survived the card → highlight-strip refactor.
 */
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CyclingPhase { label: string; dot: string }

export function CyclingCountBadge({
  forSale,
  sold,
  openHouse = 0,
  spotlight = 0,
  onTap,
}: {
  forSale: number
  sold: number
  openHouse?: number
  spotlight?: number
  onTap: () => void
}) {
  const phases = useMemo<CyclingPhase[]>(() => {
    const out: CyclingPhase[] = []
    if (forSale > 0) out.push({ label: `${forSale} home${forSale !== 1 ? 's' : ''} for sale`, dot: '#3B82F6' })
    if (sold > 0) out.push({ label: `${sold} home${sold !== 1 ? 's' : ''} sold`, dot: '#34C759' })
    if (openHouse > 0) out.push({ label: `${openHouse} open house${openHouse !== 1 ? 's' : ''}`, dot: '#FF8552' })
    if (spotlight > 0) out.push({ label: `${spotlight} spotlight${spotlight !== 1 ? 's' : ''}`, dot: '#D94A1F' })
    if (out.length === 0) out.push({ label: 'No listings yet', dot: '#94A3B8' })
    return out
  }, [forSale, sold, openHouse, spotlight])

  const [phaseIdx, setPhaseIdx] = useState(0)
  useEffect(() => {
    setPhaseIdx(0)
    if (phases.length <= 1) return
    const id = window.setInterval(() => {
      setPhaseIdx((p) => (p + 1) % phases.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [phases.length])

  // Longest phrase establishes the pill's width via an invisible
  // ghost span, so swapping phrases never reflows the pill.
  const longest = useMemo(
    () => phases.reduce((a, b) => (b.label.length > a.length ? b.label : a), ''),
    [phases],
  )
  // Guard against the brief render between a filter change and the
  // useEffect that resets phaseIdx — phases[phaseIdx] can be undefined
  // for one tick and any property access would crash the boundary.
  const current = phases[phaseIdx] ?? phases[0]

  return (
    <button
      onClick={onTap}
      className="cycling-count-badge absolute left-1/2 -translate-x-1/2 z-[14] px-5 h-12 rounded-full bg-warm-white/96 backdrop-blur-sm flex items-center gap-2.5 cursor-pointer"
      style={{
        boxShadow: '0 -4px 18px -6px rgba(10,14,23,0.18), 0 10px 28px -10px rgba(10,14,23,0.3)',
        fontFamily: 'var(--font-humanist)',
      }}
    >
      <motion.span
        aria-hidden
        className="w-2 h-2 rounded-full"
        animate={{ background: current.dot }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ background: current.dot }}
      />
      <span
        className="relative inline-block whitespace-nowrap"
        style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.005em' }}
      >
        <span aria-hidden style={{ visibility: 'hidden' }}>{longest}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={phaseIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-ink whitespace-nowrap absolute inset-0 flex items-center justify-center"
            style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.005em' }}
          >
            {current.label}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  )
}
