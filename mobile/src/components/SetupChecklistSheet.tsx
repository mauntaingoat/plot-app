import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Check, CircleDashed } from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { BottomSheet } from './BottomSheet'
import type { UserDocLite } from '../lib/firestoreDb'
import type { Pin } from '../types'

/**
 * Setup checklist bottom sheet. Mirrors the web `SetupChecklist`
 * component — same 8 items in the same order as
 * `computeSetupPercent` in lib/setupPercent.ts, each with the same
 * weight so the totals match.
 *
 * Each row shows a tangerine check when done, ash dashed circle
 * when pending. Tap-out / swipe-down dismiss via BottomSheet.
 */

interface Props {
  visible: boolean
  onClose: () => void
  user: UserDocLite | null
  pins: Pin[]
}

interface Item {
  label: string
  weight: number
  done: boolean
}

function buildItems(user: UserDocLite | null, pins: Pin[]): Item[] {
  if (!user) return []
  return [
    { label: 'Claim your username',         weight: 10, done: !!user.username },
    { label: 'Upload a profile photo',      weight: 15, done: !!user.photoURL },
    { label: 'Add your display name',       weight: 10, done: !!user.displayName },
    { label: 'Write a short bio',           weight: 10, done: !!user.bio },
    { label: 'Connect a social platform',   weight: 15, done: (user.platforms?.length ?? 0) > 0 },
    { label: 'Drop your first pin',         weight: 20, done: pins.length >= 1 },
    { label: 'Have at least 3 pins',        weight: 10, done: pins.length >= 3 },
  ]
}

export function SetupChecklistSheet({ visible, onClose, user, pins }: Props) {
  const items = buildItems(user, pins)
  const percent = items.filter((i) => i.done).reduce((s, i) => s + i.weight, 0)
  const remaining = 100 - percent

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Finish setting up</Text>
        <Text style={styles.subtitle}>
          {remaining > 0
            ? `${remaining}% to go — finish these to unlock a richer profile.`
            : `You're all set up.`}
        </Text>

        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.iconWrap, item.done && styles.iconWrapDone]}>
                {item.done ? (
                  <Check size={14} color={COLORS.warmWhite} weight="bold" />
                ) : (
                  <CircleDashed size={14} color={COLORS.ash} weight="regular" />
                )}
              </View>
              <Text style={[styles.label, item.done && styles.labelDone]} numberOfLines={2}>
                {item.label}
              </Text>
              <Text style={[styles.weight, item.done && styles.weightDone]}>+{item.weight}%</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 540 },
  content: { paddingHorizontal: 12, paddingBottom: 8 },
  title: { fontFamily: FONTS.humanistBold, fontSize: 20, color: COLORS.ink, letterSpacing: -0.3, paddingHorizontal: 4, paddingTop: 4 },
  subtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 4, marginBottom: 16, paddingHorizontal: 4 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    padding: 14,
  },
  iconWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1, borderColor: COLORS.pearl,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapDone: { backgroundColor: COLORS.tangerine, borderColor: COLORS.tangerine },
  label: { flex: 1, fontFamily: FONTS.humanistMedium, fontSize: 14, color: COLORS.ink },
  labelDone: { color: COLORS.smoke, textDecorationLine: 'line-through' },
  weight: { fontFamily: FONTS.humanistBold, fontSize: 12, color: COLORS.smoke },
  weightDone: { color: COLORS.tangerine },
})
