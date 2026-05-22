import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { House, Compass, Key, Sparkle, CursorClick, MapPin as MapPinIcon } from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { PIN_CONFIG, formatPrice, displayAddressWithUnit, type Pin } from '../types'
import { lightTap, selection } from '../lib/haptics'

/**
 * RN port of `src/components/dashboard/PinCard.tsx` (manage variant).
 *
 * Structural note (RN-specific): the outer is a View, not a Pressable.
 * Inside, the hero+address+specs section is one Pressable (opens
 * action sheet), and the toggle is a SIBLING Pressable so its tap
 * doesn't bubble through and double-fire the parent.
 *
 * The three-dots button is intentionally omitted on mobile — tapping
 * the card itself opens the actions bottom sheet (per user direction).
 *
 * Hero image fallback chain:
 *   heroPhotoUrl → photos[0] (carousel) → content[0].thumbnailUrl →
 *   content[0].mediaUrl → typed gradient with faded icon
 */

interface Props {
  pin: Pin
  isPro?: boolean
  onPress?: () => void
  onToggleEnabled?: (next: boolean) => void
  onUpgradePress?: () => void
}

const TYPE_ICON: Record<Pin['type'], React.ComponentType<{ size?: number; color?: string; weight?: 'light' | 'regular' | 'fill' }>> = {
  for_sale: House,
  sold: Key,
  spotlight: Compass,
}

const TYPE_GRADIENT: Record<Pin['type'], [string, string]> = {
  for_sale: ['#3B82F6', '#2563EB'],
  sold: ['#34C759', '#22A34B'],
  spotlight: ['#FF6B3D', '#E8522A'],
}

export function PinCard({ pin, isPro = false, onPress, onToggleEnabled, onUpgradePress }: Props) {
  const config = PIN_CONFIG[pin.type]
  const Icon = TYPE_ICON[pin.type]
  const heroImage = pin.heroPhotoUrl
    ?? pin.photos?.[0]
    ?? pin.content?.[0]?.thumbnailUrl
    ?? pin.content?.[0]?.mediaUrl
    ?? null
  const price = formatPrice(pin.price ?? pin.soldPrice)
  const specs = pin.beds != null
    ? `${pin.beds ?? 0} bd · ${pin.baths ?? 0} ba · ${(pin.sqft ?? 0).toLocaleString()} sqft`
    : null
  const isDisabled = pin.enabled === false
  const taps = pin.taps ?? 0

  return (
    <View style={[styles.card, isDisabled && styles.disabled]}>
      {/* Top tappable region — image + address + specs + stats.
          Opens the actions bottom sheet via onPress. */}
      <Pressable
        onPress={() => { lightTap(); onPress?.() }}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {heroImage ? (
            <>
              <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <LinearGradient
              colors={TYPE_GRADIENT[pin.type]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.fallback]}
            >
              <Icon size={40} color="rgba(255,255,255,0.3)" weight="light" />
            </LinearGradient>
          )}

          {/* Type pill */}
          <View style={styles.typePill}>
            <Text style={[styles.typePillText, { color: config.color }]}>{config.label}</Text>
          </View>

          {/* Price overlay */}
          {price ? (
            <View style={styles.priceWrap}>
              <Text style={styles.price}>{price}</Text>
            </View>
          ) : null}
        </View>

        {/* Body — address + specs + taps (no toggle here; toggle is a
            sibling Pressable below). */}
        <View style={styles.body}>
          <View style={styles.addressLine}>
            <MapPinIcon size={13} color={COLORS.ash} weight="regular" />
            <Text style={styles.address} numberOfLines={1}>
              {displayAddressWithUnit(pin)}
            </Text>
          </View>
          {specs ? <Text style={styles.specs}>{specs}</Text> : null}
        </View>
      </Pressable>

      {/* Toggle row — sibling of the Pressable above so tapping it
          doesn't bubble into onPress. Stats on the left, toggle on
          the right. */}
      <View style={styles.statsRow}>
        {isPro ? (
          <View style={styles.stat}>
            <CursorClick size={12} color={COLORS.smoke} weight="regular" />
            <Text style={styles.statText}>{taps.toLocaleString()}</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => { lightTap(); onUpgradePress?.() }}
            style={styles.stat}
            hitSlop={6}
          >
            <CursorClick size={12} color={COLORS.smoke} weight="regular" />
            <Text style={[styles.statText, styles.statBlur]}>
              {(taps || 42).toLocaleString()}
            </Text>
            <Sparkle size={10} color={COLORS.tangerine} weight="fill" />
          </Pressable>
        )}
        {onToggleEnabled ? (
          <Pressable
            onPress={() => { selection(); onToggleEnabled(!pin.enabled) }}
            hitSlop={8}
            style={[styles.toggle, pin.enabled === false ? styles.toggleOff : styles.toggleOn]}
          >
            <View style={[styles.toggleKnob, pin.enabled === false ? styles.knobOff : styles.knobOn]} />
          </Pressable>
        ) : null}
      </View>
    </View>
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
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  hero: {
    aspectRatio: 16 / 10,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.pearl,
  },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  typePill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  typePillText: { fontFamily: FONTS.humanistBold, fontSize: 11, letterSpacing: 0.2 },
  priceWrap: { position: 'absolute', bottom: 12, left: 12 },
  price: {
    fontFamily: FONTS.humanistBold,
    fontSize: 18,
    color: COLORS.warmWhite,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
  },

  body: { paddingTop: 14, paddingHorizontal: 14, paddingBottom: 8, gap: 4 },
  addressLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { fontFamily: FONTS.humanistMedium, fontSize: 13, color: COLORS.graphite, flex: 1 },
  specs: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 6,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontFamily: FONTS.humanistMedium, fontSize: 11, color: COLORS.smoke },
  statBlur: {
    color: 'rgba(107, 114, 128, 0.65)',
    textShadowColor: COLORS.smoke,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  toggle: {
    marginLeft: 'auto',
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: COLORS.tangerine },
  toggleOff: { backgroundColor: COLORS.pearl },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.warmWhite,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  knobOn: { transform: [{ translateX: 20 }] },
  knobOff: { transform: [{ translateX: 0 }] },
})
