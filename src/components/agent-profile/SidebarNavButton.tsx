import { type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface SidebarNavButtonProps {
  active: boolean
  onClick: () => void
  children: ReactNode
}

export function SidebarNavButton({ active, onClick, children }: SidebarNavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all cursor-pointer relative overflow-hidden ${
        active ? 'text-tangerine' : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      {/* Active state: particle glow + gradient background */}
      {active && (
        <>
          {/* Gradient background */}
          <motion.div
            className="absolute inset-0 rounded-xl -z-[2]"
            animate={{
              opacity: [0.08, 0.12, 0.08],
              background: [
                'linear-gradient(90deg, #FF6B3D 0%, #E8522A 100%)',
                'linear-gradient(90deg, #F96C3E 0%, #FF6B3D 100%)',
                'linear-gradient(90deg, #E8522A 0%, #F96C3E 100%)',
                'linear-gradient(90deg, #FF6B3D 0%, #E8522A 100%)',
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />

          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 rounded-xl -z-[1]"
            animate={{
              opacity: [0, 0.06, 0.12, 0.06, 0],
              background: 'radial-gradient(circle at 50% 0%, rgba(255,107,61,0.4) 0%, transparent 70%)',
            }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: 'loop' }}
          />

          {/* Particles */}
          {Array.from({ length: 6 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full -z-[1]"
              style={{
                left: `${15 + (i * 14)}%`,
                top: `${30 + (i % 3) * 20}%`,
                background: 'linear-gradient(135deg, #FF6B3D, #E8522A)',
                filter: 'blur(2px)',
              }}
              animate={{
                x: [0, (Math.sin(i * 1.8) * 8)],
                y: [0, (Math.cos(i * 2.1) * 6)],
                scale: [0.3, 0.7, 0.3],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 2 + i * 0.4,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }}
            />
          ))}
        </>
      )}

      {children}
    </button>
  )
}
