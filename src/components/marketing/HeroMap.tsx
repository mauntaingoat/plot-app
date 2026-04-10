import { motion } from 'framer-motion'

/**
 * Animated SVG street map background for the hero section.
 * Grid + buildings start at ~28% from left on desktop, full width on mobile.
 * Pins are fully opaque.
 */

interface MapPin {
  x: string
  y: string
  delay: number
  size?: number
  thumbnail: string
}

const PINS: MapPin[] = [
  { x: '62%', y: '18%', delay: 1.0, size: 40, thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=60&h=60&fit=crop' },
  { x: '78%', y: '42%', delay: 1.2, size: 44, thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=60&h=60&fit=crop' },
  { x: '85%', y: '68%', delay: 1.1, size: 38, thumbnail: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=60&h=60&fit=crop' },
  { x: '55%', y: '78%', delay: 1.5, thumbnail: 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=60&h=60&fit=crop' },
  { x: '72%', y: '85%', delay: 1.3, size: 36, thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=60&h=60&fit=crop' },
  { x: '90%', y: '22%', delay: 1.6, size: 34, thumbnail: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=60&h=60&fit=crop' },
]

// Each building has a clipPath to give it shape — some plain rects, some with notches/extrusions
// clipPath uses polygon() with percentage coords relative to the element
const BUILDINGS: { top: string; left: string; w: string; h: string; delay: number; clip?: string }[] = [
  // L-shape notch bottom-right
  { top: '10%', left: '52%', w: '12%', h: '8%', delay: 0.5, clip: 'polygon(0 0, 100% 0, 100% 55%, 60% 55%, 60% 100%, 0 100%)' },
  // Plain tall rect
  { top: '22%', left: '65%', w: '8%', h: '14%', delay: 0.6 },
  // Notch top-right corner
  { top: '45%', left: '70%', w: '14%', h: '10%', delay: 0.7, clip: 'polygon(0 0, 70% 0, 70% 35%, 100% 35%, 100% 100%, 0 100%)' },
  // Extrusion on left side
  { top: '65%', left: '48%', w: '10%', h: '8%', delay: 0.55, clip: 'polygon(0 20%, 30% 20%, 30% 0, 100% 0, 100% 100%, 0 100%)' },
  // Plain square
  { top: '75%', left: '80%', w: '12%', h: '12%', delay: 0.65 },
  // Notch bottom-left
  { top: '15%', left: '82%', w: '8%', h: '10%', delay: 0.75, clip: 'polygon(0 0, 100% 0, 100% 100%, 40% 100%, 40% 60%, 0 60%)' },
  // T-shape extrusion on right
  { top: '55%', left: '60%', w: '6%', h: '16%', delay: 0.6, clip: 'polygon(0 0, 100% 0, 100% 40%, 100% 40%, 100% 65%, 100% 65%, 100% 100%, 0 100%)' },
  // L-shape notch top-left
  { top: '30%', left: '88%', w: '7%', h: '8%', delay: 0.8, clip: 'polygon(45% 0, 100% 0, 100% 100%, 0 100%, 0 45%, 45% 45%)' },
  // Wide with right extrusion
  { top: '82%', left: '55%', w: '10%', h: '6%', delay: 0.7, clip: 'polygon(0 0, 65% 0, 65% 0, 100% 0, 100% 60%, 65% 60%, 65% 100%, 0 100%)' },
  // Plain small rect
  { top: '5%', left: '72%', w: '9%', h: '7%', delay: 0.55 },
]

const ROAD_COLOR = 'rgb(223, 235, 248)'
const HOME_COLOR = 'rgb(233, 217, 248)'
const HOME_BORDER = 'rgba(200, 180, 230, 0.5)'

export function HeroMap() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">

      {/* ── Grid layer ── */}
      <div
        className="absolute inset-y-0 right-0 left-0 md:left-[28%]"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 12%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%)',
        }}
      >
        <div className="absolute inset-0 bg-pearl/50" />

        {/* Buildings — rendered first so grid lines sit on top */}
        {BUILDINGS.map((b, i) => (
          <motion.div
            key={`bldg-${i}`}
            className="absolute"
            style={{
              top: b.top, left: b.left, width: b.w, height: b.h,
              background: HOME_COLOR,
              border: `1px solid ${HOME_BORDER}`,
              borderRadius: b.clip ? 0 : 2,
              clipPath: b.clip || undefined,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: b.delay }}
          />
        ))}

        {/* SVG roads — rendered AFTER buildings so lines sit on top */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} preserveAspectRatio="none">
          {/* Thick main roads */}
          <motion.line x1="0%" y1="28%" x2="100%" y2="28%" stroke={ROAD_COLOR} strokeWidth="5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.2 }} />
          <motion.line x1="0%" y1="55%" x2="100%" y2="55%" stroke={ROAD_COLOR} strokeWidth="5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.3 }} />
          <motion.line x1="0%" y1="80%" x2="100%" y2="80%" stroke={ROAD_COLOR} strokeWidth="5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.35 }} />
          <motion.line x1="25%" y1="0%" x2="25%" y2="100%" stroke={ROAD_COLOR} strokeWidth="4"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.4 }} />
          <motion.line x1="55%" y1="0%" x2="55%" y2="100%" stroke={ROAD_COLOR} strokeWidth="4"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.45 }} />
          <motion.line x1="78%" y1="0%" x2="78%" y2="100%" stroke={ROAD_COLOR} strokeWidth="5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.35 }} />

          {/* Thin secondary streets */}
          {[12, 20, 38, 45, 65, 72, 88, 95].map((y, i) => (
            <motion.line key={`h-${i}`} x1="0%" y1={`${y}%`} x2="100%" y2={`${y}%`}
              stroke="var(--color-border-light)" strokeWidth="1.5" opacity="0.5"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.5 + i * 0.06 }} />
          ))}
          {[10, 38, 45, 62, 68, 88, 95].map((x, i) => (
            <motion.line key={`v-${i}`} x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%"
              stroke="var(--color-border-light)" strokeWidth="1.5" opacity="0.5"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.55 + i * 0.06 }} />
          ))}
        </svg>
      </div>

      {/* ── Pins — fully opaque ── */}
      {PINS.map((pin, i) => {
        const size = pin.size || 40
        const inner = size - 10
        return (
          <motion.div
            key={`pin-${i}`}
            className="absolute z-10"
            style={{ left: pin.x, top: pin.y, marginLeft: -size / 2, marginTop: -size / 2 }}
            initial={{ scale: 0, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: pin.delay }}
          >
            <motion.div
              className="absolute rounded-full border-2 border-tangerine/30"
              style={{ inset: -4, width: size + 8, height: size + 8 }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, delay: pin.delay + 0.5 }}
            />
            <div
              className="rounded-full border-[2.5px] border-tangerine bg-white shadow-lg flex items-center justify-center overflow-hidden"
              style={{ width: size, height: size, boxShadow: '0 2px 10px rgba(255,107,61,0.3)' }}
            >
              <img
                src={pin.thumbnail}
                alt=""
                className="rounded-full object-cover"
                style={{ width: inner, height: inner }}
              />
            </div>
          </motion.div>
        )
      })}

      {/* Top + bottom edge fade */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, var(--color-ivory) 0%, transparent 6%, transparent 92%, var(--color-ivory) 100%)',
        }}
      />
    </div>
  )
}
