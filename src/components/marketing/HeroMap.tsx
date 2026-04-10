import { motion } from 'framer-motion'

/**
 * Animated SVG street map background for the hero section.
 * The entire map slowly drifts diagonally (top-left → bottom-right)
 * in an infinite loop. Content is duplicated on a 2x2 tile so the
 * loop is seamless.
 */

interface MapPin {
  x: string // % position within one tile
  y: string
  delay: number
  size?: number
  thumbnail: string
}

const PINS: MapPin[] = [
  { x: '25%', y: '18%', delay: 1.0, size: 40, thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=60&h=60&fit=crop' },
  { x: '55%', y: '42%', delay: 1.2, size: 44, thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=60&h=60&fit=crop' },
  { x: '70%', y: '68%', delay: 1.1, size: 38, thumbnail: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=60&h=60&fit=crop' },
  { x: '35%', y: '72%', delay: 1.5, thumbnail: 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=60&h=60&fit=crop' },
  { x: '80%', y: '25%', delay: 1.3, size: 36, thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=60&h=60&fit=crop' },
  { x: '15%', y: '50%', delay: 1.6, size: 34, thumbnail: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=60&h=60&fit=crop' },
]

const BUILDINGS: { top: string; left: string; w: number; h: number; path: string }[] = [
  { top: '8%', left: '20%', w: 140, h: 80,
    path: 'M4,0 H96 Q100,0 100,4 V51 Q100,55 96,55 H64 Q60,55 60,59 V96 Q60,100 56,100 H4 Q0,100 0,96 V4 Q0,0 4,0Z' },
  { top: '22%', left: '50%', w: 90, h: 120,
    path: 'M4,0 H96 Q100,0 100,4 V96 Q100,100 96,100 H4 Q0,100 0,96 V4 Q0,0 4,0Z' },
  { top: '42%', left: '10%', w: 160, h: 85,
    path: 'M4,0 H66 Q70,0 70,4 V31 Q70,35 74,35 H96 Q100,35 100,39 V96 Q100,100 96,100 H4 Q0,100 0,96 V4 Q0,0 4,0Z' },
  { top: '60%', left: '40%', w: 115, h: 72,
    path: 'M30,0 H96 Q100,0 100,4 V96 Q100,100 96,100 H4 Q0,100 0,96 V24 Q0,20 4,20 H26 Q30,20 30,16 V4 Q30,0 34,0Z' },
  { top: '78%', left: '65%', w: 100, h: 100,
    path: 'M4,0 H96 Q100,0 100,4 V96 Q100,100 96,100 H4 Q0,100 0,96 V4 Q0,0 4,0Z' },
  { top: '15%', left: '75%', w: 85, h: 95,
    path: 'M4,0 H96 Q100,0 100,4 V96 Q100,100 96,100 H44 Q40,100 40,96 V64 Q40,60 36,60 H4 Q0,60 0,56 V4 Q0,0 4,0Z' },
  { top: '50%', left: '78%', w: 65, h: 130,
    path: 'M4,0 H96 Q100,0 100,4 V96 Q100,100 96,100 H4 Q0,100 0,96 V4 Q0,0 4,0Z' },
  { top: '32%', left: '30%', w: 78, h: 72,
    path: 'M49,0 H96 Q100,0 100,4 V96 Q100,100 96,100 H4 Q0,100 0,96 V49 Q0,45 4,45 H45 Q49,45 49,41 V4 Q49,0 53,0Z' },
  { top: '85%', left: '15%', w: 130, h: 58,
    path: 'M4,0 H96 Q100,0 100,4 V56 Q100,60 96,60 H69 Q65,60 65,64 V96 Q65,100 61,100 H4 Q0,100 0,96 V4 Q0,0 4,0Z' },
  { top: '5%', left: '55%', w: 100, h: 65,
    path: 'M4,0 H96 Q100,0 100,4 V96 Q100,100 96,100 H4 Q0,100 0,96 V4 Q0,0 4,0Z' },
]

// Thick + thin road positions (percentage within one tile)
const THICK_H = [22, 48, 75]
const THICK_V = [18, 45, 72]
const THIN_H = [8, 15, 32, 40, 58, 65, 85, 92]
const THIN_V = [8, 28, 35, 55, 62, 82, 90]

const ROAD_COLOR = 'rgba(255, 107, 61, 0.12)'
const HOME_COLOR = 'rgba(232, 82, 42, 0.08)'

/**
 * Renders one complete tile of the map (grid + buildings + pins).
 * This gets duplicated 2x2 inside the scrolling container.
 */
function MapTile({ animatePins }: { animatePins?: boolean }) {
  return (
    <div className="absolute inset-0">
      {/* Buildings */}
      {BUILDINGS.map((b, i) => (
        <div
          key={`b-${i}`}
          className="absolute"
          style={{ top: b.top, left: b.left, width: b.w, height: b.h }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d={b.path} fill={HOME_COLOR} />
          </svg>
        </div>
      ))}

      {/* Roads on top of buildings */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} preserveAspectRatio="none">
        {THICK_H.map((y, i) => (
          <line key={`th-${i}`} x1="0%" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke={ROAD_COLOR} strokeWidth="5" opacity="0.7" />
        ))}
        {THICK_V.map((x, i) => (
          <line key={`tv-${i}`} x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%" stroke={ROAD_COLOR} strokeWidth="4" opacity="0.7" />
        ))}
        {THIN_H.map((y, i) => (
          <line key={`sh-${i}`} x1="0%" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="var(--color-border-light)" strokeWidth="1.5" opacity="0.5" />
        ))}
        {THIN_V.map((x, i) => (
          <line key={`sv-${i}`} x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%" stroke="var(--color-border-light)" strokeWidth="1.5" opacity="0.5" />
        ))}
      </svg>

      {/* Pins */}
      {PINS.map((pin, i) => {
        const size = pin.size || 40
        const inner = size - 10
        return (
          <motion.div
            key={`p-${i}`}
            className="absolute"
            style={{ left: pin.x, top: pin.y, marginLeft: -size / 2, marginTop: -size / 2, zIndex: 2 }}
            initial={animatePins ? { scale: 0, y: -20, opacity: 0 } : false}
            animate={animatePins ? { scale: 1, y: 0, opacity: 1 } : undefined}
            transition={animatePins ? { type: 'spring', stiffness: 400, damping: 20, delay: pin.delay } : undefined}
          >
            <motion.div
              className="absolute rounded-full border-2 border-tangerine/30"
              style={{ inset: -4, width: size + 8, height: size + 8 }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, delay: (pin.delay || 0) + 0.5 }}
            />
            <div
              className="rounded-full border-[2.5px] border-tangerine bg-white shadow-lg flex items-center justify-center overflow-hidden"
              style={{ width: size, height: size, boxShadow: '0 2px 10px rgba(255,107,61,0.3)' }}
            >
              <img src={pin.thumbnail} alt="" className="rounded-full object-cover" style={{ width: inner, height: inner }} />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export function HeroMap() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Clipping + left fade for desktop */}
      <div
        className="absolute inset-y-0 right-0 left-0 md:left-[42%]"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%)',
          overflow: 'hidden',
        }}
      >
        <div className="absolute inset-0 bg-pearl/50" />

        {/*
          Scrolling container — 2x2 tile grid, animated diagonally.
          Starts offset top-left, drifts to (0,0), then resets seamlessly
          because the 2x2 duplication makes it tileable.
        */}
        <div
          className="absolute"
          style={{
            width: '200%',
            height: '200%',
            top: '-100%',
            left: '-100%',
            animation: 'mapDrift 50s linear infinite',
          }}
        >
          {/* 2x2 tile grid for seamless loop */}
          <div className="absolute" style={{ width: '50%', height: '50%', top: 0, left: 0 }}>
            <MapTile animatePins />
          </div>
          <div className="absolute" style={{ width: '50%', height: '50%', top: 0, left: '50%' }}>
            <MapTile />
          </div>
          <div className="absolute" style={{ width: '50%', height: '50%', top: '50%', left: 0 }}>
            <MapTile />
          </div>
          <div className="absolute" style={{ width: '50%', height: '50%', top: '50%', left: '50%' }}>
            <MapTile />
          </div>
        </div>
      </div>

      {/* Top + bottom edge fade */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, var(--color-ivory) 0%, transparent 6%, transparent 92%, var(--color-ivory) 100%)',
        }}
      />

      <style>{`
        @keyframes mapDrift {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50%, 50%);
          }
        }
      `}</style>
    </div>
  )
}
