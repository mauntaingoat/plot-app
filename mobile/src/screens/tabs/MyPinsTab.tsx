import { View, Text, Pressable, StyleSheet } from 'react-native'
import { MapPin, Plus } from 'phosphor-react-native'
import { PinCard } from '../../components/PinCard'
import { COLORS, FONTS } from '../../lib/tokens'
import { usePins } from '../../lib/usePins'
import { lightTap } from '../../lib/haptics'
import type { Pin } from '../../types'

/**
 * My Pins tab — mirrors `src/pages/Dashboard.tsx` reelst section
 * (lines ~666-763). Structure:
 *
 *  - TabHeader (gradient icon chip + bold title + smoke subtitle)
 *  - Row: "Your Pins" h3 + "+ Add Pin" CTA
 *  - Loading state: 2 skeleton cards
 *  - Empty state: tangerine-soft circle + MapPin + "Drop your first
 *    pin" + Create Pin button
 *  - Populated state: 2-column grid of PinCard components
 */
interface Props {
  isPro?: boolean
  onAddPin?: () => void
  onPinPress?: (pin: Pin) => void
  onToggleEnabled?: (pin: Pin, next: boolean) => void
  onUpgrade?: () => void
}

export function MyPinsTab({ isPro, onAddPin, onPinPress, onToggleEnabled, onUpgrade }: Props) {
  const { pins, loading } = usePins()

  return (
    <View>
      {/* TabHeader */}
      <View style={styles.tabHeader}>
        <View style={styles.iconChip}>
          <MapPin size={20} color={COLORS.warmWhite} weight="regular" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>My Pins</Text>
          <Text style={styles.tabSubtitle}>Listings, sold homes, and spotlights on your map</Text>
        </View>
      </View>

      {/* Section bar */}
      <View style={styles.sectionBar}>
        <Text style={styles.sectionTitle}>Your Pins</Text>
        <Pressable
          onPress={() => { lightTap(); onAddPin?.() }}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
        >
          <Plus size={14} color={COLORS.warmWhite} weight="bold" />
          <Text style={styles.addBtnText}>Add Pin</Text>
        </Pressable>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.grid}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : pins.length === 0 ? (
        <EmptyState onCreate={onAddPin} />
      ) : (
        <View style={styles.grid}>
          {pins.map((pin) => (
            <View key={pin.id} style={styles.col}>
              <PinCard
                pin={pin}
                isPro={isPro}
                onPress={() => onPinPress?.(pin)}
                onToggleEnabled={(next) => onToggleEnabled?.(pin, next)}
                onUpgradePress={onUpgrade}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function SkeletonCard() {
  return (
    <View style={styles.col}>
      <View style={styles.skeleton}>
        <View style={styles.skelHero} />
        <View style={styles.skelBody}>
          <View style={[styles.skelLine, { width: '66%' }]} />
          <View style={[styles.skelLine, { width: '50%', marginTop: 8 }]} />
        </View>
      </View>
    </View>
  )
}

function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <MapPin size={28} color={COLORS.tangerine} weight="fill" />
      </View>
      <Text style={styles.emptyTitle}>Drop your first pin</Text>
      <Text style={styles.emptyBody}>Add a listing, spotlight, or open house to your map.</Text>
      <Pressable
        onPress={() => { lightTap(); onCreate?.() }}
        style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.9 }]}
      >
        <Plus size={18} color={COLORS.warmWhite} weight="bold" />
        <Text style={styles.emptyCtaText}>Create Pin</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D94A1F',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  tabTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  tabSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 2 },

  sectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: { fontFamily: FONTS.humanistBold, fontSize: 16, color: COLORS.ink },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.tangerine,
  },
  addBtnText: { fontFamily: FONTS.humanistBold, fontSize: 12, color: COLORS.warmWhite },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  col: { width: '50%', paddingHorizontal: 6, marginBottom: 12 },

  skeleton: {
    backgroundColor: COLORS.cream,
    borderRadius: 18,
    padding: 14,
  },
  skelHero: { aspectRatio: 16 / 10, borderRadius: 12, backgroundColor: COLORS.pearl, marginBottom: 12 },
  skelBody: {},
  skelLine: { height: 10, borderRadius: 4, backgroundColor: COLORS.pearl },

  empty: {
    backgroundColor: COLORS.cream,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: FONTS.humanistBold, fontSize: 18, color: COLORS.ink, marginBottom: 4 },
  emptyBody: { fontFamily: FONTS.humanist, fontSize: 14, color: COLORS.smoke, textAlign: 'center', marginBottom: 20 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.tangerine,
    shadowColor: '#D94A1F',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
  },
  emptyCtaText: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.warmWhite },
})
