import { useEffect } from 'react'
import { Modal, View, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { COLORS } from '../lib/tokens'

/**
 * Reusable iOS-feel bottom sheet.
 *
 * Behaviour:
 *  - Slides up from the bottom on `visible` toggle to true
 *  - Tap the scrim → dismiss
 *  - Drag the sheet down past 25% of its height → dismiss (snaps to
 *    closed). Drag a shorter distance → springs back to open.
 *  - Native-stack iOS swipe-back gesture still works on the parent
 *    screen because this is a Modal layered above it.
 *
 * Used by PinActionsSheet, SetupChecklistSheet, etc.
 */

interface Props {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
}

const SPRING = { damping: 22, stiffness: 280, mass: 0.7 }
const DISMISS_THRESHOLD = 0.25

export function BottomSheet({ visible, onClose, children }: Props) {
  const { height: screenHeight } = useWindowDimensions()
  // translateY in pixels. 0 = fully shown. screenHeight = fully hidden below.
  const translateY = useSharedValue(screenHeight)
  // Scrim opacity 0..1, where 1 = fully visible.
  const scrimOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING)
      scrimOpacity.value = withTiming(1, { duration: 220 })
    } else {
      translateY.value = withTiming(screenHeight, { duration: 200 })
      scrimOpacity.value = withTiming(0, { duration: 180 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value * 0.5,
  }))

  // Pan gesture: drag-down to dismiss.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY
        // Fade the scrim a little as user drags down.
        scrimOpacity.value = 1 - (e.translationY / screenHeight) * 0.6
      }
    })
    .onEnd((e) => {
      const draggedFar = e.translationY > screenHeight * DISMISS_THRESHOLD
      const velocityDown = e.velocityY > 800
      if (draggedFar || velocityDown) {
        translateY.value = withTiming(screenHeight, { duration: 200 })
        scrimOpacity.value = withTiming(0, { duration: 180 })
        runOnJS(onClose)()
      } else {
        translateY.value = withSpring(0, SPRING)
        scrimOpacity.value = withSpring(1, SPRING)
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
            <Animated.View style={[styles.sheet, sheetStyle]}>
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
