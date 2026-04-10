import { motion } from 'framer-motion'

/**
 * Animated SVG street map background for the hero section.
 * Roads, buildings, and pins draw/fade in on page load.
 * No interactivity — purely decorative.
 */

interface MapPin {
  x: string // percentage
  y: string
  delay: number
  size?: number
  thumbnail: string
}

const PINS: MapPin[] = [
  { x: '35%', y: '28%', delay: 0.8, thumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=60&h=60&fit=crop' },
  { x: '62%', y: '18%', delay: 1.0, size: 40, thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=60&h=60&fit=crop' },
  { x: '78%', y: '42%', delay: 1.2, size: 44, thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=60&h=60&fit=crop' },
  { x: '48%', y: '55%', delay: 1.4, thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=60&h=60&fit=crop' },
  { x: '85%', y: '68%', delay: 1.1, size: 38, thumbnail: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=60&h=60&fit=crop' },
  { x: '55%', y: '78%', delay: 1.5, thumbnail: 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=60&h=60&fit=crop' },
  { x: '72%', y: '85%', delay: 1.3, size: 36, thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=60&h=60&fit=crop' },
  { x: '90%', y: '22%', delay: 1.6, size: 34, thumbnail: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=60&h=60&fit=crop' },
  { x: '42%', y: '40%', delay: 0.9, size: 42, thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=60&h=60&fit=crop' },
]

const BUILDINGS = [
  { top: '10%', left: '40%', w: '12%', h: '8%', delay: 0.5 },
  { top: '22%', left: '55%', w: '8%', h: '14%', delay: 0.6 },
  { top: '45%', left: '70%', w: '14%', h: '10%', delay: 0.7 },
  { top: '65%', left: '38%', w: '10%', h: '8%', delay: 0.55 },
  { top: '75%', left: '80%', w: '12%', h: '12%', delay: 0.65 },
  { top: '15%', left: '80%', w: '8%', h: '10%', delay: 0.75 },
  { top: '55%', left: '58%', w: '6%', h: '16%', delay: 0.6 },
  { top: '30%', left: '88%', w: '7%', h: '8%', delay: 0.8 },
  { top: '82%', left: '45%', w: '10%', h: '6%', delay: 0.7 },
  { top: '5%', left: '65%', w: '9%', h: '7%', delay: 0.55 },
]

export function HeroMap() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Muted map surface */}
      <div className="absolute inset-0 bg-pearl/60" />

      {/* SVG roads — animate pathLength on load */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        {/* Main horizontal roads */}
        <motion.line x1="0%" y1="35%" x2="100%" y2="35%" stroke="var(--color-border-light)" strokeWidth="4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.2 }} />
        <motion.line x1="0%" y1="65%" x2="100%" y2="65%" stroke="var(--color-border-light)" strokeWidth="4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.3 }} />
        <motion.line x1="0%" y1="50%" x2="100%" y2="50%" stroke="var(--color-border-light)" strokeWidth="3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.35 }} />

        {/* Main vertical roads */}
        <motion.line x1="30%" y1="0%" x2="30%" y2="100%" stroke="var(--color-border-light)" strokeWidth="3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.4 }} />
        <motion.line x1="55%" y1="0%" x2="55%" y2="100%" stroke="var(--color-border-light)" strokeWidth="3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.45 }} />
        <motion.line x1="75%" y1="0%" x2="75%" y2="100%" stroke="var(--color-border-light)" strokeWidth="4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.35 }} />

        {/* Secondary streets */}
        {[15, 25, 42, 58, 72, 85, 92].map((y, i) => (
          <motion.line key={`h-${i}`} x1="0%" y1={`${y}%`} x2="100%" y2={`${y}%`}
            stroke="var(--color-border-light)" strokeWidth="1.5" opacity="0.5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.5 + i * 0.06 }} />
        ))}
        {[18, 38, 45, 62, 68, 82, 95].map((x, i) => (
          <motion.line key={`v-${i}`} x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%"
            stroke="var(--color-border-light)" strokeWidth="1.5" opacity="0.5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.55 + i * 0.06 }} />
        ))}
      </svg>

      {/* Buildings (blocks) */}
      {BUILDINGS.map((b, i) => (
        <motion.div
          key={`bldg-${i}`}
          className="absolute rounded-sm bg-smoke/[0.08] border border-smoke/[0.06]"
          style={{ top: b.top, left: b.left, width: b.w, height: b.h }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: b.delay }}
        />
      ))}

      {/* Tangerine listing pins */}
      {PINS.map((pin, i) => {
        const size = pin.size || 40
        const inner = size - 10
        return (
          <motion.div
            key={`pin-${i}`}
            className="absolute"
            style={{ left: pin.x, top: pin.y, marginLeft: -size / 2, marginTop: -size / 2 }}
            initial={{ scale: 0, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: pin.delay }}
          >
            {/* Pulse ring */}
            <motion.div
              className="absolute rounded-full border-2 border-tangerine/30"
              style={{ inset: -4, width: size + 8, height: size + 8 }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, delay: pin.delay + 0.5 }}
            />
            {/* Pin circle */}
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

      {/* Left fade — makes the text on the left readable */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, var(--color-ivory) 0%, var(--color-ivory) 20%, rgba(250,250,248,0.95) 38%, rgba(250,250,248,0.6) 55%, transparent 78%)',
        }}
      />
      {/* Top + bottom subtle fade */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, var(--color-ivory) 0%, transparent 8%, transparent 90%, var(--color-ivory) 100%)',
        }}
      />
    </div>
  )
}
