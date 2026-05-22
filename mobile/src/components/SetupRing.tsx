import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { COLORS, FONTS } from '../lib/tokens'

/**
 * Setup progress ring — tangerine→ember gradient stroke.
 * Mirrors `src/components/dashboard/SetupRing.tsx`.
 * Returns null when percent >= 100.
 */
interface Props {
  percent: number
  size?: number
}

export function SetupRing({ percent, size = 36 }: Props) {
  if (percent >= 100) return null
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FF6B3D" />
            <Stop offset="100%" stopColor="#E8522A" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={COLORS.pearl} strokeWidth={strokeWidth} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={styles.label}>
        <Text style={styles.text}>{Math.round(percent)}%</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  label: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: FONTS.humanistBold, fontSize: 9, color: COLORS.tangerine },
})
