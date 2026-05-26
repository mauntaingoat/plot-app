import { useState } from 'react'
import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { useThemedStyles } from '../lib/theme'

/**
 * Native port of the web app's input field.
 *
 * Web styling (`<Input />` and direct `<input>` in Welcome.tsx):
 *  - background: warm white
 *  - border: 2px pearl (#EDEAE4) → tangerine/40 on focus
 *  - radius: 16px (rounded-2xl)
 *  - padding: 16px vertical, 20px horizontal (py-4 px-5)
 *  - text: 15px, ink, Outfit (humanist) weight 400
 *  - placeholder: #D4D0C8
 *  - focus ring: subtle tangerine border tint
 *
 * `forceLight` bypasses the dark-mode theme swap. Used by auth screens
 * (SignIn/Welcome/Verify) which intentionally render light-only — the
 * marketing surface shouldn't shift palettes based on the device's
 * dark mode preference. (The dashboard itself does theme-swap.)
 */

interface Props extends TextInputProps {
  /** Visual focus state ring color override. */
  focusRingColor?: string
  /** When true, skip the dark-mode token swap. Auth screens use this
   *  to stay light regardless of the device's appearance setting. */
  forceLight?: boolean
}

export function BrandInput({ style, focusRingColor, onFocus, onBlur, forceLight, ...rest }: Props) {
  const [focused, setFocused] = useState(false)
  const themed = useThemedStyles(_styles)
  const styles = forceLight ? _styles : themed
  return (
    <View
      style={[
        styles.outer,
        focused && { borderColor: focusRingColor ?? 'rgba(217, 74, 31, 0.4)' },
      ]}
    >
      <TextInput
        {...rest}
        onFocus={(e) => { setFocused(true); onFocus?.(e) }}
        onBlur={(e) => { setFocused(false); onBlur?.(e) }}
        placeholderTextColor={'#D4D0C8'}
        style={[styles.input, style]}
      />
    </View>
  )
}

const _styles = StyleSheet.create({
  outer: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.pearl,
    backgroundColor: COLORS.warmWhite,
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 15,
    color: COLORS.ink,
    fontFamily: FONTS.humanist,
  },
})
