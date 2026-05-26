/**
 * Pro paywall overlay shown over the blurred advanced-insights
 * stack on Free tier. Mirrors the web Dashboard.tsx overlay.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowRight } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap } from '../../lib/haptics'

export function ProPaywall({ onUpgrade }: { onUpgrade: () => void }) {
  const styles = useThemedStyles(_styles)
  return (
    <View style={styles.wrap} pointerEvents="auto">
      <Text style={styles.title}>Unlock full analytics</Text>
      <Text style={styles.copy}>
        Per-pin breakdown, peak hours, save growth, content stats, and more.
      </Text>
      <Pressable
        onPress={() => { lightTap(); onUpgrade() }}
        style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <LinearGradient
          colors={[...COLORS.brandGradient]}
          locations={[...COLORS.brandGradientLocations]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.ctaText}>Go Pro — $19/mo</Text>
        <ArrowRight size={14} color={COLORS.warmWhite} weight="bold" />
      </Pressable>
    </View>
  )
}

const _styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  title: { fontFamily: FONTS.humanistBold, fontSize: 17, color: COLORS.ink, marginBottom: 6 },
  copy: {
    fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke,
    textAlign: 'center', maxWidth: 280, lineHeight: 18, marginBottom: 16,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 44, paddingHorizontal: 22,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#D94A1F',
    shadowOpacity: 0.45, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14,
    elevation: 6,
  },
  ctaText: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.warmWhite },
})
