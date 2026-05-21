import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { House, Compass, Sparkle, DotsThree } from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { PIN_CONFIG, formatPrice, displayAddressWithUnit, type Pin } from '../types'
import { lightTap } from '../lib/haptics'

/**
 * Native port of `src/components/dashboard/PinCard.tsx` (manage
 * variant). Visual elements mirrored from web:
 *
 *  - 16:10 hero image with bottom-to-top black gradient overlay
 *  - Type pill top-left (white-95 bg, type-colored text, 11px bold)
 *  - More-actions button top-right (translucent circle, DotsThree)
 *  - Price bottom-left (mono-ish bold 18px white with drop shadow)
 *  - Address + specs below image (15px ink + 12px smoke)
 *  - Disabled (`enabled === false`) pins render at 0.55 opacity
 *
 * Skipped from web's manage variant for now (will land later):
 *  - Engagement stats row (visits / taps / saves)
 *  - Open house badge
 *  - Pro upgrade lock on stats
 *  - Pending-change pulsing indicator
 */

interface Props {
  pin: Pin
  onPress?: () => void
  onMorePress?: () => void
}

const TYPE_ICON: Record<Pin['type'], React.ComponentType<{ size?: number; color?: string; weight?: 'fill' | 'regular' }>> = {
  for_sale: House,
  sold: Compass,
  spotlight: Sparkle,
}

export function PinCard({ pin, onPress, onMorePress }: Props) {
  const config = PIN_CONFIG[pin.type]
  const Icon = TYPE_ICON[pin.type]
  const heroImage = pin.heroPhotoUrl
    ?? pin.content?.[0]?.thumbnailUrl
    ?? pin.content?.[0]?.mediaUrl
    ?? null
  const price = formatPrice(pin.price ?? pin.soldPrice)
  const specs = pin.beds != null
    ? `${pin.beds ?? 0} bd · ${pin.baths ?? 0} ba · ${(pin.sqft ?? 0).toLocaleString()} sqft`
    : null
  const isDisabled = pin.enabled === false

  return (
    <Pressable
      onPress={() => { lightTap(); onPress?.() }}
      style={({ pressed }) => [
        styles.card,
        isDisabled && styles.disabled,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* Hero */}
      <View style={styles.hero}>
        {heroImage ? (
          <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          // Fallback: typed gradient background + large faded icon
          <View style={[StyleSheet.absoluteFill, { backgroundColor: config.bgColor, alignItems: 'center', justifyContent: 'center' }]}>
            <Icon size={48} color="rgba(255,255,255,0.35)" weight="regular" />
          </View>
        )}

        {/* Gradient overlay (bottom-to-top black 60 → transparent) */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Type pill */}
        <View style={styles.typePill}>
          <Text style={[styles.typePillText, { color: config.color }]}>{config.label}</Text>
        </View>

        {/* More actions */}
        {onMorePress ? (
          <Pressable
            onPress={() => { lightTap(); onMorePress() }}
            style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.7 }]}
          >
            <DotsThree size={18} color={COLORS.warmWhite} weight="bold" />
          </Pressable>
        ) : null}

        {/* Price overlay */}
        {price ? (
          <View style={styles.priceWrap}>
            <Text style={styles.price}>{price}</Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.address} numberOfLines={2}>{displayAddressWithUnit(pin)}</Text>
        {specs ? <Text style={styles.specs}>{specs}</Text> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    // Soft elevation, matches web's shadow-sm
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  disabled: { opacity: 0.55 },
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
  typePillText: {
    fontFamily: FONTS.humanistBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  moreBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  body: { padding: 14, gap: 4 },
  address: { fontFamily: FONTS.humanistSemibold, fontSize: 14, color: COLORS.ink, lineHeight: 19 },
  specs: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke },
})
