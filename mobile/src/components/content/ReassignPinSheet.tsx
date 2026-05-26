/**
 * Pin-picker bottom sheet for moving a piece of content to a
 * different pin. Mirrors web ContentLibrary's pin-assignment
 * dropdown. Selecting a different pin immediately reassigns (no
 * confirm — easy to redo).
 */
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { Check, MapPin, Prohibit, X } from 'phosphor-react-native'
import { BottomSheet } from '../BottomSheet'
import { COLORS, FONTS } from '../../lib/tokens'
import { useColors, useThemedStyles } from '../../lib/theme'
import { lightTap, selection } from '../../lib/haptics'
import type { Pin } from '../../types'

export function ReassignPinSheet({
  visible,
  pins,
  currentPinId,
  onClose,
  onPick,
  onUnlink,
}: {
  visible: boolean
  pins: Pin[]
  currentPinId: string | null
  onClose: () => void
  onPick: (pinId: string) => Promise<void>
  /** Optional — when present, a "No listing" row sits above the pin
   *  list. Selecting it unlinks the content from its current pin so
   *  the item sits in the standalone `content` collection. */
  onUnlink?: () => Promise<void>
}) {
  const styles = useThemedStyles(_styles)
  const colors = useColors()
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>Reassign to a pin</Text>
        <Pressable
          onPress={() => { lightTap(); onClose() }}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <X size={18} color={colors.smoke} weight="bold" />
        </Pressable>
      </View>
      <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={styles.list}>
        {onUnlink ? (
          <>
            <Pressable
              onPress={async () => {
                if (currentPinId === null) { onClose(); return }
                selection()
                await onUnlink()
                onClose()
              }}
              style={({ pressed }) => [
                styles.row,
                currentPinId === null && styles.rowActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.pinIcon}>
                <Prohibit size={14} color={currentPinId === null ? COLORS.tangerine : colors.smoke} weight="regular" />
              </View>
              <Text
                style={[
                  styles.address,
                  currentPinId === null && { color: colors.ink, fontFamily: FONTS.humanistSemibold },
                ]}
                numberOfLines={1}
              >
                No listing
              </Text>
              {currentPinId === null ? <Check size={16} color={COLORS.tangerine} weight="bold" /> : null}
            </Pressable>
            <View style={styles.sep} />
          </>
        ) : null}
        {pins.length === 0 ? (
          <Text style={styles.empty}>No pins to pick from.</Text>
        ) : (
          pins.map((p) => {
            const active = p.id === currentPinId
            return (
              <Pressable
                key={p.id}
                onPress={async () => {
                  if (active) { onClose(); return }
                  selection()
                  await onPick(p.id)
                  onClose()
                }}
                style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.pinIcon}>
                  <MapPin size={14} color={active ? COLORS.tangerine : colors.graphite} weight="regular" />
                </View>
                <Text style={[styles.address, active && { color: colors.ink, fontFamily: FONTS.humanistSemibold }]} numberOfLines={1}>
                  {p.address}
                </Text>
                {active ? <Check size={16} color={COLORS.tangerine} weight="bold" /> : null}
              </Pressable>
            )
          })
        )}
      </ScrollView>
    </BottomSheet>
  )
}

const _styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  title: { flex: 1, fontFamily: FONTS.humanistBold, fontSize: 17, color: COLORS.ink },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowActive: { backgroundColor: 'rgba(255,107,61,0.08)' },
  pinIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: COLORS.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  address: { flex: 1, fontFamily: FONTS.humanist, fontSize: 13.5, color: COLORS.ink },
  empty: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, textAlign: 'center', paddingVertical: 20 },
  sep: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 6, marginHorizontal: 12 },
})
