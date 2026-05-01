import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { preloadImage, isImageCached } from '@/lib/imageCache'

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
  const [loaded, setLoaded] = useState(src ? isImageCached(src) : false)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setErrored(false)
    if (!src) return
    if (isImageCached(src)) { setLoaded(true); return }
    setLoaded(false)
    preloadImage(src)
      .then(() => setLoaded(true))
      .catch(() => setErrored(true))
  }, [src])

  // Letters always render; image overlays them when loaded. On error
  // we don't render the <img> at all so the browser's broken-image
  // glyph never shows through (opacity:0 alone leaves the alt-text
  // box visible in some browsers when offline).
  const showImage = src && !errored
  const showLetters = !showImage || !loaded
  const inner = (
    <div
      className="rounded-full overflow-hidden bg-charcoal flex items-center justify-center relative"
      style={{ width: size, height: size }}
    >
      <span
        className="text-white font-semibold select-none absolute"
        style={{ fontSize: size * 0.36, opacity: showLetters ? 1 : 0, transition: 'opacity 0.18s ease' }}
      >
        {getInitials(name || '?')}
      </span>
      {showImage && (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover absolute inset-0"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.18s ease' }}
          onError={() => setErrored(true)}
        />
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
