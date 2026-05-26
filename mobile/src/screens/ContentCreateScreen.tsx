/**
 * Content Create — iOS port of the desktop content-create flow.
 *
 * Scope for this milestone: PHOTOS ONLY. Reel (video) upload is
 * deferred to a separate milestone because it needs a native
 * compression pipeline (AVAssetExportSession via a native module).
 *
 * Flow:
 *  1. Pick 1+ photos from the library (multi-select = carousel).
 *  2. Add an optional caption.
 *  3. Tap Publish → uploads each photo to Firebase Storage at
 *     `pins/{pinId}/content/{contentId}/{n}.jpg` → calls
 *     `createContent()` which appends to pin.content[] AND writes the
 *     standalone content doc.
 *
 * The whole thing matches the dual-write shape the rest of the iOS
 * ContentTab expects (edit caption / reassign / archive all keyed on
 * the contentId in both places).
 */
import { useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import storage from '@react-native-firebase/storage'
import { X, Camera, ImageSquare, Trash, CaretLeft, CaretRight } from 'phosphor-react-native'
import { BrandButton } from '../components/BrandButton'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { COLORS, FONTS } from '../lib/tokens'
import { useColors, useThemedStyles } from '../lib/theme'
import { lightTap, selection, warning } from '../lib/haptics'
import { useUserDoc } from '../lib/useUserDoc'
import { createContent } from '../lib/firestoreDb'
import { usePins } from '../lib/usePins'
import type { AppStackParamList } from '../navigation/RootNavigator'

type Nav = NativeStackNavigationProp<AppStackParamList, 'ContentCreate'>
type Rt = RouteProp<AppStackParamList, 'ContentCreate'>

export function ContentCreateScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Rt>()
  const { userDoc } = useUserDoc()
  const { pins } = usePins()
  const colors = useColors()
  const styles = useThemedStyles(_styles)

  const initialPinId = route.params?.pinId ?? null
  const [pinId, setPinId] = useState<string | null>(initialPinId)
  const [localUris, setLocalUris] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [picking, setPicking] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  const pin = useMemo(() => pins.find((p) => p.id === pinId) ?? null, [pins, pinId])

  const hasUnsavedWork = localUris.length > 0 || caption.trim().length > 0

  const onClose = () => {
    if (!hasUnsavedWork) { navigation.goBack(); return }
    setDiscardConfirmOpen(true)
  }

  const pickPhotos = async () => {
    setPicking(true)
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Photos access', 'Enable photo library access in Settings to add content.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.85,
      })
      if (result.canceled || result.assets.length === 0) return
      lightTap()
      setLocalUris((prev) => [...prev, ...result.assets.map((a) => a.uri)])
    } finally {
      setPicking(false)
    }
  }

  const removePhoto = (idx: number) => {
    warning()
    setLocalUris((prev) => prev.filter((_, i) => i !== idx))
  }
  const movePhoto = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= localUris.length) return
    selection()
    const next = [...localUris]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setLocalUris(next)
  }

  const canPublish = !!userDoc?.uid && !!pinId && localUris.length > 0 && !publishing

  const onPublish = async () => {
    if (!userDoc?.uid || !pinId || localUris.length === 0) return
    setPublishing(true)
    try {
      // Upload each local URI sequentially. Sequential keeps memory
      // pressure low on the device (vs. Promise.all for big carousels)
      // and gives us simpler error attribution if one upload fails.
      const uploaded: string[] = []
      const contentStem = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      for (let i = 0; i < localUris.length; i++) {
        const filename = `${i}-${Math.random().toString(36).slice(2, 7)}.jpg`
        const ref = storage().ref(`pins/${pinId}/content/${contentStem}/${filename}`)
        await ref.putFile(localUris[i], { contentType: 'image/jpeg' })
        const url = await ref.getDownloadURL()
        uploaded.push(url)
      }
      await createContent(userDoc.uid, pinId, {
        type: 'photo',
        mediaUrls: uploaded,
        caption: caption.trim() || null,
      })
      navigation.goBack()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ContentCreate] publish failed', err)
      Alert.alert('Upload failed', 'One of the photos couldn\'t upload. Try again on Wi-Fi.')
    } finally {
      setPublishing(false)
    }
  }

  // Pin picker — if no initial pinId, agent must choose which pin
  // this content attaches to.
  const otherPins = pins.filter((p) => p.archivedAt == null)

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.pageBg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => { lightTap(); onClose() }}
          hitSlop={10}
          style={({ pressed }) => [
            styles.closeBtn,
            { backgroundColor: colors.surfaceBg, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <X size={18} color={colors.ink} weight="bold" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink }]}>Add Content</Text>
          <Text style={[styles.subtitle, { color: colors.smoke }]} numberOfLines={1}>
            {pin ? pin.address : 'Pick a pin to attach to'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Pin selector (only when entered without a pinId) */}
          {!initialPinId ? (
            <>
              <Text style={[styles.fieldLabel, { color: colors.smoke }]}>Listing</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinChips}>
                {otherPins.map((p) => {
                  const active = p.id === pinId
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => { selection(); setPinId(p.id) }}
                      style={({ pressed }) => [
                        styles.pinChip,
                        {
                          backgroundColor: active ? COLORS.tangerine : colors.surfaceBg,
                          borderColor: active ? COLORS.tangerine : colors.border,
                        },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pinChipText,
                          { color: active ? COLORS.warmWhite : colors.ink },
                        ]}
                        numberOfLines={1}
                      >
                        {p.address.split(',')[0]}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
              <View style={{ height: 18 }} />
            </>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.smoke }]}>
            {localUris.length === 0
              ? 'Photos'
              : `${localUris.length} photo${localUris.length === 1 ? '' : 's'} · first is the cover`}
          </Text>

          {localUris.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoStrip}
            >
              {localUris.map((uri, idx) => (
                <View key={`${uri}-${idx}`} style={styles.photoCell}>
                  <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                  {idx === 0 ? (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => removePhoto(idx)}
                    style={({ pressed }) => [styles.photoAction, styles.photoActionRemove, pressed && { opacity: 0.8 }]}
                    hitSlop={4}
                  >
                    <Trash size={11} color={COLORS.warmWhite} weight="bold" />
                  </Pressable>
                  <View style={styles.photoMoveRow}>
                    <Pressable
                      onPress={() => movePhoto(idx, -1)}
                      disabled={idx === 0}
                      style={({ pressed }) => [styles.photoAction, idx === 0 && { opacity: 0.3 }, pressed && idx > 0 && { opacity: 0.8 }]}
                      hitSlop={4}
                    >
                      <CaretLeft size={11} color={COLORS.warmWhite} weight="bold" />
                    </Pressable>
                    <Pressable
                      onPress={() => movePhoto(idx, 1)}
                      disabled={idx === localUris.length - 1}
                      style={({ pressed }) => [styles.photoAction, idx === localUris.length - 1 && { opacity: 0.3 }, pressed && idx < localUris.length - 1 && { opacity: 0.8 }]}
                      hitSlop={4}
                    >
                      <CaretRight size={11} color={COLORS.warmWhite} weight="bold" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <Pressable
            onPress={pickPhotos}
            disabled={picking || publishing}
            style={({ pressed }) => [
              styles.pickBtn,
              { backgroundColor: colors.surfaceBg, borderColor: colors.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            {picking ? (
              <ActivityIndicator size="small" color={COLORS.tangerine} />
            ) : localUris.length === 0 ? (
              <Camera size={16} color={COLORS.tangerine} weight="regular" />
            ) : (
              <ImageSquare size={16} color={COLORS.tangerine} weight="regular" />
            )}
            <Text style={[styles.pickBtnText, { color: COLORS.tangerine }]}>
              {picking
                ? 'Opening library…'
                : localUris.length === 0
                  ? 'Pick photos from library'
                  : 'Add more photos'}
            </Text>
          </Pressable>

          <View style={{ height: 18 }} />
          <Text style={[styles.fieldLabel, { color: colors.smoke }]}>Caption (optional)</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="What should buyers know about this?"
            placeholderTextColor={colors.ash}
            multiline
            numberOfLines={3}
            style={[
              styles.captionInput,
              {
                backgroundColor: colors.surfaceBg,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
          />
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.pageBg, borderTopColor: colors.border }]}>
          <BrandButton
            label={publishing ? 'Publishing…' : 'Publish'}
            onPress={onPublish}
            loading={publishing}
            disabled={!canPublish}
          />
        </View>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={discardConfirmOpen}
        title="Discard this content?"
        message="You'll lose anything you've picked or typed."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => { setDiscardConfirmOpen(false); navigation.goBack() }}
        onClose={() => setDiscardConfirmOpen(false)}
      />
    </SafeAreaView>
  )
}

const _styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  title: { fontFamily: FONTS.humanistBold, fontSize: 17, color: COLORS.ink, letterSpacing: -0.2 },
  subtitle: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 1 },

  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 },

  fieldLabel: {
    fontFamily: FONTS.humanistSemibold, fontSize: 11, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 10, marginTop: 4,
  },

  pinChips: { gap: 8, paddingRight: 20 },
  pinChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
    maxWidth: 220,
  },
  pinChipText: { fontFamily: FONTS.humanistSemibold, fontSize: 12.5 },

  photoStrip: { gap: 10, paddingRight: 20, marginBottom: 12 },
  photoCell: {
    width: 110, height: 140, borderRadius: 12, overflow: 'hidden', position: 'relative',
    backgroundColor: COLORS.pearl,
  },
  photoThumb: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  coverBadgeText: { fontFamily: FONTS.humanistBold, fontSize: 9.5, color: COLORS.warmWhite, letterSpacing: 0.3 },
  photoAction: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoActionRemove: { position: 'absolute', top: 6, right: 6 },
  photoMoveRow: {
    position: 'absolute', bottom: 6, left: 6, right: 6,
    flexDirection: 'row', justifyContent: 'space-between',
  },

  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 14, borderWidth: 1, borderStyle: 'dashed',
  },
  pickBtnText: { fontFamily: FONTS.humanistBold, fontSize: 13, letterSpacing: -0.1 },

  captionInput: {
    minHeight: 90, textAlignVertical: 'top',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
    fontFamily: FONTS.humanist, fontSize: 14,
  },

  footer: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
    borderTopWidth: 1,
  },
})
