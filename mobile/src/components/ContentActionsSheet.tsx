import { View, Text, Pressable, StyleSheet } from 'react-native'
import {
  PencilSimple,
  Images,
  FilmStrip,
  Trash,
  MapPin,
  CaretRight,
} from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { useColors, useThemedStyles } from '../lib/theme'
import { lightTap, warning } from '../lib/haptics'
import { BottomSheet } from './BottomSheet'
import type { ContentRow } from './ContentCard'

/**
 * Content actions bottom sheet — mirrors the web ContentLibrary
 * three-dots popover (lines 521-540 of ContentLibrary.tsx) PLUS the
 * pin-assignment dropdown (lines 474-488) that the web shows inline
 * on the card.
 *
 * iOS pattern (per user direction): the card itself is one tap-target
 * that opens this sheet. Inside the sheet:
 *   1. Linked pin row at top — tappable, opens pin picker (placeholder)
 *   2. Edit Caption
 *   3. Edit Carousel (photo only)  OR  Edit Reel (video only)
 *   4. Archive (danger)
 */

interface Props {
  row: ContentRow | null
  onClose: () => void
  onEditCaption: () => void
  onEditMedia: () => void
  onArchive: () => void
  onReassignPin: () => void
}

export function ContentActionsSheet({ row, onClose, onEditCaption, onEditMedia, onArchive, onReassignPin }: Props) {
  const styles = useThemedStyles(_styles)
  const colors = useColors()
  const isVideo = row?.item.type === 'reel'
  const isPhoto = row?.item.type === 'photo'

  const pinShort = row?.pinAddress?.split(',')[0] ?? null

  // Use the themed text color so the row label + icon are visible
  // on both light cards and dark sheets.
  const actionRows = row ? [
    { Icon: PencilSimple, label: 'Edit Caption', color: colors.ink, onPress: onEditCaption },
    ...(isPhoto ? [{ Icon: Images, label: 'Edit Carousel', color: COLORS.tangerine, onPress: onEditMedia }] : []),
    ...(isVideo ? [{ Icon: FilmStrip, label: 'Edit Reel', color: COLORS.tangerine, onPress: onEditMedia }] : []),
    { Icon: Trash, label: 'Archive', color: COLORS.liveRed, onPress: onArchive, danger: true },
  ] : []

  return (
    <BottomSheet visible={!!row} onClose={onClose}>
      {/* Header */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>
          {isVideo ? 'Video' : 'Photo'}
          {row?.pinAddress ? ` · ${pinShort}` : ' · No listing'}
        </Text>
      </View>

      {/* Pin assignment row — distinct treatment so it reads as a
          selector, not just another menu item. Tap opens the pin
          picker (placeholder until pin picker lands). */}
      {row ? (
        <Pressable
          onPress={() => { lightTap(); onReassignPin() }}
          style={({ pressed }) => [styles.pinRow, pressed && { opacity: 0.7 }]}
        >
          <MapPin size={18} color={row.isLinked ? COLORS.tangerine : COLORS.ash} weight="regular" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.pinLabel}>Linked listing</Text>
            <Text
              style={[styles.pinValue, !row.isLinked && styles.pinValueMuted]}
              numberOfLines={1}
            >
              {pinShort ?? 'No listing'}
            </Text>
          </View>
          <CaretRight size={16} color={COLORS.ash} />
        </Pressable>
      ) : null}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Action rows */}
      {actionRows.map(({ Icon, label, color, onPress, danger }) => (
        <Pressable
          key={label}
          onPress={() => {
            danger ? warning() : lightTap()
            onPress()
          }}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
        >
          <Icon size={20} color={color} weight="regular" />
          <Text style={[styles.label, { color: danger ? COLORS.liveRed : colors.ink }]}>{label}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  )
}

const _styles = StyleSheet.create({
  titleRow: { paddingHorizontal: 12, paddingBottom: 8 },
  title: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.ink },

  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: COLORS.cream,
  },
  pinLabel: { fontFamily: FONTS.humanistMedium, fontSize: 11, color: COLORS.smoke, textTransform: 'uppercase', letterSpacing: 0.6 },
  pinValue: { fontFamily: FONTS.humanistSemibold, fontSize: 14, color: COLORS.ink, marginTop: 1 },
  pinValueMuted: { color: COLORS.ash, fontFamily: FONTS.humanist },

  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 8, marginHorizontal: 16 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  label: { fontFamily: FONTS.humanistMedium, fontSize: 15 },
})
