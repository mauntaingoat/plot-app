import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Sparkle, CursorClick, MapPin as MapPinIcon } from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { useThemedStyles } from '../lib/theme'
import { OpenHouseBadge } from './OpenHouseBadge'
import { PIN_CONFIG, formatPrice, displayAddressWithUnit, type Pin } from '../types'
import { lightTap, selection } from '../lib/haptics'
import { PinHeroImage } from './PinHeroImage'
// TYPE_GRADIENT + TYPE_ICON now live in PinHeroImage — they're only
// needed for the typed fallback that's rendered when the photo URL
// fails to load. PinCard delegates the entire image area to that
// component which handles success/failure/fallback uniformly.

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

/** True when the pin has an openHouse with at least one session. The
 *  iOS Pin type leaves `openHouse` as `unknown` so the field shape is
 *  validated here before reading sessions. */
function hasActiveOpenHouse(pin: Pin): boolean {
  const oh = (pin as Pin & { openHouse?: unknown }).openHouse
  if (!oh || typeof oh !== 'object') return false
  const sessions = (oh as { sessions?: unknown }).sessions
  return Array.isArray(sessions) && sessions.length > 0
}

export function PinCard({ pin, isPro = false, onPress, onToggleEnabled, onUpgradePress }: Props) {
  const styles = useThemedStyles(_styles)
  const config = PIN_CONFIG[pin.type]
  // Hero image priority: explicit heroPhotoUrl → first listing photo
  // → first content thumbnail → first content mediaUrl → null
  // (gradient fallback). Pins on Reelst can have any combination of
  // listing photos + content (reels/photos), so we walk both arrays.
  const heroImage = pin.heroPhotoUrl
    || pin.photos?.[0]
    || pin.content?.[0]?.thumbnailUrl
    || pin.content?.[0]?.mediaUrl
    || null
  const price = formatPrice(pin.price ?? pin.soldPrice)
  const specs = pin.beds != null
    ? `${pin.beds ?? 0} bd · ${pin.baths ?? 0} ba · ${(pin.sqft ?? 0).toLocaleString()} sqft`
    : null
  // Optimistic visibility — flip immediately on toggle tap so both the
  // knob AND the card opacity transition instantly, before Firestore /
  // the setPinEnabled callable round-trip completes. Sync from prop
  // when the snapshot arrives.
  const [visualEnabled, setVisualEnabled] = useState(pin.enabled !== false)
  useEffect(() => { setVisualEnabled(pin.enabled !== false) }, [pin.enabled])
  const isDisabled = !visualEnabled
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
          <PinHeroImage url={heroImage} type={pin.type} />
          {/* Subtle bottom darkening so the price stays legible on
              both photo + typed-gradient backgrounds. */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Type pill */}
          <View style={styles.typePill}>
            <Text style={[styles.typePillText, { color: config.color }]}>{config.label}</Text>
          </View>

          {/* Open House badge — for_sale pins only, when an OH with
              at least one session is scheduled. Matches the rainbow
              ring on the map pin so the card + map agree visually. */}
          {pin.type === 'for_sale' && hasActiveOpenHouse(pin) ? (
            <View style={styles.openHouseBadge}>
              <OpenHouseBadge size={26} />
            </View>
          ) : null}

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
          <VisibilityToggle
            enabled={visualEnabled}
            onChange={(next) => {
              setVisualEnabled(next)  // instant — drives card opacity + knob
              onToggleEnabled(next)   // Firestore / callable in background
            }}
          />
        ) : null}
      </View>
    </View>
  )
}

/**
 * Self-contained visibility toggle with optimistic UI + spring-animated
 * knob. Mirrors the web `<ToggleSwitch />` (Dashboard.tsx:2136) using
 * framer-motion's animate with spring damping 20, stiffness 400.
 *
 * Optimistic: on tap, flip the local visual state IMMEDIATELY and
 * fire onChange. When the Firestore snapshot returns and updates the
 * `enabled` prop, sync the visual state. If the write fails and the
 * prop never updates, the optimistic flip is reconciled by the next
 * snapshot (which will reflect the unchanged true value).
 */
/**
 * Controlled toggle. PinCard owns the optimistic state; this component
 * just renders the spring-animated knob driven by the `enabled` prop.
 * Spring matches the web ToggleSwitch: damping 20 / stiffness 400.
 */
function VisibilityToggle({ enabled, onChange }: { enabled: boolean; onChange: (next: boolean) => void }) {
  const styles = useThemedStyles(_styles)
  // Exact mirror of web ToggleSwitch (Dashboard.tsx:2136):
  //   44×24 track, 16×16 ball, ball positioned at top:4 left:2,
  //   animates translateX 0 → 18 (so left edge goes 2 → 20).
  // Spring matches: damping 20, stiffness 400.
  const x = useSharedValue(enabled ? 18 : 0)

  useEffect(() => {
    x.value = withSpring(enabled ? 18 : 0, { damping: 20, stiffness: 400 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  return (
    <Pressable
      onPress={() => { selection(); onChange(!enabled) }}
      hitSlop={8}
      style={{
        marginLeft: 'auto',
        width: 44,
        height: 24,
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: enabled ? 'transparent' : COLORS.pearl,
      }}
    >
      {enabled ? (
        // Brand gradient when ON — matches the gradient used on header
        // tab icon chips and the Add Pin button.
        <LinearGradient
          colors={[...COLORS.brandGradient]}
          locations={[...COLORS.brandGradientLocations]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 4,
            left: 2,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: COLORS.warmWhite,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 2,
          },
          knobStyle,
        ]}
      />
    </Pressable>
  )
}

const _styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    // Slightly elevated shadow to match the lifted feel of web pin
    // cards (which have shadow-sm + a soft glow from the ivory bg).
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  hero: {
    aspectRatio: 16 / 10,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.pearl,
  },
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
  openHouseBadge: { position: 'absolute', top: 12, right: 12 },
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
