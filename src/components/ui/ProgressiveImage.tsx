import { useState, useEffect } from 'react'

interface ProgressiveImageProps {
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  // Low-res placeholder. If not provided, generated from Unsplash via &w=20 param.
  placeholder?: string
  // Loading priority hint
  priority?: boolean
}

// Generate a tiny blurred placeholder URL from common image services
function generatePlaceholder(src: string): string | null {
  // Unsplash: append/replace w=20 for tiny preview
  if (src.includes('unsplash.com')) {
    if (src.includes('w=')) {
      return src.replace(/w=\d+/, 'w=20').replace(/h=\d+/, 'h=20')
    }
    const sep = src.includes('?') ? '&' : '?'
    return `${src}${sep}w=20&h=20&fit=crop`
  }
  // Firebase Storage: no built-in resizing, return null
  return null
}

export function ProgressiveImage({ src, alt = '', className = '', style, placeholder, priority }: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState<string>('')

  const placeholderSrc = placeholder || generatePlaceholder(src)

  useEffect(() => {
    if (!src) return
    setLoaded(false)
    const img = new Image()
    img.onload = () => {
      setCurrentSrc(src)
      setLoaded(true)
    }
    img.onerror = () => {
      // Fallback: just show the src directly even if preload failed
      setCurrentSrc(src)
      setLoaded(true)
    }
    img.src = src
  }, [src])

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Blurred placeholder — visible until full image loads */}
      {placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
            opacity: loaded ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
        />
      )}
      {/* Full resolution image */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          className="relative w-full h-full object-cover"
          style={{
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
      )}
    </div>
  )
}
