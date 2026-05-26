/**
 * Edit-caption bottom sheet for a single content item. Multiline
 * text input, 300-char limit (matches web ContentLibrary CaptionEdit).
 * Saves via updatePinContentItem which writes both the pin's content
 * array and (best-effort) the standalone content doc.
 */
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native'
import { BottomSheet } from '../BottomSheet'
import { BrandButton } from '../BrandButton'
import { BrandInput } from '../BrandInput'
import { COLORS, FONTS } from '../../lib/tokens'
import { useColors, useThemedStyles } from '../../lib/theme'
import { lightTap } from '../../lib/haptics'
import { Pressable } from 'react-native'
import { X } from 'phosphor-react-native'

const MAX_CAPTION = 300

export function EditCaptionSheet({
  visible,
  initialCaption,
  onClose,
  onSave,
}: {
  visible: boolean
  initialCaption: string | null
  onClose: () => void
  onSave: (caption: string) => Promise<void>
}) {
  const styles = useThemedStyles(_styles)
  const colors = useColors()
  const [text, setText] = useState(initialCaption ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) setText(initialCaption ?? '')
  }, [visible, initialCaption])

  const save = async () => {
    setSaving(true)
    try {
      await onSave(text.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const remaining = MAX_CAPTION - text.length

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={20}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit caption</Text>
          <Pressable
            onPress={() => { lightTap(); onClose() }}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <X size={18} color={colors.smoke} weight="bold" />
          </Pressable>
        </View>
        <View style={styles.body}>
          <BrandInput
            value={text}
            onChangeText={(t) => setText(t.slice(0, MAX_CAPTION))}
            placeholder="Add a caption…"
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
          <Text style={[styles.counter, remaining < 20 && { color: COLORS.liveRed }]}>
            {text.length}/{MAX_CAPTION}
          </Text>
          <BrandButton label={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  )
}

const _styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  title: { flex: 1, fontFamily: FONTS.humanistBold, fontSize: 17, color: COLORS.ink },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 12 },
  counter: { fontFamily: FONTS.humanistMedium, fontSize: 11, color: COLORS.smoke, textAlign: 'right' },
})
