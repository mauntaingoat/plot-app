import { View, StyleSheet, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS } from '../lib/tokens'

/**
 * 40×40 brand-gradient icon chip used by every dashboard tab header.
 * Mirrors the web TabHeader (Dashboard.tsx:79-94):
 *   background: linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)
 *   rounded-2xl, white icon inside
 */
export function BrandIconChip({ children, size = 40, style }: { children: React.ReactNode; size?: number; style?: ViewStyle }) {
  const dim = { width: size, height: size }
  return (
    <View style={[dim, styles.wrap, style]}>
      <LinearGradient
        colors={['#FF8552', '#D94A1F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D94A1F',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
})
