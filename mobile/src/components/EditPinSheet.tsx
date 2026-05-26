/**
 * Edit Pin Details — mirrors the web `PinEditModal` listing-edit
 * panel. Covers the fields agents actually need to change on an
 * existing pin: type (For Sale ↔ Sold), price, description, and the
 * photos array.
 *
 * Address / unit / beds / baths / sqft are intentionally NOT editable
 * here. They were populated from Rentcast at pin-create time; editing
 * them means re-running the lookup which is a separate flow.
 *
 * Content (reels + photos posted to the pin) lives in the Content
 * tab — its own edit flow (Edit Caption + Reassign Pin + Archive).
 */
import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import storage from '@react-native-firebase/storage'
import { X, Camera, Trash, CaretLeft, CaretRight, ImageSquare } from 'phosphor-react-native'
import { BottomSheet } from './BottomSheet'
import { BrandButton } from './BrandButton'
import { BrandInput } from './BrandInput'
import { COLORS, FONTS } from '../lib/tokens'
import { useColors, useThemedStyles } from '../lib/theme'
import { lightTap, selection, warning } from '../lib/haptics'
import { updatePin } from '../lib/firestoreDb'
import type { Pin } from '../types'

// Pin type narrow doesn't expose all the listing fields the web has;
// we cast on read for the optional fields (description, photos, etc.)
function getStr(p: Pin | null, key: string): string {
  if (!p) return ''
  const v = (p as Pin & Record<string, unknown>)[key]
  return typeof v === 'string' ? v : ''
}
function getNum(p: Pin | null, key: string): number {
  if (!p) return 0
  const v = (p as Pin & Record<string, unknown>)[key]
  return typeof v === 'number' ? v : 0
}
function getStrArr(p: Pin | null, key: string): string[] {
  if (!p) return []
  const v = (p as Pin & Record<string, unknown>)[key]
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export function EditPinSheet({
  pin,
  onClose,
}: {
  pin: Pin | null
  onClose: () => void
}) {
  const styles = useThemedStyles(_styles)
  const colors = useColors()

  const isSpotlight = pin?.type === 'spotlight'

  const [type, setType] = useState<'for_sale' | 'sold' | 'spotlight'>('for_sale')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [name, setName] = useState('') // spotlight only
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!pin) return
    setType((pin.type === 'sold' || pin.type === 'spotlight') ? pin.type : 'for_sale')
    setDescription(getStr(pin, 'description'))
    setName(getStr(pin, 'name'))
    const livePrice = pin.type === 'sold' ? getNum(pin, 'soldPrice') : getNum(pin, 'price')
    setPrice(livePrice > 0 ? String(livePrice) : '')
    setPhotos(getStrArr(pin, 'photos'))
  }, [pin])

  const pickPhotos = async () => {
    if (!pin) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Photos access', 'Enable photo library access in Settings to add listing photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    })
    if (result.canceled || result.assets.length === 0) return
    lightTap()
    setUploadingPhotos(true)
    try {
      const next: string[] = [...photos]
      for (const asset of result.assets) {
        const filename = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`
        const ref = storage().ref(`pins/${pin.id}/media/${filename}`)
        await ref.putFile(asset.uri, { contentType: 'image/jpeg' })
        const url = await ref.getDownloadURL()
        next.push(url)
      }
      setPhotos(next)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[EditPinSheet] upload failed', e)
      Alert.alert('Upload failed', 'Try again or pick a smaller photo.')
    } finally {
      setUploadingPhotos(false)
    }
  }

  const removePhoto = (idx: number) => {
    warning()
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }
  const movePhoto = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= photos.length) return
    selection()
    const next = [...photos]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setPhotos(next)
  }

  const save = async () => {
    if (!pin) return
    setSaving(true)
    try {
      const priceNum = Number(price) || 0
      const heroPhotoUrl = photos[0] || ''
      const patch: Record<string, unknown> = {
        description,
        photos,
        heroPhotoUrl,
      }
      if (isSpotlight) {
        patch.name = name
      } else if (type === 'for_sale') {
        patch.price = priceNum
        patch.type = 'for_sale'
        // Clear stale sold-only fields if transitioning from sold.
        if (pin.type === 'sold') {
          patch.soldPrice = 0
          patch.soldDate = null
        }
      } else if (type === 'sold') {
        patch.soldPrice = priceNum
        patch.type = 'sold'
        // Preserve the original list price when flipping to sold.
        if (pin.type === 'for_sale') {
          patch.originalPrice = getNum(pin, 'price') || priceNum
          patch.openHouse = null
        }
      }
      await updatePin(pin.id, patch)
      onClose()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[EditPinSheet] save failed', e)
      Alert.alert('Could not save', 'Try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet visible={!!pin} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={20}>
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title}>Edit Pin</Text>
            {pin ? <Text style={styles.address} numberOfLines={1}>{pin.address}</Text> : null}
          </View>
          <Pressable
            onPress={() => { lightTap(); onClose() }}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <X size={18} color={colors.smoke} weight="bold" />
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 540 }}>
          <View style={styles.body}>
            {/* Type toggle — only for for_sale ↔ sold. Spotlight pins
                stay spotlight (changing type would mean re-creating). */}
            {!isSpotlight ? (
              <>
                <Text style={styles.fieldLabel}>Listing type</Text>
                <View style={styles.segmented}>
                  {([
                    { id: 'for_sale' as const, label: 'For Sale' },
                    { id: 'sold' as const,     label: 'Sold' },
                  ]).map((o) => {
                    const active = type === o.id
                    return (
                      <Pressable
                        key={o.id}
                        onPress={() => { if (!active) { selection(); setType(o.id) } }}
                        style={({ pressed }) => [
                          styles.segmentBtn,
                          active && styles.segmentBtnActive,
                          pressed && !active && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </>
            ) : null}

            {/* Spotlight name */}
            {isSpotlight ? (
              <>
                <Text style={styles.fieldLabel}>Spotlight name</Text>
                <BrandInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Brickell, Coral Gables"
                />
                <View style={{ height: 14 }} />
              </>
            ) : null}

            {/* Price */}
            {!isSpotlight ? (
              <>
                <Text style={styles.fieldLabel}>
                  {type === 'sold' ? 'Sold price' : 'Listing price'}
                </Text>
                <View style={styles.priceBox}>
                  <Text style={styles.priceDollar}>$</Text>
                  <TextInput
                    value={price ? Number(price).toLocaleString() : ''}
                    onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={COLORS.ash}
                    keyboardType="number-pad"
                    style={styles.priceInput}
                  />
                </View>
                <View style={{ height: 14 }} />
              </>
            ) : null}

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <BrandInput
              value={description}
              onChangeText={setDescription}
              placeholder="What makes this listing special?"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />

            <View style={{ height: 18 }} />

            {/* Photos */}
            <View style={styles.photosHeader}>
              <Text style={styles.fieldLabel}>Listing photos</Text>
              {photos.length > 0 ? (
                <Text style={styles.photoMeta}>{photos.length} photo{photos.length !== 1 ? 's' : ''} · first is the cover</Text>
              ) : null}
            </View>

            {photos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoStrip}
              >
                {photos.map((url, idx) => (
                  <View key={`${url}-${idx}`} style={styles.photoCell}>
                    <Image source={{ uri: url }} style={styles.photoThumb} contentFit="cover" />
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
                        disabled={idx === photos.length - 1}
                        style={({ pressed }) => [styles.photoAction, idx === photos.length - 1 && { opacity: 0.3 }, pressed && idx < photos.length - 1 && { opacity: 0.8 }]}
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
              disabled={uploadingPhotos}
              style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.85 }]}
            >
              {uploadingPhotos ? (
                <ActivityIndicator size="small" color={COLORS.tangerine} />
              ) : photos.length === 0 ? (
                <Camera size={16} color={COLORS.tangerine} weight="regular" />
              ) : (
                <ImageSquare size={16} color={COLORS.tangerine} weight="regular" />
              )}
              <Text style={styles.uploadBtnText}>
                {uploadingPhotos
                  ? 'Uploading…'
                  : photos.length === 0
                    ? 'Upload listing photos'
                    : 'Add more photos'}
              </Text>
            </Pressable>

            <View style={{ height: 20 }} />
            <BrandButton
              label={saving ? 'Saving…' : 'Save Changes'}
              onPress={save}
              loading={saving}
              disabled={saving || uploadingPhotos}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  )
}

const _styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    gap: 10,
  },
  title: { fontFamily: FONTS.humanistBold, fontSize: 17, color: COLORS.ink },
  address: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.cream,
    alignItems: 'center', justifyContent: 'center',
  },

  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },

  fieldLabel: {
    fontFamily: FONTS.humanistSemibold, fontSize: 11, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 8,
  },

  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: {
    backgroundColor: COLORS.warmWhite,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 2,
  },
  segmentText: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.smoke },
  segmentTextActive: { color: COLORS.ink },

  priceBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,107,61,0.06)',
    borderWidth: 2, borderColor: 'rgba(255,107,61,0.20)',
    borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12,
    gap: 4,
  },
  priceDollar: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink },
  priceInput: { flex: 1, fontFamily: FONTS.humanistBold, fontSize: 26, color: COLORS.ink, paddingVertical: 0 },

  photosHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  photoMeta: { fontFamily: FONTS.humanist, fontSize: 10.5, color: COLORS.ash, textTransform: 'uppercase', letterSpacing: 0.4 },

  photoStrip: { gap: 8, paddingBottom: 8 },
  photoCell: {
    width: 96, height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.cream,
    position: 'relative',
  },
  photoThumb: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: COLORS.tangerine,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6,
  },
  coverBadgeText: { fontFamily: FONTS.humanistBold, fontSize: 9, color: COLORS.warmWhite, textTransform: 'uppercase' },
  photoAction: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  photoActionRemove: {
    position: 'absolute', top: 4, right: 4,
  },
  photoMoveRow: {
    position: 'absolute', bottom: 4, left: 4, right: 4,
    flexDirection: 'row', justifyContent: 'space-between',
  },

  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,107,61,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,107,61,0.30)', borderStyle: 'dashed',
    marginTop: 4,
  },
  uploadBtnText: { fontFamily: FONTS.humanistBold, fontSize: 13, color: COLORS.tangerine },
})
