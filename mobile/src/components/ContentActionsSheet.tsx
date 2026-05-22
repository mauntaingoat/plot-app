import { View, Text, Pressable, StyleSheet } from 'react-native'
import { PencilSimple, Images, FilmStrip, Trash } from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { lightTap, warning } from '../lib/haptics'
import { BottomSheet } from './BottomSheet'
import type { ContentRow } from './ContentCard'

/**
 * Content actions bottom sheet — mirrors the web ContentLibrary
 * three-dots popover (lines 521-540 of ContentLibrary.tsx):
 *   - Edit Caption (always)
 *   - Edit Carousel (photo only)
 *   - Edit Reel    (video/reel only)
 *   - Archive      (danger)
 */

interface Props {
  row: ContentRow | null
  onClose: () => void
  onEditCaption: () => void
  onEditMedia: () => void
  onArchive: () => void
}

export function ContentActionsSheet({ row, onClose, onEditCaption, onEditMedia, onArchive }: Props) {
  const isVideo = row?.item.type === 'reel'
  const isPhoto = row?.item.type === 'photo'

  const rows = row ? [
    { Icon: PencilSimple, label: 'Edit Caption', color: COLORS.ink, onPress: onEditCaption },
    ...(isPhoto ? [{ Icon: Images, label: 'Edit Carousel', color: COLORS.tangerine, onPress: onEditMedia }] : []),
    ...(isVideo ? [{ Icon: FilmStrip, label: 'Edit Reel', color: COLORS.tangerine, onPress: onEditMedia }] : []),
    { Icon: Trash, label: 'Archive', color: COLORS.liveRed, onPress: onArchive, danger: true },
  ] : []

  return (
    <BottomSheet visible={!!row} onClose={onClose}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>
          {isVideo ? 'Video' : 'Photo'}
          {row?.pinAddress ? ` · ${row.pinAddress.split(',')[0]}` : ' · No listing'}
        </Text>
      </View>
      {rows.map(({ Icon, label, color, onPress, danger }) => (
        <Pressable
          key={label}
          onPress={() => {
            danger ? warning() : lightTap()
            onPress()
          }}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
        >
          <Icon size={20} color={color} weight="regular" />
          <Text style={[styles.label, { color: danger ? COLORS.liveRed : COLORS.ink }]}>{label}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  titleRow: { paddingHorizontal: 12, paddingBottom: 8 },
  title: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.ink },
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
