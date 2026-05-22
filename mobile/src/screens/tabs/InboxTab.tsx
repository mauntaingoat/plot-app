import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Tray, Heart, HandWaving, Calendar, ChatCircle } from 'phosphor-react-native'
import { BrandIconChip } from '../../components/BrandIconChip'
import { COLORS, FONTS } from '../../lib/tokens'
import { selection } from '../../lib/haptics'
import { useState } from 'react'

/**
 * Inbox tab — mirrors `src/components/dashboard/ShowingInbox.tsx`
 * top-level layout. Filter pills (All / Saves / Waves / Showings /
 * Questions) + list of items below.
 *
 * Live Firestore subscription for showings/saves/etc lands in a
 * later milestone. For now this is a structure-correct placeholder.
 */

type InboxFilter = 'all' | 'saves' | 'waves' | 'showings' | 'questions'

const FILTERS: { id: InboxFilter; label: string; Icon: React.ComponentType<{ size?: number; color?: string; weight?: 'fill' | 'regular' }> }[] = [
  { id: 'all',       label: 'All',       Icon: Tray },
  { id: 'saves',     label: 'Saves',     Icon: Heart },
  { id: 'waves',     label: 'Waves',     Icon: HandWaving },
  { id: 'showings',  label: 'Showings',  Icon: Calendar },
  { id: 'questions', label: 'Questions', Icon: ChatCircle },
]

export function InboxTab() {
  const [filter, setFilter] = useState<InboxFilter>('all')

  return (
    <View>
      {/* TabHeader */}
      <View style={styles.tabHeader}>
        <BrandIconChip>
          <Tray size={20} color={COLORS.warmWhite} weight="regular" />
        </BrandIconChip>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Inbox</Text>
          <Text style={styles.tabSubtitle}>Waves, showings, and questions from buyers</Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = filter === f.id
          return (
            <Pressable
              key={f.id}
              onPress={() => { if (!isActive) { selection(); setFilter(f.id) } }}
              style={({ pressed }) => [
                styles.pill,
                isActive ? styles.pillActive : styles.pillInactive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <f.Icon size={12} color={isActive ? COLORS.warmWhite : COLORS.smoke} weight={isActive ? 'fill' : 'regular'} />
              <Text style={[styles.pillText, { color: isActive ? COLORS.warmWhite : COLORS.smoke }]}>
                {f.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Empty state */}
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Tray size={28} color={COLORS.tangerine} weight="fill" />
        </View>
        <Text style={styles.emptyTitle}>Quiet here for now</Text>
        <Text style={styles.emptyBody}>
          Once buyers start saving your listings, waving, or requesting showings,
          you'll see them here.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconChip: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.tangerine,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#D94A1F', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  tabTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  tabSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 2 },

  filterRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 30, paddingHorizontal: 12, borderRadius: 999,
  },
  pillActive: { backgroundColor: COLORS.ink },
  pillInactive: { backgroundColor: COLORS.cream },
  pillText: { fontFamily: FONTS.humanistBold, fontSize: 12 },

  empty: { backgroundColor: COLORS.cream, borderRadius: 20, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: FONTS.humanistBold, fontSize: 18, color: COLORS.ink, marginBottom: 4 },
  emptyBody: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, lineHeight: 20, textAlign: 'center' },
})
