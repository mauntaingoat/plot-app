/**
 * Tiny haptic-feedback wrapper — iOS taptic engine flair.
 *
 * Calls are no-ops on simulators that don't support haptics and on
 * Android (we wrap conditionally so the iOS feel isn't accidentally
 * recreated on Android in a non-idiomatic way).
 */
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

const iOS = Platform.OS === 'ios'

export function lightTap() {
  if (iOS) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

export function mediumTap() {
  if (iOS) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
}

export function success() {
  if (iOS) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}

export function warning() {
  if (iOS) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
}

export function errorTap() {
  if (iOS) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
}

export function selection() {
  if (iOS) Haptics.selectionAsync()
}
