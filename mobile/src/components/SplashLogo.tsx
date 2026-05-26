/**
 * SplashLogo — full-screen brand splash with a gently pulsing logo
 * icon. Used by RootNavigator while the auth listener boots, and as
 * a brief transition between sign-in and the dashboard so the swap
 * doesn't feel jarring.
 *
 * The pulse is opacity-only (1.0 → 0.55 → 1.0 over ~1.4s, looping)
 * so the icon never feels jumpy. Pure JS Animated — no Reanimated
 * dependency at the top-level boot path.
 */
import { useEffect, useRef } from 'react'
import { View, Image, StyleSheet, Animated, Easing } from 'react-native'
import { COLORS } from '../lib/tokens'

export function SplashLogo({ size = 96 }: { size?: number }) {
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ opacity }}>
        <Image
          source={require('../../assets/reelst-logo.png')}
          style={[styles.icon, { width: size, height: size }]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 96, height: 96 },
})
