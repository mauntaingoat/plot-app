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

// SVG building footprints — L-shapes, T-shapes, notched rectangles
// Each is an SVG path in a viewBox of 100x100, scaled via width/height
const BUILDING_SHAPES: string[] = [
  // L-shape
  'M0 0h60v100h-30v-60h-30z',
  // Notched rectangle
  'M0 0h100v80h-30v20h-40v-20h-30z',
  // T-shape
  'M20 0h60v40h20v60h-100v-60h20z',
  // Wide L
  'M0 0h100v60h-50v40h-50z',
  // U-shape
  'M0 0h30v60h40v-60h30v100h-100z',
  // Stepped
  'M0 30h40v-30h60v70h-40v30h-60z',
  // Fat L
  'M0 0h70v50h30v50h-100z',
  // Offset block
  'M20 0h80v70h-60v30h-40z',
  // Corner notch
  'M0 0h100v100h-60v-40h-40z',
  // Narrow L
  'M0 0h40v60h60v40h-100z',
  // Inverted L
  'M0 0h100v100h-40v-60h-60z',
  // Cross-ish
  'M30 0h40v30h30v40h-30v30h-40v-30h-30v-40h30z',
]

interface Building {
  top: string
  left: string
  w: number // px
  h: number // px
  shape: number // index into BUILDING_SHAPES
  delay: number
}

const BUILDINGS: Building[] = [
  { top: '6%', left: '48%', w: 52, h: 36, shape: 0, delay: 0.5 },
  { top: '8%', left: '68%', w: 40, h: 30, shape: 3, delay: 0.55 },
  { top: '5%', left: '85%', w: 35, h: 28, shape: 7, delay: 0.6 },
  { top: '18%', left: '42%', w: 38, h: 32, shape: 1, delay: 0.52 },
  { top: '20%', left: '60%', w: 48, h: 38, shape: 5, delay: 0.58 },
  { top: '16%', left: '80%', w: 44, h: 34, shape: 9, delay: 0.62 },
  { top: '32%', left: '45%', w: 42, h: 30, shape: 2, delay: 0.54 },
  { top: '35%', left: '65%', w: 36, h: 28, shape: 8, delay: 0.6 },
  { top: '30%', left: '82%', w: 50, h: 36, shape: 4, delay: 0.65 },
  { top: '30%', left: '92%', w: 32, h: 26, shape: 10, delay: 0.68 },
  { top: '48%', left: '40%', w: 46, h: 34, shape: 6, delay: 0.56 },
  { top: '50%', left: '58%', w: 38, h: 30, shape: 11, delay: 0.62 },
  { top: '46%', left: '75%', w: 44, h: 32, shape: 0, delay: 0.58 },
  { top: '48%', left: '90%', w: 36, h: 28, shape: 3, delay: 0.64 },
  { top: '62%', left: '44%', w: 40, h: 32, shape: 7, delay: 0.58 },
  { top: '65%', left: '62%', w: 50, h: 36, shape: 1, delay: 0.64 },
  { top: '60%', left: '82%', w: 42, h: 30, shape: 5, delay: 0.68 },
  { top: '76%', left: '48%', w: 36, h: 28, shape: 9, delay: 0.6 },
  { top: '78%', left: '66%', w: 46, h: 34, shape: 2, delay: 0.66 },
  { top: '75%', left: '85%', w: 38, h: 30, shape: 8, delay: 0.7 },
  { top: '88%', left: '42%', w: 44, h: 32, shape: 4, delay: 0.62 },
  { top: '90%', left: '60%', w: 34, h: 26, shape: 10, delay: 0.68 },
  { top: '87%', left: '78%', w: 48, h: 36, shape: 6, delay: 0.72 },
  { top: '90%', left: '92%', w: 30, h: 24, shape: 11, delay: 0.74 },
]

const ROAD_COLOR = 'rgb(203, 221, 240)'
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

        {/* SVG roads */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {/* Thick main roads — blue-ish */}
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

          {/* Thin secondary streets — keep existing subtle color */}
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

        {/* Buildings — amorphous house-like shapes via SVG clipPath */}
        {BUILDINGS.map((b, i) => (
          <motion.div
            key={`bldg-${i}`}
            className="absolute"
            style={{ top: b.top, left: b.left, width: b.w, height: b.h }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: b.delay }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              <path
                d={BUILDING_SHAPES[b.shape]}
                fill={HOME_COLOR}
                stroke={HOME_BORDER}
                strokeWidth="2"
              />
            </svg>
          </motion.div>
        ))}
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
