import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Play,
  Image as ImageIcon,
  CursorClick,
  Sparkle,
  MapPin,
} from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { useThemedStyles } from '../lib/theme'
import { lightTap } from '../lib/haptics'
import { resolveStorageUrl } from '../lib/firebaseStorageUrl'
import type { PinContentItem } from '../types'

/**
 * RN port of the web ContentCard, with two distinct press zones:
 *   - Media area  → onMediaPress (play reel / page through carousel)
 *   - Info area   → onPress (opens ContentActionsSheet)
 * The pin assignment dropdown still lives inside the sheet, but a
 * linked-pin chip is shown above the caption for at-a-glance context.
 *
 * Image loading uses resolveStorageUrl → routes 16-bpc cropPhotos
 * thumbs through the proxyImage8bpc Cloud Function so iOS can
 * actually decode them (Radar 143602439).
 */

export interface ContentRow {
  contentId: string
  pinId: string | null
  pinAddress: string | null
  item: PinContentItem
  isLinked: boolean
}

interface Props {
  row: ContentRow
  isPro?: boolean
  onPress?: () => void
  onMediaPress?: () => void
  onUpgradePress?: () => void
}

export function ContentCard({ row, isPro = false, onPress, onMediaPress, onUpgradePress }: Props) {
  const styles = useThemedStyles(_styles)
  const isVideo = row.item.type === 'reel'
  // Picking a still image to render in the card frame.
  //  - Photos: prefer the explicit thumbnail, then the first carousel
  //    image, then the single mediaUrl.
  //  - Videos: ONLY use the thumbnail. mediaUrl is an .mp4 and
  //    expo-image can't decode it — autoplaying the video itself
  //    lives in the upcoming player milestone.
  const thumb = isVideo
    ? (row.item.thumbnailUrl ?? null)
    : (row.item.thumbnailUrl ?? row.item.mediaUrls?.[0] ?? row.item.mediaUrl ?? null)
  const caption = row.item.caption ?? null
  const views = row.item.views ?? 0

  // Same load-resilience pattern as PinHeroImage: resolve direct-GCS
  // and 16-bpc URLs to formats iOS can fetch + decode.
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(thumb)
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setAttempt(0)
    setFailed(false)
    setResolvedUrl(thumb)
    if (thumb) {
      resolveStorageUrl(thumb).then((resolved) => {
        if (resolved) setResolvedUrl(resolved)
      })
    }
  }, [thumb])

  const source = useMemo(() => (resolvedUrl ? { uri: resolvedUrl } : null), [resolvedUrl])
  const showImage = source && !failed
  const pinShort = row.pinAddress?.split(',')[0] ?? null

  return (
    <View style={[styles.card, row.isLinked && styles.cardLinked]}>
      {/* Media area — taps go to onMediaPress (play reel / page carousel) */}
      <Pressable
        onPress={() => { lightTap(); onMediaPress?.() }}
        style={({ pressed }) => [styles.media, pressed && { opacity: 0.92 }]}
      >
        {showImage ? (
          <Image
            source={source}
            key={`${resolvedUrl}-${attempt}`}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={resolvedUrl ?? undefined}
            onError={() => {
              if (attempt + 1 < 3) {
                const next = attempt + 1
                setTimeout(() => setAttempt(next), 300 * 2 ** attempt)
              } else {
                setFailed(true)
              }
            }}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.thumbFallback]}>
            {isVideo
              ? <Play size={28} color={COLORS.smoke} weight="fill" />
              : <ImageIcon size={28} color={COLORS.smoke} weight="regular" />}
          </View>
        )}

        {/* Top dark gradient for type-pill legibility */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { height: '40%' }]}
          pointerEvents="none"
        />

        {/* Type pill */}
        <View style={styles.typePill}>
          {isVideo
            ? <Play size={10} color={COLORS.ink} weight="fill" />
            : <ImageIcon size={10} color={COLORS.ink} weight="regular" />}
          <Text style={styles.typePillText}>{isVideo ? 'Video' : 'Photo'}</Text>
        </View>
      </Pressable>

      {/* Info section — white space; tap opens the actions sheet */}
      <Pressable
        onPress={() => { lightTap(); onPress?.() }}
        style={({ pressed }) => [styles.info, pressed && { opacity: 0.85 }]}
      >
        {/* Linked-pin chip */}
        <View style={styles.pinChipRow}>
          <MapPin size={11} color={row.isLinked ? COLORS.tangerine : COLORS.ash} weight="regular" />
          <Text
            style={[styles.pinChipText, !row.isLinked && { color: COLORS.ash }]}
            numberOfLines={1}
          >
            {pinShort ?? 'No listing'}
          </Text>
        </View>

        {caption ? (
          <Text style={styles.caption} numberOfLines={2}>{caption}</Text>
        ) : (
          <Text style={[styles.caption, { color: COLORS.ash }]}>No caption</Text>
        )}
        <View style={styles.statRow}>
          {isPro ? (
            <View style={styles.stat}>
              <CursorClick size={12} color={COLORS.smoke} weight="regular" />
              <Text style={styles.statText}>{views.toLocaleString()}</Text>
            </View>
          ) : (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); lightTap(); onUpgradePress?.() }}
              style={styles.stat}
              hitSlop={6}
            >
              <CursorClick size={12} color={COLORS.smoke} weight="regular" />
              <Text style={[styles.statText, styles.statBlur]}>
                {(views || 42).toLocaleString()}
              </Text>
              <Sparkle size={10} color={COLORS.tangerine} weight="fill" />
            </Pressable>
          )}
        </View>
      </Pressable>
    </View>
  )
}

const _styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardLinked: {
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 61, 0.25)',
  },
  media: {
    aspectRatio: 9 / 11,
    width: '100%',
    backgroundColor: COLORS.pearl,
    position: 'relative',
  },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  typePill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  // Literal black so the swap doesn't flip this — the pill sits on
  // a near-white chip regardless of theme.
  typePillText: { fontFamily: FONTS.humanistBold, fontSize: 11, color: '#0A0A0A' },

  info: { padding: 12, gap: 6 },
  pinChipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pinChipText: { fontFamily: FONTS.humanistMedium, fontSize: 11, color: COLORS.ink, flex: 1, minWidth: 0 },
  caption: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, lineHeight: 17 },
  statRow: {},
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontFamily: FONTS.humanistMedium, fontSize: 11, color: COLORS.smoke },
  statBlur: {
    color: 'rgba(107, 114, 128, 0.65)',
    textShadowColor: COLORS.smoke,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
})
