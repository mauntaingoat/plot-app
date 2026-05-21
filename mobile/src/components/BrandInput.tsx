import { useState } from 'react'
import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native'
import { COLORS, FONTS } from '../lib/tokens'

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
 */

interface Props extends TextInputProps {
  /** Visual focus state ring color override. */
  focusRingColor?: string
}

export function BrandInput({ style, focusRingColor, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false)
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

const styles = StyleSheet.create({
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
