/**
 * Style-tab modal sheets — all the secondary edit surfaces.
 * Each is a BottomSheet with its own form. The StyleTab owns
 * open/close state + the data write; these are dumb forms.
 *
 * Includes:
 *  - EditProfileSheet   — displayName + bio + photo upload
 *  - EditBrokerageSheet — brokerage text field
 *  - HexPickerSheet     — #RRGGBB hex input + live swatch preview
 *  - StatePickerSheet   — scrollable list of US states + DC
 *  - AddPlatformSheet   — pick a platform + enter username/URL
 *  - CustomTickerSheet  — add/edit/remove hand-typed ticker items
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import storage from '@react-native-firebase/storage'
import {
  X,
  Camera,
  Plus,
  Trash,
  Check,
} from 'phosphor-react-native'
import { PLATFORM_LIST } from '../../lib/platforms'
import { BottomSheet } from '../BottomSheet'
import { BrandButton } from '../BrandButton'
import { BrandInput } from '../BrandInput'
import { COLORS, FONTS } from '../../lib/tokens'
import { useColors, useThemedStyles } from '../../lib/theme'
import { lightTap, selection } from '../../lib/haptics'
import { STATE_SHAPES } from '../../lib/stateShapes'
import type { TickerCustomItem } from '../../lib/style'

// ─────────────────────────────────────────────────────────────────
// Reusable SheetHeader — title + close button
// ─────────────────────────────────────────────────────────────────
function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const shared = useThemedStyles(_shared)
  const colors = useColors()
  return (
    <View style={shared.header}>
      <Text style={shared.title}>{title}</Text>
      <Pressable
        onPress={() => { lightTap(); onClose() }}
        style={({ pressed }) => [shared.closeBtn, pressed && { opacity: 0.7 }]}
        hitSlop={8}
      >
        <X size={18} color={colors.smoke} weight="bold" />
      </Pressable>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────
// EditProfileSheet
// Edits displayName + bio + photoURL. Photo upload via expo-image-
// picker, written to Firebase Storage at users/{uid}/profile-photo.jpg.
// ─────────────────────────────────────────────────────────────────
export function EditProfileSheet({
  visible,
  initialName,
  initialBio,
  initialPhotoURL,
  uid,
  onClose,
  onSave,
}: {
  visible: boolean
  initialName: string | null
  initialBio: string | null
  initialPhotoURL: string | null
  uid: string | null
  onClose: () => void
  onSave: (patch: { displayName: string; bio: string; photoURL?: string }) => Promise<void>
}) {
  const shared = useThemedStyles(_shared)
  const editProfileStyles = useThemedStyles(_editProfileStyles)
  const [name, setName] = useState(initialName ?? '')
  const [bio, setBio] = useState(initialBio ?? '')
  const [photo, setPhoto] = useState<string | null>(initialPhotoURL)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setName(initialName ?? '')
      setBio(initialBio ?? '')
      setPhoto(initialPhotoURL)
    }
  }, [visible, initialName, initialBio, initialPhotoURL])

  const pickPhoto = async () => {
    if (!uid) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Photos access', 'Enable photo library access in Settings to change your profile photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    setUploading(true)
    try {
      const ref = storage().ref(`users/${uid}/profile-photo.jpg`)
      await ref.putFile(result.assets[0].uri, { contentType: 'image/jpeg' })
      const url = await ref.getDownloadURL()
      // Cache-bust so the new image bypasses the previous URL's CDN cache.
      setPhoto(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[EditProfileSheet] upload failed', e)
      Alert.alert('Upload failed', 'Try again in a moment.')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave({
        displayName: name.trim(),
        bio: bio.trim(),
        ...(photo !== initialPhotoURL ? { photoURL: photo || '' } : {}),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={20}>
        <SheetHeader title="Edit profile" onClose={onClose} />
        <View style={shared.body}>
          {/* Photo picker */}
          <Pressable
            onPress={pickPhoto}
            disabled={uploading || !uid}
            style={({ pressed }) => [editProfileStyles.photoBtn, pressed && { opacity: 0.85 }]}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={editProfileStyles.photo} contentFit="cover" />
            ) : (
              <View style={[editProfileStyles.photo, editProfileStyles.photoFallback]}>
                <Text style={editProfileStyles.photoFallbackText}>{(name || 'A').slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={editProfileStyles.photoOverlay}>
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Camera size={18} color="#fff" weight="fill" />
              )}
            </View>
          </Pressable>

          <Text style={shared.label}>Display name</Text>
          <BrandInput value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />

          <View style={{ height: 12 }} />
          <Text style={shared.label}>Bio</Text>
          <BrandInput
            value={bio}
            onChangeText={setBio}
            placeholder="A short blurb buyers will read"
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />

          <View style={{ height: 20 }} />
          <BrandButton label={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} disabled={saving || uploading} />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  )
}

const _editProfileStyles = StyleSheet.create({
  photoBtn: {
    alignSelf: 'center',
    width: 96, height: 96, borderRadius: 48,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: { width: 96, height: 96, borderRadius: 48 },
  photoFallback: { backgroundColor: COLORS.tangerine, alignItems: 'center', justifyContent: 'center' },
  photoFallbackText: { fontFamily: FONTS.humanistBold, fontSize: 38, color: COLORS.warmWhite },
  photoOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.warmWhite,
  },
})

// ─────────────────────────────────────────────────────────────────
// EditBrokerageSheet
// ─────────────────────────────────────────────────────────────────
export function EditBrokerageSheet({
  visible,
  initialValue,
  onClose,
  onSave,
}: {
  visible: boolean
  initialValue: string | null
  onClose: () => void
  onSave: (value: string | null) => Promise<void>
}) {
  const shared = useThemedStyles(_shared)
  const [value, setValue] = useState(initialValue ?? '')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (visible) setValue(initialValue ?? '')
  }, [visible, initialValue])

  const save = async () => {
    setSaving(true)
    try {
      const trimmed = value.trim()
      await onSave(trimmed || null)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={20}>
        <SheetHeader title="Brokerage / company" onClose={onClose} />
        <View style={shared.body}>
          <Text style={shared.help}>
            Shows up on your About tab and helps buyers know who you work with.
            Leave blank if you're independent.
          </Text>
          <View style={{ height: 12 }} />
          <BrandInput value={value} onChangeText={setValue} placeholder="e.g. Compass · Coldwell Banker" autoCapitalize="words" />
          <View style={{ height: 20 }} />
          <BrandButton label={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  )
}

// ─────────────────────────────────────────────────────────────────
// HexPickerSheet
// Hex text input + live swatch. Pro-only (gating handled by caller).
// No native color wheel — that needs a separate library; hex input
// covers 99% of use without adding deps.
// ─────────────────────────────────────────────────────────────────
const HEX_RE = /^#([0-9A-Fa-f]{6})$/
export function HexPickerSheet({
  visible,
  title,
  helpCopy,
  fallbackHex,
  initialValue,
  onClose,
  onSave,
}: {
  visible: boolean
  title: string
  helpCopy: string
  fallbackHex: string
  initialValue: string | null
  onClose: () => void
  onSave: (hex: string | null) => Promise<void>
}) {
  const shared = useThemedStyles(_shared)
  const hexStyles = useThemedStyles(_hexStyles)
  const [text, setText] = useState(initialValue ?? '')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (visible) setText(initialValue ?? '')
  }, [visible, initialValue])

  const normalized = useMemo(() => {
    const t = text.trim()
    if (!t) return null
    const withHash = t.startsWith('#') ? t : `#${t}`
    return HEX_RE.test(withHash) ? withHash.toUpperCase() : null
  }, [text])
  const swatchColor = normalized ?? (HEX_RE.test(fallbackHex) ? fallbackHex : '#FFFFFF')

  const save = async () => {
    setSaving(true)
    try {
      await onSave(normalized)
      onClose()
    } finally {
      setSaving(false)
    }
  }
  const reset = async () => {
    setSaving(true)
    try {
      await onSave(null)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={20}>
        <SheetHeader title={title} onClose={onClose} />
        <View style={shared.body}>
          <Text style={shared.help}>{helpCopy}</Text>
          <View style={{ height: 14 }} />
          <View style={hexStyles.row}>
            <View
              style={[hexStyles.swatch, { backgroundColor: swatchColor, borderColor: 'rgba(10,14,23,0.10)' }]}
            />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={HEX_RE.test(fallbackHex) ? fallbackHex : '#RRGGBB'}
              placeholderTextColor={COLORS.ash}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              maxLength={7}
              style={hexStyles.input}
            />
          </View>
          {!normalized && text.length > 0 ? (
            <Text style={hexStyles.invalid}>Not a valid hex. Use #RRGGBB (6 hex digits).</Text>
          ) : null}
          <View style={{ height: 20 }} />
          <BrandButton
            label={saving ? 'Saving…' : 'Save'}
            onPress={save}
            loading={saving}
            disabled={saving || !normalized}
          />
          {initialValue ? (
            <Pressable
              onPress={reset}
              style={({ pressed }) => [hexStyles.resetBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={hexStyles.resetText}>Reset to palette default</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  )
}

const _hexStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 48, height: 48, borderRadius: 12, borderWidth: 1 },
  input: {
    flex: 1, height: 48, paddingHorizontal: 14,
    borderRadius: 12, backgroundColor: COLORS.cream,
    borderWidth: 1, borderColor: COLORS.borderLight,
    fontSize: 16, color: COLORS.ink,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  invalid: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.liveRed, marginTop: 6 },
  resetBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  resetText: { fontFamily: FONTS.humanistMedium, fontSize: 13, color: COLORS.graphite },
})

// ─────────────────────────────────────────────────────────────────
// StatePickerSheet
// Long scrollable list of 50 states + DC. Tap to select; current
// selection is highlighted with a check.
// ─────────────────────────────────────────────────────────────────
export function StatePickerSheet({
  visible,
  selectedShapeId,
  onClose,
  onPick,
}: {
  visible: boolean
  selectedShapeId: string
  onClose: () => void
  onPick: (shapeId: string) => Promise<void>
}) {
  const stateStyles = useThemedStyles(_stateStyles)
  const colors = useColors()
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <SheetHeader title="Pick your state" onClose={onClose} />
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 16 }}>
        {STATE_SHAPES.map((s) => {
          const id = `state_${s.code}`
          const active = selectedShapeId === id
          return (
            <Pressable
              key={s.code}
              onPress={async () => { selection(); await onPick(id); onClose() }}
              style={({ pressed }) => [
                stateStyles.row,
                active && stateStyles.rowActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[stateStyles.code, active && { color: COLORS.tangerine }]}>{s.code}</Text>
              <Text style={[stateStyles.name, active && { color: colors.ink, fontFamily: FONTS.humanistSemibold }]}>{s.name}</Text>
              {active ? <Check size={16} color={COLORS.tangerine} weight="bold" /> : null}
            </Pressable>
          )
        })}
      </ScrollView>
    </BottomSheet>
  )
}

const _stateStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 10,
  },
  rowActive: { backgroundColor: 'rgba(255,107,61,0.08)' },
  code: { fontFamily: FONTS.humanistBold, fontSize: 12, color: COLORS.smoke, width: 28 },
  name: { fontFamily: FONTS.humanist, fontSize: 14, color: COLORS.ink, flex: 1 },
})

// ─────────────────────────────────────────────────────────────────
// AddPlatformSheet
// Pick a platform from PLATFORM_LIST, then enter URL/handle.
// Used both for adding new and editing existing (initialId pre-fills).
// ─────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS = PLATFORM_LIST

export function AddPlatformSheet({
  visible,
  initialId,
  initialValue,
  onClose,
  onSave,
}: {
  visible: boolean
  /** When editing existing, the platform id we're modifying. */
  initialId?: string
  initialValue?: string
  onClose: () => void
  onSave: (platformId: string, username: string) => Promise<void>
}) {
  const shared = useThemedStyles(_shared)
  const platformStyles = useThemedStyles(_platformStyles)
  const [pickedId, setPickedId] = useState<string | null>(initialId ?? null)
  const [value, setValue] = useState(initialValue ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setPickedId(initialId ?? null)
      setValue(initialValue ?? '')
    }
  }, [visible, initialId, initialValue])

  const picked = PLATFORM_OPTIONS.find((p) => p.id === pickedId) || null

  const save = async () => {
    if (!picked) return
    const trimmed = value.trim()
    if (!trimmed) {
      Alert.alert('Add a username or URL', 'Tell us where to send buyers.')
      return
    }
    setSaving(true)
    try {
      await onSave(picked.id, trimmed)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={20}>
        <SheetHeader title={initialId ? 'Edit link' : 'Add a platform'} onClose={onClose} />
        <View style={shared.body}>
          {!picked ? (
            <View style={{ gap: 6 }}>
              {PLATFORM_OPTIONS.map((p) => {
                const Logo = p.Logo
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => { selection(); setPickedId(p.id) }}
                    style={({ pressed }) => [platformStyles.row, pressed && { opacity: 0.85 }]}
                  >
                    <View style={[platformStyles.icon, { backgroundColor: p.bg }]}>
                      <Logo size={16} color={p.ink} weight="fill" />
                    </View>
                    <Text style={platformStyles.name}>{p.name}</Text>
                  </Pressable>
                )
              })}
            </View>
          ) : (
            <View>
              <View style={platformStyles.pickedRow}>
                <View style={[platformStyles.icon, { backgroundColor: picked.bg }]}>
                  <picked.Logo size={16} color={picked.ink} weight="fill" />
                </View>
                <Text style={platformStyles.name}>{picked.name}</Text>
                {!initialId ? (
                  <Pressable onPress={() => setPickedId(null)} hitSlop={8}>
                    <Text style={platformStyles.change}>Change</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={{ height: 12 }} />
              <Text style={shared.label}>URL or handle</Text>
              <BrandInput
                value={value}
                onChangeText={setValue}
                placeholder={picked.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <View style={{ height: 20 }} />
              <BrandButton label={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} disabled={saving} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  )
}

const _platformStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, backgroundColor: COLORS.cream,
  },
  pickedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, backgroundColor: COLORS.cream,
  },
  icon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    // backgroundColor is per-platform — applied inline.
  },
  name: { flex: 1, fontFamily: FONTS.humanistSemibold, fontSize: 13.5, color: COLORS.ink },
  change: { fontFamily: FONTS.humanistMedium, fontSize: 12, color: COLORS.tangerine },
})

// ─────────────────────────────────────────────────────────────────
// CustomTickerSheet
// Pro-only — add/edit/remove hand-typed ticker items.
// ─────────────────────────────────────────────────────────────────
export function CustomTickerSheet({
  visible,
  items,
  onClose,
  onSave,
}: {
  visible: boolean
  items: TickerCustomItem[]
  onClose: () => void
  onSave: (items: TickerCustomItem[]) => Promise<void>
}) {
  const shared = useThemedStyles(_shared)
  const tickerStyles = useThemedStyles(_tickerStyles)
  const [draft, setDraft] = useState<TickerCustomItem[]>(items)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (visible) {
      setDraft(items)
      setNewLabel('')
    }
  }, [visible, items])

  const add = () => {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    setDraft((d) => [
      ...d,
      { id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, label: trimmed },
    ])
    setNewLabel('')
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(draft)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={20}>
        <SheetHeader title="Custom ticker" onClose={onClose} />
        <View style={shared.body}>
          <Text style={shared.help}>
            Hand-typed brags — "$42M total volume sold", "7 years experience",
            "500+ happy clients". They cycle alongside your auto stats.
          </Text>
          <View style={{ height: 10 }} />
          {draft.map((it) => (
            <View key={it.id} style={tickerStyles.itemRow}>
              <TextInput
                value={it.label}
                onChangeText={(t) =>
                  setDraft((d) => d.map((x) => (x.id === it.id ? { ...x, label: t } : x)))
                }
                style={tickerStyles.input}
                placeholder="Ticker phrase"
                placeholderTextColor={COLORS.ash}
              />
              <Pressable
                onPress={() => { lightTap(); setDraft((d) => d.filter((x) => x.id !== it.id)) }}
                style={({ pressed }) => [tickerStyles.iconBtn, pressed && { opacity: 0.85 }]}
                hitSlop={6}
              >
                <Trash size={14} color={COLORS.graphite} />
              </Pressable>
            </View>
          ))}
          <View style={tickerStyles.itemRow}>
            <TextInput
              value={newLabel}
              onChangeText={setNewLabel}
              onSubmitEditing={add}
              returnKeyType="done"
              style={[tickerStyles.input, { borderStyle: 'dashed' }]}
              placeholder='$42M total volume sold'
              placeholderTextColor={COLORS.ash}
            />
            <Pressable
              onPress={add}
              disabled={!newLabel.trim()}
              style={({ pressed }) => [
                tickerStyles.addBtn,
                pressed && { opacity: 0.85 },
                !newLabel.trim() && { opacity: 0.5 },
              ]}
            >
              <Plus size={14} color={COLORS.warmWhite} weight="bold" />
            </Pressable>
          </View>
          <View style={{ height: 20 }} />
          <BrandButton label={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  )
}

const _tickerStyles = StyleSheet.create({
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  input: {
    flex: 1, height: 40, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: COLORS.cream,
    borderWidth: 1, borderColor: COLORS.borderLight,
    fontSize: 13, color: COLORS.ink,
    fontFamily: FONTS.humanist,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.tangerine,
    alignItems: 'center', justifyContent: 'center',
  },
})

// ─────────────────────────────────────────────────────────────────
// Shared sheet chrome
// ─────────────────────────────────────────────────────────────────
const _shared = StyleSheet.create({
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
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  label: {
    fontFamily: FONTS.humanistSemibold, fontSize: 11.5, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 6,
  },
  help: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, lineHeight: 18 },
})
