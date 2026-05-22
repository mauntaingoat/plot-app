import { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { House, Compass, Key } from 'phosphor-react-native'
import type { PinType } from '../types'

/**
 * Hero image with retry-on-error + typed-gradient fallback.
 *
 * iOS Networking issues we've seen with Firebase Storage URLs in
 * the iOS Simulator (`The network connection was lost.` and
 * `cannot parse response`) are intermittent — the same URL usually
 * loads fine on retry. expo-image doesn't auto-retry on failure, so
 * we wrap it.
 *
 * Behavior:
 *  - On error, retries up to 3 times with backoff: 300ms → 600ms → 1200ms
 *  - After exhausting retries, falls back to the type-colored gradient
 *    with the type icon (same visual as "no image" state)
 *  - Falling back is silent — looks intentional, no error UI
 */

const TYPE_GRADIENT: Record<PinType, [string, string]> = {
  for_sale: ['#3B82F6', '#2563EB'],
  sold: ['#34C759', '#22A34B'],
  spotlight: ['#FF6B3D', '#E8522A'],
}

const TYPE_ICON: Record<PinType, React.ComponentType<{ size?: number; color?: string; weight?: 'light' | 'regular' | 'fill' }>> = {
  for_sale: House,
  sold: Key,
  spotlight: Compass,
}

const MAX_ATTEMPTS = 3

/**
 * Rewrite direct-GCS URLs to the Firebase-wrapper format.
 *
 * Server-side content processing (Cloud Functions writing via the
 * admin SDK) emits direct GCS URLs like:
 *   https://storage.googleapis.com/<bucket>/pins/.../media/....jpg
 *
 * iOS's URLSession has reliability issues with these — same URL fails
 * with "cannot parse response" / "network connection lost" repeatedly.
 *
 * The Firebase wrapper URL goes through Firebase's CDN layer + edge
 * caching and works reliably on iOS:
 *   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded-path>?alt=media
 *
 * Storage rules already allow `read: if true` on /pins/**, so no
 * token is required for public objects.
 */
function rewriteUrl(url: string): string {
  const m = url.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/)
  if (!m) return url
  const [, bucket, path] = m
  // Strip any query string the original URL had; we want a clean wrapper URL.
  const cleanPath = path.split('?')[0]
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(cleanPath)}?alt=media`
}

interface Props {
  url: string | null | undefined
  type: PinType
}

export function PinHeroImage({ url, type }: Props) {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)

  // Reset state when URL itself changes (e.g. snapshot updates the pin).
  useEffect(() => {
    setAttempt(0)
    setFailed(false)
  }, [url])

  const rewritten = url ? rewriteUrl(url) : null
  const source = useMemo(() => (rewritten ? { uri: rewritten } : null), [rewritten])

  // No URL at all → just the typed gradient (same as fallback)
  if (!source || failed) {
    return <TypedGradient type={type} />
  }

  return (
    <Image
      source={source}
      // Re-keying on the attempt number forces expo-image to throw away
      // any cached failure and re-fetch from scratch.
      key={`${rewritten}-${attempt}`}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={150}
      cachePolicy="memory-disk"
      recyclingKey={rewritten ?? undefined}
      onError={(e) => {
        const err = (e as { error?: string } | undefined)?.error ?? 'unknown'
        if (attempt + 1 < MAX_ATTEMPTS) {
          const next = attempt + 1
          const backoff = 300 * 2 ** attempt
          // eslint-disable-next-line no-console
          console.warn(`[PinHero] retry ${next}/${MAX_ATTEMPTS - 1} after ${backoff}ms — ${err}`)
          setTimeout(() => setAttempt(next), backoff)
        } else {
          // eslint-disable-next-line no-console
          console.warn(`[PinHero] giving up after ${MAX_ATTEMPTS} attempts — ${err}`, rewritten)
          setFailed(true)
        }
      }}
    />
  )
}

function TypedGradient({ type }: { type: PinType }) {
  const Icon = TYPE_ICON[type]
  return (
    <LinearGradient
      colors={TYPE_GRADIENT[type]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, styles.fallback]}
    >
      <Icon size={40} color="rgba(255,255,255,0.3)" weight="light" />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
})
