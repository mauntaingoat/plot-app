/**
 * Pro-gated profile background image picker. Pure inline row — no
 * sheet needed since pick + upload + save is a single action.
 * Image is stored at `users/{uid}/style/background.jpg` to match
 * the web's `styleBackgroundPath`.
 */
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import storage from '@react-native-firebase/storage'
import { ImageSquare, Trash } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap } from '../../lib/haptics'
import { ProBadge } from './primitives'

export function CustomBgImagePicker({
  uid,
  value,
  isFree,
  onChange,
  onPaywall,
}: {
  uid: string | null
  value: string | null
  isFree: boolean
  onChange: (url: string | null) => Promise<void>
  onPaywall: () => void
}) {
  const styles = useThemedStyles(_styles)
  const [uploading, setUploading] = useState(false)

  const pick = async () => {
    if (isFree) { onPaywall(); return }
    if (!uid) return
    lightTap()
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Photos access', 'Enable photo library access in Settings to pick a background.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    setUploading(true)
    try {
      const ref = storage().ref(`users/${uid}/style/background.jpg`)
      await ref.putFile(result.assets[0].uri, { contentType: 'image/jpeg' })
      const url = await ref.getDownloadURL()
      await onChange(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[CustomBgImagePicker] upload failed', e)
      Alert.alert('Upload failed', 'Try another image, or check your connection.')
    } finally {
      setUploading(false)
    }
  }

  const remove = async () => {
    lightTap()
    await onChange(null)
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Or upload an image</Text>
        {isFree ? <ProBadge /> : null}
      </View>

      {isFree ? (
        <Pressable
          onPress={onPaywall}
          style={({ pressed }) => [styles.paywallBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.paywallText}>Use any photo as your profile background — upgrade to unlock.</Text>
        </Pressable>
      ) : value ? (
        <View style={styles.activeRow}>
          <Image source={{ uri: value }} style={styles.thumb} contentFit="cover" />
          <Pressable
            onPress={pick}
            disabled={uploading}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
          >
            {uploading ? <ActivityIndicator size="small" /> : <ImageSquare size={14} color={COLORS.graphite} />}
            <Text style={styles.actionText}>{uploading ? 'Uploading…' : 'Replace'}</Text>
          </Pressable>
          <Pressable
            onPress={remove}
            disabled={uploading}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
          >
            <Trash size={14} color={COLORS.graphite} />
            <Text style={styles.actionText}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={pick}
          disabled={uploading}
          style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.85 }]}
        >
          {uploading ? <ActivityIndicator size="small" /> : <ImageSquare size={14} color={COLORS.graphite} />}
          <Text style={styles.uploadText}>{uploading ? 'Uploading…' : 'Upload image'}</Text>
        </Pressable>
      )}
    </View>
  )
}

const _styles = StyleSheet.create({
  wrap: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  label: {
    fontFamily: FONTS.humanistSemibold, fontSize: 12, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  paywallBtn: { backgroundColor: COLORS.cream, padding: 12, borderRadius: 12 },
  paywallText: { fontFamily: FONTS.humanist, fontSize: 12.5, color: COLORS.graphite, lineHeight: 17 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.cream },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 40,
    borderRadius: 10, backgroundColor: COLORS.cream,
  },
  actionText: { fontFamily: FONTS.humanistMedium, fontSize: 12, color: COLORS.graphite },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: COLORS.cream,
    borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.borderLight,
  },
  uploadText: { fontFamily: FONTS.humanistMedium, fontSize: 12.5, color: COLORS.graphite },
})
