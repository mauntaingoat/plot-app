import { View, Image, Text, StyleSheet } from 'react-native'

/**
 * Native port of the web app's `ReelstLogo` component.
 * Renders the pin icon (`/reelst-logo.png` mirrored in mobile/assets)
 * + the "Reelst" wordmark. Sizes mirror the web component's xs/sm/md/lg/xl/xxl.
 */
export type ReelstLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

const SIZES: Record<ReelstLogoSize, { icon: number; text: number; gap: number }> = {
  xs: { icon: 18, text: 14, gap: 6 },
  sm: { icon: 28, text: 18, gap: 8 },
  md: { icon: 36, text: 22, gap: 8 },
  lg: { icon: 44, text: 28, gap: 10 },
  xl: { icon: 56, text: 36, gap: 12 },
  xxl: { icon: 80, text: 48, gap: 16 },
}

interface Props {
  size?: ReelstLogoSize
  color?: 'ink' | 'white'
}

export function ReelstLogo({ size = 'md', color = 'ink' }: Props) {
  const dims = SIZES[size]
  const textColor = color === 'white' ? '#FFFFFF' : '#0A0E17'
  return (
    <View style={[styles.row, { gap: dims.gap }]}>
      <Image
        source={require('../../assets/reelst-logo.png')}
        style={{ width: dims.icon, height: dims.icon }}
        resizeMode="contain"
      />
      <Text style={[styles.text, { fontSize: dims.text, color: textColor }]}>Reelst</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { fontWeight: '700', letterSpacing: -0.5 },
})
