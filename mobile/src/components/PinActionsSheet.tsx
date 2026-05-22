import { Modal, View, Text, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
import { lightTap, warning } from '../lib/haptics'
import type { Pin } from '../types'

/**
 * Pin actions bottom sheet — mirrors the web pin-actions popover in
 * `src/pages/Dashboard.tsx:726-757` (Edit Details / Add Content /
 * Get QR Code / Open House [for_sale only] / Hide-Show / Archive).
 *
 * Renders as a bottom-anchored Modal with a scrim. On iOS this gives
 * a native-feeling action sheet without bringing in a heavy bottom-
 * sheet dependency.
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
  if (!pin) return null
  const isForSale = pin.type === 'for_sale'
  const isHidden = pin.enabled === false

  const rows = [
    { Icon: PencilSimple, label: 'Edit Details', color: COLORS.ink, onPress: onEditDetails },
    { Icon: FilmStrip,    label: 'Add Content',  color: COLORS.tangerine, onPress: onAddContent },
    { Icon: QrCode,       label: 'Get QR Code',  color: COLORS.tangerine, onPress: onGetQR },
    ...(isForSale ? [{ Icon: Calendar, label: 'Open House', color: '#FFAA00', onPress: onOpenHouse }] : []),
    {
      Icon: isHidden ? EyeOpen : EyeSlash,
      label: isHidden ? 'Show on Map' : 'Hide from Map',
      color: COLORS.ink,
      onPress: onToggleVisibility,
    },
    { Icon: Trash, label: 'Archive', color: COLORS.liveRed, onPress: onArchive, danger: true },
  ]

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <SafeAreaView style={styles.sheetWrap} edges={['bottom']}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{pin.address}</Text>
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
              <Text style={[styles.label, { color: danger ? COLORS.liveRed : COLORS.ink }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.warmWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.pearl,
    marginBottom: 12,
  },
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
