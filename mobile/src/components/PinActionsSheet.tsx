import { View, Text, Pressable, StyleSheet } from 'react-native'
import {
  PencilSimple,
  FilmStrip,
  QrCode,
  Calendar,
  EyeSlash,
  Eye as EyeOpen,
  Trash,
} from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { useColors, useThemedStyles } from '../lib/theme'
import { lightTap, warning } from '../lib/haptics'
import { BottomSheet } from './BottomSheet'
import type { Pin } from '../types'

/**
 * Pin actions bottom sheet. Mirrors the web pin-actions popover in
 * `src/pages/Dashboard.tsx:726-757`.
 *
 * Renders via the reusable `BottomSheet` component so it gets:
 *  - Tap-scrim to dismiss
 *  - Swipe-down-to-dismiss with native-feel pan gesture + spring back
 *  - Slide-up animation on open
 */

interface Props {
  pin: Pin | null
  onClose: () => void
  onEditDetails: () => void
  onAddContent: () => void
  onGetQR: () => void
  onOpenHouse: () => void
  onToggleVisibility: () => void
  onArchive: () => void
}

export function PinActionsSheet({
  pin,
  onClose,
  onEditDetails,
  onAddContent,
  onGetQR,
  onOpenHouse,
  onToggleVisibility,
  onArchive,
}: Props) {
  const styles = useThemedStyles(_styles)
  const colors = useColors()
  const isForSale = pin?.type === 'for_sale'
  const isHidden = pin?.enabled === false

  const rows = pin ? [
    { Icon: PencilSimple, label: 'Edit Details', color: colors.ink, onPress: onEditDetails },
    { Icon: FilmStrip,    label: 'Add Content',  color: COLORS.tangerine, onPress: onAddContent },
    { Icon: QrCode,       label: 'Get QR Code',  color: COLORS.tangerine, onPress: onGetQR },
    ...(isForSale ? [{ Icon: Calendar, label: 'Open House', color: '#FFAA00', onPress: onOpenHouse }] : []),
    {
      Icon: isHidden ? EyeOpen : EyeSlash,
      label: isHidden ? 'Show on Map' : 'Hide from Map',
      color: colors.ink,
      onPress: onToggleVisibility,
    },
    { Icon: Trash, label: 'Archive', color: COLORS.liveRed, onPress: onArchive, danger: true },
  ] : []

  return (
    <BottomSheet visible={!!pin} onClose={onClose}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{pin?.address}</Text>
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
          <Text style={[styles.label, { color: danger ? COLORS.liveRed : colors.ink }]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </BottomSheet>
  )
}

const _styles = StyleSheet.create({
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
