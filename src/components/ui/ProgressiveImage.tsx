import { useState, useEffect, type ReactNode } from 'react'
import { preloadImage, isImageCached } from '@/lib/imageCache'

interface ProgressiveImageProps {
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  priority?: boolean
  /** Rendered when the image fails to load (offline, 404, broken
   *  Storage URL, etc). Defaults to the shimmer skeleton — pass a
   *  type-specific icon for richer fallbacks (e.g., a Home/BadgeCheck
   *  icon on listing cards). */
  fallback?: ReactNode
  /** Visual fit mode.
   *   - `cover` (default): fills the frame with `object-cover`,
   *     cropping as needed.
   *   - `contain-blur`: shows the image with `object-contain`
   *     (full image, no crop) on top of a blurred-and-zoomed copy
   *     that fills the frame. Mirrors the immersive viewer's
   *     letterbox treatment so listing-card thumbnails read the
   *     same as the actual content viewer. */
  fit?: 'cover' | 'contain-blur'
}

export function ProgressiveImage({ src, alt = '', className = '', style, fallback, fit = 'cover' }: ProgressiveImageProps) {
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

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Shimmer skeleton — visible while loading. Hidden once the
          image arrives or if it errors (fallback takes over). */}
      {!loaded && !errored && (
        <div className="absolute inset-0 progressive-image-skeleton" aria-hidden />
      )}

      {/* Fallback — visible when the image errors. If no fallback is
          provided, the skeleton stays as a quiet stand-in. */}
      {errored && fallback && (
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback}
        </div>
      )}

      {/* Real image — hidden via display:none when errored so the
          browser's broken-image glyph never shows through. */}
      {src && !errored && fit === 'cover' && (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.18s ease' }}
          onError={() => setErrored(true)}
        />
      )}

      {/* `contain-blur` mode — same image rendered twice: once as a
          blurred zoom-and-fill backdrop, once contained on top so
          the full image is visible without cropping. Matches the
          immersive viewer's photo letterbox treatment exactly. */}
      {src && !errored && fit === 'contain-blur' && (
        <>
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110"
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.18s ease' }}
            onError={() => setErrored(true)}
          />
          <img
            src={src}
            alt={alt}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.18s ease' }}
          />
        </>
      )}
    </div>
  )
}
