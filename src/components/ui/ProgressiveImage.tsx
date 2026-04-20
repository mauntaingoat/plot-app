import { useState, useEffect } from 'react'
import { preloadImage, isImageCached } from '@/lib/imageCache'

interface ProgressiveImageProps {
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  priority?: boolean
}

export function ProgressiveImage({ src, alt = '', className = '', style }: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(isImageCached(src))

  useEffect(() => {
    if (!src) return
    if (isImageCached(src)) { setLoaded(true); return }
    preloadImage(src).then(() => setLoaded(true))
  }, [src])

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {src && (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </div>
  )
}
