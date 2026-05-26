import { useEffect } from 'react'
import { Modal, View, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { COLORS } from '../lib/tokens'
import { useColors } from '../lib/theme'

/**
 * Reusable iOS-feel bottom sheet.
 *
 * Behaviour:
 *  - Slides up from the bottom on `visible` toggle to true
 *  - Tap the scrim → dismiss
 *  - Drag the sheet down past 25% of its height → dismiss (snaps to
 *    closed). Drag a shorter distance → eases back to open.
 *  - Native-stack iOS swipe-back gesture still works on the parent
 *    screen because this is a Modal layered above it.
 *
 * Animation choice: timing-based (not spring) so the sheet never
 * overshoots its resting position. A springy presentation briefly
 * pushed translateY negative, lifting the sheet off the bottom edge
 * and exposing the page background beneath it — visually broken.
 * Apple's own sheet presentations use an ease-out curve, not a spring.
 *
 * Used by PinActionsSheet, SetupChecklistSheet, ConfirmSheet, etc.
 */

interface Props {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
}

// iOS native sheet curve — fast start, gentle settle, zero overshoot.
const IOS_EASE = Easing.bezier(0.32, 0.72, 0, 1)
const OPEN_MS = 320
const CLOSE_MS = 240
const SNAP_BACK_MS = 220
const DISMISS_THRESHOLD = 0.25

export function BottomSheet({ visible, onClose, children }: Props) {
  const { height: screenHeight } = useWindowDimensions()
  const colors = useColors()
  // translateY in pixels. 0 = fully shown. screenHeight = fully hidden below.
  const translateY = useSharedValue(screenHeight)
  // Scrim opacity 0..1, where 1 = fully visible.
  const scrimOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: OPEN_MS, easing: IOS_EASE })
      scrimOpacity.value = withTiming(1, { duration: OPEN_MS })
    } else {
      translateY.value = withTiming(screenHeight, { duration: CLOSE_MS, easing: IOS_EASE })
      scrimOpacity.value = withTiming(0, { duration: CLOSE_MS })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value * 0.5,
  }))

  // Pan gesture: drag-down to dismiss. translateY clamped at 0 so an
  // upward gesture never lifts the sheet off the bottom edge.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const dy = Math.max(0, e.translationY)
      translateY.value = dy
      scrimOpacity.value = 1 - (dy / screenHeight) * 0.6
    })
    .onEnd((e) => {
      const draggedFar = e.translationY > screenHeight * DISMISS_THRESHOLD
      const velocityDown = e.velocityY > 800
      if (draggedFar || velocityDown) {
        translateY.value = withTiming(screenHeight, { duration: CLOSE_MS, easing: IOS_EASE })
        scrimOpacity.value = withTiming(0, { duration: CLOSE_MS })
        runOnJS(onClose)()
      } else {
        translateY.value = withTiming(0, { duration: SNAP_BACK_MS, easing: IOS_EASE })
        scrimOpacity.value = withTiming(1, { duration: SNAP_BACK_MS })
      }
    })

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <AnimatedPressable
          accessible={false}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
        />
        <View pointerEvents="box-none" style={styles.sheetAnchor}>
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.sheet, { backgroundColor: colors.cardBg }, sheetStyle]}>
              <SafeAreaView edges={['bottom']} style={styles.safe}>
                <View style={styles.handle} />
                {children}
              </SafeAreaView>
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </Modal>
  )
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const styles = StyleSheet.create({
  scrim: { backgroundColor: '#000' },
  sheetAnchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.warmWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 24,
  },
  safe: { paddingTop: 10, paddingBottom: 8, paddingHorizontal: 8 },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.pearl,
    marginBottom: 8,
  },
})
