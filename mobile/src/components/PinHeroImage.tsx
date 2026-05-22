import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { House, Compass, Key } from 'phosphor-react-native'
import type { PinType } from '../types'
import { resolveStorageUrl } from '../lib/firebaseStorageUrl'

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

interface Props {
  url: string | null | undefined
  type: PinType
}

export function PinHeroImage({ url, type }: Props) {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  // Direct-GCS URLs get resolved through @react-native-firebase/storage's
  // getDownloadURL() which returns a properly tokenized wrapper URL that
  // iOS loads reliably. Already-tokenized URLs pass through unchanged.
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(url ?? null)
  const [debugStatus, setDebugStatus] = useState<string>('init')
  const [lastError, setLastError] = useState<string>('')

  // Reset state when URL itself changes (e.g. snapshot updates the pin).
  useEffect(() => {
    setAttempt(0)
    setFailed(false)
    setResolvedUrl(url ?? null)
    setLastError('')
    if (url) {
      setDebugStatus('resolving')
      resolveStorageUrl(url)
        .then((resolved) => {
          if (resolved && resolved !== url) {
            setResolvedUrl(resolved)
            setDebugStatus('resolved')
          } else if (resolved === url) {
            setDebugStatus('passthrough')
          } else {
            setDebugStatus('resolve→null')
          }
        })
        .catch((e) => {
          setDebugStatus('resolve threw')
          setLastError((e as Error)?.message ?? 'unknown')
        })
    } else {
      setDebugStatus('no-url')
    }
  }, [url])

  const source = useMemo(
    () => (resolvedUrl ? { uri: resolvedUrl } : null),
    [resolvedUrl],
  )

  // No URL at all → just the typed gradient (same as fallback)
  if (!source || failed) {
    return (
      <>
        <TypedGradient type={type} />
        {__DEV__ && url ? (
          <View style={dbg.box} pointerEvents="none">
            <Text style={dbg.text} numberOfLines={6}>
              [{debugStatus}] err={lastError || 'none'}{'\n'}
              src={(resolvedUrl ?? url).slice(-90)}
            </Text>
          </View>
        ) : null}
      </>
    )
  }

  return (
    <Image
      source={source}
      // Re-keying on the attempt number forces expo-image to throw away
      // any cached failure and re-fetch from scratch.
      key={`${resolvedUrl}-${attempt}`}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={150}
      cachePolicy="memory-disk"
      recyclingKey={resolvedUrl ?? undefined}
      onError={(e) => {
        const err = (e as { error?: string } | undefined)?.error ?? 'unknown'
        setLastError(err)
        if (attempt + 1 < MAX_ATTEMPTS) {
          const next = attempt + 1
          const backoff = 300 * 2 ** attempt
          // eslint-disable-next-line no-console
          console.warn(`[PinHero] retry ${next}/${MAX_ATTEMPTS - 1} after ${backoff}ms — ${err}`)
          setTimeout(() => setAttempt(next), backoff)
        } else {
          // eslint-disable-next-line no-console
          console.warn(`[PinHero] giving up after ${MAX_ATTEMPTS} attempts — ${err}`, resolvedUrl)
          setFailed(true)
        }
      }}
    />
  )
}

const dbg = StyleSheet.create({
  box: { position: 'absolute', top: 8, left: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', padding: 4, borderRadius: 4 },
  text: { color: 'white', fontSize: 9, fontFamily: 'Menlo' },
})

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
