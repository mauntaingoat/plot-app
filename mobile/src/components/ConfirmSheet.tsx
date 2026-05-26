/**
 * ConfirmSheet — branded replacement for `Alert.alert` confirmations.
 *
 * Always prefer this over the iOS native alert for destructive or
 * meaningful choices (sign out, leave onboarding, discard, delete).
 * The native alert is the wrong texture for a brand that lives or
 * dies by feel — it breaks the user out of our world into iOS chrome.
 *
 * Variants:
 *   - default     → confirm button uses brand gradient
 *   - destructive → confirm button uses red (sign out, discard, delete)
 *
 * Type-to-confirm mode (`requireTypedConfirmation="DELETE"`):
 *   - Renders a text input the user must fill with the literal string
 *   - Confirm button disabled until match (case-sensitive)
 *   - Used for irreversible actions (account deletion)
 */
import { useEffect, useState } from 'react'
import { View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native'
import { BottomSheet } from './BottomSheet'
import { BrandButton } from './BrandButton'
import { COLORS, FONTS } from '../lib/tokens'
import { useColors } from '../lib/theme'
import { lightTap, warning } from '../lib/haptics'

interface Props {
  visible: boolean
  title: string
  message?: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  /** When set, renders a text input the user must fill with this exact
   *  string before the confirm button enables. For irreversible actions. */
  requireTypedConfirmation?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  requireTypedConfirmation,
  onConfirm,
  onClose,
}: Props) {
  const colors = useColors()
  const [typed, setTyped] = useState('')

  // Reset the typed value every time the sheet opens so a previous
  // attempt doesn't leak across re-opens.
  useEffect(() => { if (visible) setTyped('') }, [visible])

  const typedMatches = !requireTypedConfirmation || typed === requireTypedConfirmation
  const confirmDisabled = !typedMatches || loading

  const handleConfirm = () => {
    if (confirmDisabled) return
    if (destructive) warning(); else lightTap()
    onConfirm()
  }

  return (
    <BottomSheet visible={visible} onClose={loading ? () => {} : onClose}>
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        {message ? (
          <Text style={[styles.message, { color: colors.smoke }]}>{message}</Text>
        ) : null}

        {requireTypedConfirmation ? (
          <View style={{ marginTop: 14 }}>
            <Text style={[styles.typedLabel, { color: colors.smoke }]}>
              Type <Text style={styles.typedLiteral}>{requireTypedConfirmation}</Text> to confirm
            </Text>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              editable={!loading}
              placeholder={requireTypedConfirmation}
              placeholderTextColor={colors.ash}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceBg,
                  borderColor: typedMatches ? COLORS.liveRed : colors.border,
                  color: colors.ink,
                },
              ]}
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={() => { lightTap(); onClose() }}
            disabled={loading}
            style={({ pressed }) => [
              styles.cancelBtn,
              { backgroundColor: colors.surfaceBg, borderColor: colors.border },
              pressed && { opacity: 0.7 },
              loading && { opacity: 0.4 },
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.ink }]}>{cancelLabel}</Text>
          </Pressable>

          <View style={{ flex: 1.4 }}>
            {destructive ? (
              <Pressable
                onPress={handleConfirm}
                disabled={confirmDisabled}
                style={({ pressed }) => [
                  styles.dangerBtn,
                  confirmDisabled && styles.dangerBtnDisabled,
                  pressed && !confirmDisabled && { opacity: 0.85 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.warmWhite} />
                ) : (
                  <Text style={styles.dangerText}>{confirmLabel}</Text>
                )}
              </Pressable>
            ) : (
              <BrandButton
                label={confirmLabel}
                onPress={handleConfirm}
                disabled={confirmDisabled}
                loading={loading}
              />
            )}
          </View>
        </View>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  title: {
    fontFamily: FONTS.humanistBold, fontSize: 20, lineHeight: 26,
    color: COLORS.ink, letterSpacing: -0.3,
  },
  message: {
    fontFamily: FONTS.humanist, fontSize: 14, lineHeight: 20,
    color: COLORS.smoke, marginTop: 6,
  },
  typedLabel: {
    fontFamily: FONTS.humanistSemibold, fontSize: 12,
    color: COLORS.smoke, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  typedLiteral: {
    fontFamily: FONTS.humanistBold,
    color: COLORS.liveRed,
    letterSpacing: 0.6,
  },
  input: {
    height: 48, borderRadius: 12, borderWidth: 2,
    paddingHorizontal: 14,
    fontFamily: FONTS.humanistBold, fontSize: 15,
    letterSpacing: 0.6,
  },
  actions: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    height: 52, borderRadius: 999, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontFamily: FONTS.humanistBold, fontSize: 15, letterSpacing: -0.1 },
  dangerBtn: {
    height: 52, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.liveRed,
    shadowColor: COLORS.liveRed,
    shadowOpacity: 0.22, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
  },
  dangerBtnDisabled: { backgroundColor: 'rgba(255,59,48,0.35)', shadowOpacity: 0 },
  dangerText: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.warmWhite, letterSpacing: -0.1 },
})
