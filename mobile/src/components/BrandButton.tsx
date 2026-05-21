import { Pressable, Text, View, ActivityIndicator, StyleSheet, type PressableProps, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, FONTS } from '../lib/tokens'
import { lightTap } from '../lib/haptics'

/**
 * Native port of the web app's `brand-btn brand-btn--no-tilt` button.
 *
 * Visuals (from `src/styles/index.css`):
 *  - Background: linear-gradient(135°, #FF8552 0%, #F26340 35%, #D94A1F 100%)
 *  - Box shadow: 0 8px 22px -4px rgba(217,74,31,0.48) + inner highlight
 *  - Press state: scale(0.98) — matches `brand-btn--no-tilt:active`
 *  - Disabled state: 0.5 opacity
 *  - Default height: 48 (web `h-12`), radius: 8, padding: 24 horizontal
 *  - Text: weight 600, 15px, white, Outfit (humanist family)
 *
 * iOS flair via lightTap haptic on press.
 */

interface Props extends Omit<PressableProps, 'style'> {
  label: string
  loading?: boolean
  trailing?: React.ReactNode
  height?: number
  fullWidth?: boolean
  style?: ViewStyle
}

export function BrandButton({
  label,
  loading,
  trailing,
  height = 48,
  fullWidth = true,
  onPress,
  disabled,
  style,
  ...rest
}: Props) {
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      onPress={(e) => {
        lightTap()
        onPress?.(e)
      }}
      style={({ pressed }) => [
        styles.outer,
        fullWidth && styles.fullWidth,
        { height },
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={[...COLORS.brandGradient]}
        locations={[...COLORS.brandGradientLocations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { height }]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.content}>
            <Text style={styles.label}>{label}</Text>
            {trailing}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 8,
    // Tangerine drop shadow — mirrors web's
    // `0 8px 22px -4px rgba(217,74,31,0.48)`.
    shadowColor: '#D94A1F',
    shadowOpacity: 0.48,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 22,
    // Android elevation (won't show on iOS but harmless)
    elevation: 8,
  },
  fullWidth: { alignSelf: 'stretch' },
  gradient: {
    borderRadius: 8,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: FONTS.humanistSemibold,
    fontSize: 15,
    color: COLORS.warmWhite,
    letterSpacing: 0,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
})
