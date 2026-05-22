import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Play,
  Image as ImageIcon,
  MapPin,
  CursorClick,
  DotsThree,
  Sparkle,
  CaretDown,
} from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { lightTap } from '../lib/haptics'
import type { PinContentItem } from '../types'

/**
 * RN port of the web ContentCard (src/components/dashboard/ContentLibrary.tsx
 * ~lines 395-548).
 *
 * Visual elements:
 *  - 9:11 aspect media frame; tangerine/25 border if linked to a pin
 *  - Type pill top-left: "Video" (Play icon) or "Photo" (Image icon)
 *  - Top-to-bottom black gradient for legibility
 *  - Info section: linked-pin selector row (MapPin + label + chevron),
 *    caption (line-clamp 2), Pro-gated taps stat row, three-dots
 *    actions button right-aligned
 *
 * Pin assignment dropdown will become a native ActionSheet picker in
 * a later milestone; for now it's a tappable row that shows the
 * current linked pin / "No listing" and fires onPickPin.
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
  onMorePress?: () => void
  onUpgradePress?: () => void
  onPickPin?: () => void
}

export function ContentCard({ row, isPro = false, onPress, onMorePress, onUpgradePress, onPickPin }: Props) {
  const isVideo = row.item.type === 'reel'
  const thumb = row.item.thumbnailUrl ?? row.item.mediaUrl ?? null
  const caption = (row.item as PinContentItem & { caption?: string | null }).caption ?? null
  const views = (row.item as PinContentItem & { views?: number }).views ?? 0
  // First line of address — matches web's `address.split(',')[0]`
  const pinShortAddress = row.pinAddress?.split(',')[0] ?? null

  return (
    <Pressable
      onPress={() => { lightTap(); onPress?.() }}
      style={({ pressed }) => [
        styles.card,
        row.isLinked && styles.cardLinked,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* Media area */}
      <View style={styles.media}>
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={thumb}
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
      </View>

      {/* Info section */}
      <View style={styles.info}>
        <View style={styles.row}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {/* Linked-pin selector — tappable row matching web's
                dropdown that lets agents change the pin assignment.
                The actual picker UI lands in a later milestone. */}
            <Pressable
              onPress={() => { lightTap(); onPickPin?.() }}
              style={styles.linkRow}
              hitSlop={4}
            >
              <MapPin size={12} color={row.isLinked ? COLORS.tangerine : COLORS.ash} weight="regular" />
              <Text
                style={[styles.linkText, !row.isLinked && styles.linkTextMuted]}
                numberOfLines={1}
              >
                {pinShortAddress ?? 'No listing'}
              </Text>
              <CaretDown size={10} color={COLORS.ash} weight="regular" />
            </Pressable>

            {/* Caption */}
            {caption ? (
              <Text style={styles.caption} numberOfLines={2}>{caption}</Text>
            ) : null}

            {/* Stat — Pro-gated taps view */}
            <View style={styles.statRow}>
              {isPro ? (
                <View style={styles.stat}>
                  <CursorClick size={12} color={COLORS.smoke} weight="regular" />
                  <Text style={styles.statText}>{views.toLocaleString()}</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => { lightTap(); onUpgradePress?.() }}
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
          </View>

          {/* Three-dots actions */}
          {onMorePress ? (
            <Pressable
              onPress={() => { lightTap(); onMorePress() }}
              hitSlop={8}
              style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.6 }]}
            >
              <DotsThree size={18} color={COLORS.ash} weight="bold" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
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
  typePillText: { fontFamily: FONTS.humanistBold, fontSize: 11, color: COLORS.ink },

  info: { padding: 12, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  linkText: { fontFamily: FONTS.humanistMedium, fontSize: 13, color: COLORS.graphite, flex: 1 },
  linkTextMuted: { color: COLORS.ash },

  caption: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, lineHeight: 17, marginTop: 4 },
  statRow: { marginTop: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontFamily: FONTS.humanistMedium, fontSize: 11, color: COLORS.smoke },
  statBlur: {
    color: 'rgba(107, 114, 128, 0.65)',
    textShadowColor: COLORS.smoke,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  moreBtn: { padding: 4, marginTop: -4, marginRight: -4 },
})
