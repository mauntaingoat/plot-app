import { motion } from 'framer-motion'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: number
  ring?: 'story' | 'live' | 'none'
  className?: string
  onClick?: () => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const ringStyles = {
  story: 'bg-gradient-to-br from-tangerine via-ember to-[#FF3B7A] p-[2.5px]',
  live: 'bg-live-red p-[2.5px] animate-pulse-glow',
  none: '',
}

export function Avatar({ src, name = '', size = 40, ring = 'none', className = '', onClick }: AvatarProps) {
  const inner = (
    <div
      className="rounded-full overflow-hidden bg-charcoal flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span
          className="text-white font-semibold select-none"
          style={{ fontSize: size * 0.36 }}
        >
          {getInitials(name || '?')}
        </span>
      )}
    </div>
  )

  if (ring === 'none') {
    return (
      <motion.div
        whileTap={onClick ? { scale: 0.92 } : undefined}
        className={`inline-flex rounded-full ${className}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
      >
        {inner}
      </motion.div>
    )
  }

  return (
    <motion.div
      whileTap={onClick ? { scale: 0.92 } : undefined}
      className={`inline-flex rounded-full ${ringStyles[ring]} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="rounded-full bg-midnight p-[2px]">
        {inner}
      </div>
    </motion.div>
  )
}
