import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MapPin, Plus } from 'phosphor-react-native'
import { PinCard } from '../../components/PinCard'
import { BrandIconChip } from '../../components/BrandIconChip'
import { COLORS, FONTS } from '../../lib/tokens'
import { useColors, useThemedStyles } from '../../lib/theme'
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
  const colors = useColors()
  const styles = useThemedStyles(_styles)

  return (
    <View>
      {/* TabHeader */}
      <View style={styles.tabHeader}>
        <BrandIconChip>
          <MapPin size={20} color={COLORS.warmWhite} weight="regular" />
        </BrandIconChip>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tabTitle, { color: colors.ink }]}>My Pins</Text>
          <Text style={[styles.tabSubtitle, { color: colors.smoke }]}>Listings, sold homes, and spotlights on your map</Text>
        </View>
      </View>

      {/* Section bar */}
      <View style={styles.sectionBar}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Your Pins</Text>
        <Pressable
          onPress={() => { lightTap(); onAddPin?.() }}
          style={({ pressed }) => [styles.addBtn, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient
            colors={[...COLORS.brandGradient]}
            locations={[...COLORS.brandGradientLocations]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Plus size={15} color={COLORS.warmWhite} weight="bold" />
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
  const styles = useThemedStyles(_styles)
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
  const styles = useThemedStyles(_styles)
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <MapPin size={28} color={COLORS.tangerine} weight="fill" />
      </View>
      <Text style={styles.emptyTitle}>Drop your first pin</Text>
      <Text style={styles.emptyBody}>Add a listing, spotlight, or open house to your map.</Text>
      <Pressable
        onPress={() => { lightTap(); onCreate?.() }}
        style={({ pressed }) => [styles.emptyCta, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <LinearGradient
          colors={[...COLORS.brandGradient]}
          locations={[...COLORS.brandGradientLocations]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Plus size={18} color={COLORS.warmWhite} weight="bold" />
        <Text style={styles.emptyCtaText}>Create Pin</Text>
      </Pressable>
    </View>
  )
}

const _styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
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
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    overflow: 'hidden',
    // Tangerine glow under the pill — matches the brand-btn-flat box-shadow
    shadowColor: '#D94A1F',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  addBtnText: { fontFamily: FONTS.humanistBold, fontSize: 13, color: COLORS.warmWhite },

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
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#D94A1F',
    shadowOpacity: 0.48,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 22,
    elevation: 8,
  },
  emptyCtaText: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.warmWhite },
})
