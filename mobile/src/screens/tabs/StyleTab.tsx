import { useCallback, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import {
  Palette,
  ArrowsClockwise,
  PencilSimple,
  Buildings,
  CaretRight,
  Camera,
  House,
  Eye,
  Plus,
} from 'phosphor-react-native'
import { BrandIconChip } from '../../components/BrandIconChip'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { COLORS, FONTS } from '../../lib/tokens'
import { lightTap } from '../../lib/haptics'
import { useUserDoc } from '../../lib/useUserDoc'
import { updateUserStyle } from '../../lib/firestoreDb'
import {
  resolveStyle,
  DEFAULT_STYLE,
  PALETTES,
  FONTS as FONT_PAIRS,
  SHAPES,
  FREE_PALETTE_COUNT,
  FREE_FONT_COUNT,
  FREE_SHAPE_COUNT,
  getPalette,
  getFont,
  getShape,
  isStateShape,
  type AgentStyle,
  type FrameStyle,
  type TickerAutoKey,
} from '../../lib/style'
import { STATE_SHAPES } from '../../lib/stateShapes'
import { getPlatformMeta } from '../../lib/platforms'
import { Section, ToggleRow, ProBadge, FrameSegmented } from '../../components/style/primitives'
import { useColors, useThemedStyles } from '../../lib/theme'
import { PaletteCard, FontCard, ShapeCard } from '../../components/style/pickerCards'
import { CustomBgImagePicker } from '../../components/style/CustomBgImagePicker'
import {
  EditProfileSheet,
  EditBrokerageSheet,
  HexPickerSheet,
  StatePickerSheet,
  AddPlatformSheet,
  CustomTickerSheet,
} from '../../components/style/sheets'
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore'

/**
 * Style tab — mobile port of `src/components/dashboard/StyleTab.tsx`.
 *
 * Sections (in order, matching web):
 *   1. Profile basics  — name/bio/photo (sheet) + brokerage (sheet)
 *   2. Color palette   — 12 cards + 2 hex pickers (Pro) + bg image (Pro)
 *   3. Font            — 14 cards + heading color (Pro)
 *   4. Map shape       — 9 geometric + state picker (Pro)
 *   5. Frames          — 3 surfaces × 4-option segmented
 *   6. Ticker stats    — 4 auto toggles + custom items editor (Pro)
 *   7. Listings layout — Scroller vs Grid
 *   8. Sections        — bio/ticker/social/map visibility
 *   9. Social links    — list + Add Platform sheet
 *   10. Reset to defaults
 */

export function StyleTab() {
  const styles = useThemedStyles(_styles)
  const colors = useColors()
  const { userDoc } = useUserDoc()
  const style = useMemo(() => resolveStyle(userDoc?.style), [userDoc?.style])
  const isFree = (userDoc?.tier ?? 'free') === 'free'
  const accent = style.customAccentColor || getPalette(style.paletteId).accent

  // ── Accordion group — palette / font / shape are mutually
  // exclusive. Tap one to open it; the previously-open section
  // collapses automatically. `null` = all three collapsed.
  type AccordionKey = 'palette' | 'font' | 'shape' | 'links' | 'socials' | null
  const [openSection, setOpenSection] = useState<AccordionKey>(null)
  const accordion = (key: Exclude<AccordionKey, null>) => ({
    expanded: openSection === key,
    onToggleExpanded: (next: boolean) => setOpenSection(next ? key : null),
  })

  // ── Sheet open/close ──
  type SheetKey =
    | { kind: 'profile' }
    | { kind: 'brokerage' }
    | { kind: 'accentHex' }
    | { kind: 'bgHex' }
    | { kind: 'fontHex' }
    | { kind: 'state' }
    | { kind: 'ticker' }
    | { kind: 'platform'; initialId?: string; initialValue?: string }
    | null
  const [openSheet, setOpenSheet] = useState<SheetKey>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const closeSheet = () => setOpenSheet(null)

  // ── Firestore write helpers ──
  // Always write the full resolved style so newly-added fields
  // (e.g. tickerOrder) stay present even when a single toggle moves.
  const writeStyle = useCallback(
    async (patch: Partial<AgentStyle>) => {
      if (!userDoc?.uid) return
      const next: AgentStyle = { ...style, ...patch }
      try {
        await updateUserStyle(userDoc.uid, next)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[StyleTab] write failed:', e)
        Alert.alert('Could not save', 'Try again in a moment.')
      }
    },
    [userDoc?.uid, style],
  )

  /** Patch top-level UserDoc fields (displayName/bio/photoURL/
   *  brokerage/platforms). Style writes go through writeStyle. */
  const writeUser = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!userDoc?.uid) return
      try {
        // Firestore types are over-narrow for arbitrary payloads —
        // we know our keys are safe (displayName/bio/photoURL/
        // brokerage/platforms), so the cast is fine here.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateDoc(doc(getFirestore(), 'users', userDoc.uid), patch as any)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[StyleTab] user write failed:', e)
        Alert.alert('Could not save', 'Try again in a moment.')
      }
    },
    [userDoc?.uid],
  )

  const updateFrames = (patch: Partial<AgentStyle['frames']>) =>
    writeStyle({ frames: { ...style.frames, ...patch } })
  const updateSections = (patch: Partial<AgentStyle['sections']>) =>
    writeStyle({ sections: { ...style.sections, ...patch } })
  const updateTickerAuto = (key: TickerAutoKey, value: boolean) =>
    writeStyle({ tickerAuto: { ...style.tickerAuto, [key]: value } })

  const onPaywall = useCallback((reason: string) => {
    Alert.alert('Pro feature', reason)
  }, [])

  const reset = useCallback(() => {
    setResetConfirmOpen(true)
  }, [])

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* TabHeader */}
      <View style={styles.tabHeader}>
        <BrandIconChip>
          <Palette size={20} color={COLORS.warmWhite} weight="regular" />
        </BrandIconChip>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Style your Reelst</Text>
          <Text style={styles.tabSubtitle}>Pick a palette, font, map shape, and more. Changes save automatically.</Text>
        </View>
      </View>

      {/* ── Profile basics ── */}
      <Section title="Profile basics" subtitle="Name, bio, photo, brokerage">
        <ProfileBasicsRow
          displayName={userDoc?.displayName ?? null}
          bio={userDoc?.bio ?? null}
          photoURL={userDoc?.photoURL ?? null}
          onEdit={() => setOpenSheet({ kind: 'profile' })}
        />
        <BrokerageRow
          brokerage={userDoc?.brokerage ?? null}
          onEdit={() => setOpenSheet({ kind: 'brokerage' })}
        />
      </Section>

      {/* ── Color palette ── */}
      <Section
        title="Color palette"
        subtitle="Light, dark, gradient, pattern"
        collapsible
        collapsedPreview={<PaletteSwatchPreview palette={getPalette(style.paletteId)} />}
        {...accordion('palette')}
      >
        <View style={styles.gridTwo}>
          {PALETTES.map((p, i) => {
            const locked = isFree && i >= FREE_PALETTE_COUNT
            return (
              <View key={p.id} style={styles.colHalf}>
                <PaletteCard
                  palette={p}
                  active={style.paletteId === p.id}
                  locked={locked}
                  onPress={() =>
                    locked
                      ? onPaywall('Extra color palettes are a Pro feature.')
                      : writeStyle({
                          paletteId: p.id,
                          customAccentColor: null,
                          customBackgroundColor: null,
                          customBackgroundImage: null,
                        })
                  }
                />
              </View>
            )
          })}
        </View>
        <CustomColorRow
          label="Custom accent color"
          value={style.customAccentColor || null}
          fallbackHex={getPalette(style.paletteId).accent}
          isFree={isFree}
          onOpen={() => setOpenSheet({ kind: 'accentHex' })}
          onPaywall={() => onPaywall('Custom accent colors are a Pro feature.')}
        />
        <CustomColorRow
          label="Custom profile background"
          value={style.customBackgroundColor || null}
          fallbackHex={getPalette(style.paletteId).cardBg}
          isFree={isFree}
          onOpen={() => setOpenSheet({ kind: 'bgHex' })}
          onPaywall={() => onPaywall('Custom profile backgrounds are a Pro feature.')}
          dimmedNote={style.customBackgroundImage ? 'A custom image is showing — remove it below to use a color.' : undefined}
        />
        <CustomBgImagePicker
          uid={userDoc?.uid ?? null}
          value={style.customBackgroundImage || null}
          isFree={isFree}
          onChange={(url) => writeStyle({ customBackgroundImage: url })}
          onPaywall={() => onPaywall('Custom background images are a Pro feature.')}
        />
      </Section>

      {/* ── Font ── */}
      <Section
        title="Font"
        subtitle="Headers + body pairings"
        collapsible
        collapsedPreview={<FontNamePreview font={getFont(style.fontId)} />}
        {...accordion('font')}
      >
        <View style={styles.gridTwo}>
          {FONT_PAIRS.map((f, i) => {
            const locked = isFree && i >= FREE_FONT_COUNT
            return (
              <View key={f.id} style={styles.colHalf}>
                <FontCard
                  font={f}
                  active={style.fontId === f.id}
                  locked={locked}
                  onPress={() => (locked ? onPaywall('Extra font pairings are a Pro feature.') : writeStyle({ fontId: f.id }))}
                />
              </View>
            )
          })}
        </View>
        <CustomColorRow
          label="Custom heading color"
          value={style.customFontColor || null}
          fallbackHex={getPalette(style.paletteId).textPrimary}
          isFree={isFree}
          onOpen={() => setOpenSheet({ kind: 'fontHex' })}
          onPaywall={() => onPaywall('Custom heading colors are a Pro feature.')}
        />
      </Section>

      {/* ── Map shape ── */}
      <Section
        title="Map shape"
        subtitle="The signature element of your Reelst"
        collapsible
        collapsedPreview={<ShapeGlyphPreview shapeId={style.shapeId} accent={accent} />}
        {...accordion('shape')}
      >
        <View style={styles.gridThree}>
          {SHAPES.map((s, i) => {
            const locked = isFree && i >= FREE_SHAPE_COUNT
            return (
              <View key={s.id} style={styles.colThird}>
                <ShapeCard
                  shape={s}
                  active={style.shapeId === s.id}
                  accent={accent}
                  locked={locked}
                  onPress={() => (locked ? onPaywall('Extra map shapes are a Pro feature.') : writeStyle({ shapeId: s.id }))}
                />
              </View>
            )
          })}
        </View>
        <StatePickerRow
          shapeId={style.shapeId}
          accent={accent}
          isFree={isFree}
          onOpen={() => setOpenSheet({ kind: 'state' })}
          onPaywall={() => onPaywall('State map shapes are a Pro feature.')}
        />
      </Section>

      {/* ── Custom Links ── */}
      <Section
        title="Links"
        subtitle="Linktree-style buttons that link out from your profile"
        collapsible
        collapsedPreview={
          <Text style={styles.collapsedPreviewText}>
            {style.customLinks.length > 0
              ? `${style.customLinks.length} link${style.customLinks.length > 1 ? 's' : ''}`
              : 'None'}
          </Text>
        }
        {...accordion('links')}
      >
        {/* Position selector — small inline segmented pill. Display
            position is peripheral; keep it from drawing the eye. */}
        <View style={styles.linksPosRow}>
          <Text style={styles.linksPosLabel}>Position</Text>
          <View style={styles.linksPosGroup}>
            <Pressable
              onPress={() => writeStyle({ customLinksPosition: 'above' })}
              style={({ pressed }) => [
                styles.linksPosPill,
                style.customLinksPosition === 'above' && styles.linksPosPillActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[
                styles.linksPosPillText,
                style.customLinksPosition === 'above' && styles.linksPosPillTextActive,
              ]}>Above</Text>
            </Pressable>
            <Pressable
              onPress={() => writeStyle({ customLinksPosition: 'below' })}
              style={({ pressed }) => [
                styles.linksPosPill,
                style.customLinksPosition === 'below' && styles.linksPosPillActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[
                styles.linksPosPillText,
                style.customLinksPosition === 'below' && styles.linksPosPillTextActive,
              ]}>Below</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 10 }} />
        <Pressable
          onPress={() => Alert.alert(
            'Edit your links on web',
            "Custom links live on your public profile. For now, add or rearrange them at reel.st on a desktop browser — full in-app editing lands in the next update.",
          )}
          style={({ pressed }) => [styles.paywallStub, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.paywallStubText}>
            {style.customLinks.length > 0
              ? `${style.customLinks.length} link${style.customLinks.length > 1 ? 's' : ''} live · tap for how to edit`
              : 'No custom links yet · tap for how to add them'}
          </Text>
        </Pressable>
      </Section>

      {/* ── Social & site links ── */}
      <Section
        title="Social & site links"
        subtitle="Toggle, edit, and reorder — shows below your bio"
        collapsible
        collapsedPreview={
          <Text style={styles.collapsedPreviewText}>
            {userDoc?.platforms && userDoc.platforms.length > 0
              ? `${userDoc.platforms.length} connected`
              : 'None'}
          </Text>
        }
        {...accordion('socials')}
        action={
          <Pressable
            onPress={() => setOpenSheet({ kind: 'platform' })}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
          >
            <Plus size={12} color={COLORS.warmWhite} weight="bold" />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        }
      >
        {userDoc?.platforms && userDoc.platforms.length > 0 ? (
          userDoc.platforms.map((p) => {
            const meta = getPlatformMeta(p.id)
            const Logo = meta?.Logo
            return (
              <Pressable
                key={p.id}
                onPress={() => setOpenSheet({ kind: 'platform', initialId: p.id, initialValue: p.username })}
                style={({ pressed }) => [styles.platformRow, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.platformIcon, meta && { backgroundColor: meta.bg }]}>
                  {Logo ? <Logo size={14} color={meta?.ink ?? '#fff'} weight="fill" /> : null}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.platformName}>{meta?.name ?? p.id}</Text>
                  <Text style={styles.platformValue} numberOfLines={1}>{p.username}</Text>
                </View>
                <CaretRight size={12} color={COLORS.ash} />
              </Pressable>
            )
          })
        ) : (
          <Text style={styles.emptyText}>No links added yet — tap "Add" to connect your platforms.</Text>
        )}
      </Section>

      {/* ── Frames ── */}
      <Section title="Frames" subtitle="Borders + shadows for each surface">
        <FrameRow
          label="Profile photo"
          icon={<Camera size={15} color={colors.graphite} />}
          value={style.frames.avatar}
          onChange={(v) => updateFrames({ avatar: v })}
        />
        <View style={{ height: 10 }} />
        <FrameRow
          label="Map viewport"
          icon={<House size={15} color={colors.graphite} />}
          value={style.frames.map}
          onChange={(v) => updateFrames({ map: v })}
        />
        <View style={{ height: 10 }} />
        <FrameRow
          label="Listings"
          icon={<Eye size={15} color={colors.graphite} />}
          value={style.frames.listings}
          onChange={(v) => updateFrames({ listings: v })}
        />
      </Section>

      {/* ── Ticker stats ── */}
      <Section title="Ticker stats" subtitle="The cycling line under your name">
        <Text style={styles.sublabel}>From your listings</Text>
        <ToggleRow label="Homes for sale"   value={style.tickerAuto.for_sale}    onChange={(v) => updateTickerAuto('for_sale', v)} />
        <ToggleRow label="Homes sold"       value={style.tickerAuto.sold}        onChange={(v) => updateTickerAuto('sold', v)} />
        <ToggleRow label="Open houses"      value={style.tickerAuto.open_houses} onChange={(v) => updateTickerAuto('open_houses', v)} />
        <ToggleRow label="Spotlights live"  value={style.tickerAuto.spotlights}  onChange={(v) => updateTickerAuto('spotlights', v)} />

        <View style={styles.customLabelRow}>
          <Text style={styles.sublabel}>Custom</Text>
          {isFree ? <ProBadge /> : null}
        </View>
        {isFree ? (
          <Pressable
            onPress={() => onPaywall('Custom ticker items are a Pro feature.')}
            style={({ pressed }) => [styles.paywallStub, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.paywallStubText}>
              Add hand-typed brags like "$42M total volume sold" — upgrade to unlock.
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setOpenSheet({ kind: 'ticker' })}
            style={({ pressed }) => [styles.paywallStub, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.paywallStubText}>
              {style.tickerCustom.length > 0
                ? `${style.tickerCustom.length} custom item${style.tickerCustom.length > 1 ? 's' : ''} — tap to edit`
                : 'Add hand-typed brags like "$42M total volume sold"'}
            </Text>
          </Pressable>
        )}
      </Section>

      {/* ── Sections visibility ──
          Map viewport intentionally omitted — the map IS the profile,
          hiding it would leave nothing of substance behind. */}
      <Section title="Sections" subtitle="Show or hide parts of your profile">
        <ToggleRow label="Bio"           value={style.sections.bio}     onChange={(v) => updateSections({ bio: v })} />
        <ToggleRow label="Ticker stats"  value={style.sections.ticker}  onChange={(v) => updateSections({ ticker: v })} />
        <ToggleRow label="Social row"    value={style.sections.social}  onChange={(v) => updateSections({ social: v })} />
        <ToggleRow label="Pin highlights" value={style.sections.content} onChange={(v) => updateSections({ content: v })} />
        <ToggleRow label="Custom links"  value={style.sections.links}   onChange={(v) => updateSections({ links: v })} />
      </Section>

      {/* ── Reset ── */}
      <Pressable
        onPress={reset}
        style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.85 }]}
      >
        <ArrowsClockwise size={14} color={colors.graphite} />
        <Text style={styles.resetText}>Reset to defaults</Text>
      </Pressable>

      {/* ── Sheets ── */}
      <EditProfileSheet
        visible={openSheet?.kind === 'profile'}
        uid={userDoc?.uid ?? null}
        initialName={userDoc?.displayName ?? null}
        initialBio={userDoc?.bio ?? null}
        initialPhotoURL={userDoc?.photoURL ?? null}
        onClose={closeSheet}
        onSave={(patch) => writeUser(patch)}
      />
      <EditBrokerageSheet
        visible={openSheet?.kind === 'brokerage'}
        initialValue={userDoc?.brokerage ?? null}
        onClose={closeSheet}
        onSave={(brokerage) => writeUser({ brokerage })}
      />
      <HexPickerSheet
        visible={openSheet?.kind === 'accentHex'}
        title="Custom accent color"
        helpCopy="Used for buttons, badges, and pin glyphs."
        fallbackHex={getPalette(style.paletteId).accent}
        initialValue={style.customAccentColor || null}
        onClose={closeSheet}
        onSave={(hex) => writeStyle({ customAccentColor: hex })}
      />
      <HexPickerSheet
        visible={openSheet?.kind === 'bgHex'}
        title="Custom profile background"
        helpCopy="The surface your profile elements sit on — avatar, name, socials, map peek."
        fallbackHex={getPalette(style.paletteId).cardBg}
        initialValue={style.customBackgroundColor || null}
        onClose={closeSheet}
        onSave={(hex) => writeStyle({ customBackgroundColor: hex })}
      />
      <HexPickerSheet
        visible={openSheet?.kind === 'fontHex'}
        title="Custom heading color"
        helpCopy="Overrides the palette text color for your name + headlines."
        fallbackHex={getPalette(style.paletteId).textPrimary}
        initialValue={style.customFontColor || null}
        onClose={closeSheet}
        onSave={(hex) => writeStyle({ customFontColor: hex })}
      />
      <StatePickerSheet
        visible={openSheet?.kind === 'state'}
        selectedShapeId={style.shapeId}
        onClose={closeSheet}
        onPick={(shapeId) => writeStyle({ shapeId })}
      />
      <CustomTickerSheet
        visible={openSheet?.kind === 'ticker'}
        items={style.tickerCustom}
        onClose={closeSheet}
        onSave={(items) => writeStyle({ tickerCustom: items })}
      />
      <AddPlatformSheet
        visible={openSheet?.kind === 'platform'}
        initialId={openSheet?.kind === 'platform' ? openSheet.initialId : undefined}
        initialValue={openSheet?.kind === 'platform' ? openSheet.initialValue : undefined}
        onClose={closeSheet}
        onSave={async (platformId, username) => {
          const list = userDoc?.platforms ?? []
          const exists = list.some((p) => p.id === platformId)
          const next = exists
            ? list.map((p) => (p.id === platformId ? { ...p, username } : p))
            : [...list, { id: platformId, username }]
          await writeUser({ platforms: next })
        }}
      />

      <ConfirmSheet
        visible={resetConfirmOpen}
        title="Reset style?"
        message="This restores the default palette, font, map shape, and section settings."
        confirmLabel="Reset"
        destructive
        onConfirm={() => { writeStyle(DEFAULT_STYLE); setResetConfirmOpen(false) }}
        onClose={() => setResetConfirmOpen(false)}
      />
    </ScrollView>
  )
}

// ─── ProfileBasicsRow ────────────────────────────────────────────
function ProfileBasicsRow({
  displayName,
  bio,
  photoURL,
  onEdit,
}: {
  displayName: string | null
  bio: string | null
  photoURL: string | null
  onEdit: () => void
}) {
  const profileStyles = useThemedStyles(_profileStyles)
  const colors = useColors()
  const initial = (displayName || 'A').slice(0, 1).toUpperCase()
  return (
    <View style={profileStyles.row}>
      <View style={profileStyles.avatar}>
        {/* photoURL render placeholder until we wire expo-image in the modal */}
        <Text style={profileStyles.initial}>{initial}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={profileStyles.name} numberOfLines={1}>{displayName || 'Add your name'}</Text>
        <Text style={profileStyles.bio} numberOfLines={1}>{bio || 'Add a short bio'}</Text>
      </View>
      <Pressable
        onPress={() => { lightTap(); onEdit() }}
        style={({ pressed }) => [profileStyles.editBtn, pressed && { opacity: 0.85 }]}
      >
        <PencilSimple size={13} color={colors.ink} />
        <Text style={profileStyles.editText}>Edit</Text>
      </Pressable>
    </View>
  )
}

function BrokerageRow({ brokerage, onEdit }: { brokerage: string | null; onEdit: () => void }) {
  const profileStyles = useThemedStyles(_profileStyles)
  const colors = useColors()
  return (
    <Pressable
      onPress={() => { lightTap(); onEdit() }}
      style={({ pressed }) => [profileStyles.brokerageRow, pressed && { opacity: 0.85 }]}
    >
      <View style={profileStyles.brokerageIcon}>
        <Buildings size={15} color={colors.graphite} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={profileStyles.brokerageTitle} numberOfLines={1}>
          {brokerage || 'Add brokerage / company'}
        </Text>
        <Text style={profileStyles.brokerageSub} numberOfLines={1}>
          {brokerage ? 'Tap to edit' : 'Shown on your About page + verified badge'}
        </Text>
      </View>
      <CaretRight size={14} color={COLORS.ash} />
    </Pressable>
  )
}

const _profileStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.tangerine,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.warmWhite },
  name: { fontFamily: FONTS.humanistSemibold, fontSize: 14, color: COLORS.ink },
  bio: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 2 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.pearl,
  },
  editText: { fontFamily: FONTS.humanistMedium, fontSize: 12.5, color: COLORS.ink },

  brokerageRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 12, padding: 12, borderRadius: 12,
    backgroundColor: COLORS.cream,
  },
  brokerageIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.pearl,
    alignItems: 'center', justifyContent: 'center',
  },
  brokerageTitle: { fontFamily: FONTS.humanistSemibold, fontSize: 13.5, color: COLORS.ink },
  brokerageSub: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, marginTop: 2 },
})

// ─── FrameRow — label + segmented selector stacked ───────────────
const FRAME_OPTIONS: { id: FrameStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'border', label: 'Border' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'border_shadow', label: 'Both' },
]

function FrameRow({
  label,
  icon,
  value,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  value: FrameStyle
  onChange: (v: FrameStyle) => void
}) {
  const frameRowStyles = useThemedStyles(_frameRowStyles)
  return (
    <View>
      <View style={frameRowStyles.labelRow}>
        <View style={frameRowStyles.iconChip}>{icon}</View>
        <Text style={frameRowStyles.label}>{label}</Text>
      </View>
      <FrameSegmented options={FRAME_OPTIONS} value={value} onChange={onChange} />
    </View>
  )
}

const _frameRowStyles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconChip: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.pearl,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontFamily: FONTS.humanistMedium, fontSize: 13, color: COLORS.ink },
})

// ─── CustomColorRow — Pro-gated custom color picker entry ───────
function CustomColorRow({
  label,
  value,
  fallbackHex,
  isFree,
  onOpen,
  onPaywall,
  dimmedNote,
}: {
  label: string
  /** Currently-saved custom hex, or null when using the palette default. */
  value: string | null
  /** Color shown in the swatch when no override is set. */
  fallbackHex: string
  isFree: boolean
  onOpen: () => void
  onPaywall: () => void
  /** Optional muted-state note (e.g. when a sibling image override
   *  takes precedence over this color). */
  dimmedNote?: string
}) {
  const stubStyles = useThemedStyles(_stubStyles)
  const colors = useColors()
  const HEX_RE = /^#([0-9A-Fa-f]{6})$/
  const swatchColor = value ?? (HEX_RE.test(fallbackHex) ? fallbackHex : '#FFFFFF')
  return (
    <View style={stubStyles.wrap}>
      <View style={stubStyles.labelRow}>
        <Text style={stubStyles.label}>{label}</Text>
        {isFree ? <ProBadge /> : null}
      </View>
      <Pressable
        onPress={() => { lightTap(); if (isFree) onPaywall(); else onOpen() }}
        style={({ pressed }) => [
          stubStyles.colorBtn,
          dimmedNote && { opacity: 0.55 },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={[stubStyles.colorSwatch, { backgroundColor: swatchColor }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={stubStyles.colorValue} numberOfLines={1}>
            {value ?? 'Using palette default'}
          </Text>
          {dimmedNote ? (
            <Text style={stubStyles.colorNote} numberOfLines={2}>{dimmedNote}</Text>
          ) : null}
        </View>
        <CaretRight size={14} color={COLORS.ash} />
      </Pressable>
    </View>
  )
}

// ─── StatePickerRow — Pro-gated state shape selector entry ──────
function StatePickerRow({
  shapeId,
  accent,
  isFree,
  onOpen,
  onPaywall,
}: {
  shapeId: string
  accent: string
  isFree: boolean
  onOpen: () => void
  onPaywall: () => void
}) {
  const stubStyles = useThemedStyles(_stubStyles)
  const colors = useColors()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { STATE_SHAPES } = require('../../lib/stateShapes') as typeof import('../../lib/stateShapes')
  const selectedCode = shapeId.startsWith('state_') ? shapeId.slice('state_'.length) : null
  const selected = selectedCode ? STATE_SHAPES.find((s) => s.code === selectedCode) ?? null : null
  return (
    <View style={stubStyles.wrap}>
      <View style={stubStyles.labelRow}>
        <Text style={stubStyles.label}>Or pick your state</Text>
        {isFree ? <ProBadge /> : null}
      </View>
      <Pressable
        onPress={() => { lightTap(); if (isFree) onPaywall(); else onOpen() }}
        style={({ pressed }) => [stubStyles.colorBtn, pressed && { opacity: 0.85 }]}
      >
        <View style={stubStyles.statePreview}>
          {selected ? (
            <Svg width={28} height={28} viewBox="0 0 1 1">
              <Path d={selected.d} fill={accent} />
            </Svg>
          ) : (
            <Text style={stubStyles.statePreviewEmpty}>—</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={stubStyles.colorValue} numberOfLines={1}>
            {selected ? selected.name : 'Florida realtor? Texas? Pick yours.'}
          </Text>
        </View>
        <CaretRight size={14} color={COLORS.ash} />
      </Pressable>
    </View>
  )
}

const _stubStyles = StyleSheet.create({
  wrap: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  label: {
    fontFamily: FONTS.humanistSemibold, fontSize: 12, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  colorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.cream,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12,
  },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(10,14,23,0.10)',
  },
  colorValue: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.ink },
  colorNote: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, marginTop: 2 },
  statePreview: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1, borderColor: 'rgba(10,14,23,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  statePreviewEmpty: { fontFamily: FONTS.humanistBold, fontSize: 10, color: COLORS.ash },
})

// ─── Collapsed-state previews ────────────────────────────────────
function PaletteSwatchPreview({ palette }: { palette: ReturnType<typeof getPalette> }) {
  const previewStyles = useThemedStyles(_previewStyles)
  return (
    <View style={previewStyles.wrap}>
      <View style={previewStyles.dotStack}>
        <View style={[previewStyles.dot, { backgroundColor: palette.cardBg }]} />
        <View style={[previewStyles.dot, { backgroundColor: palette.accent, marginLeft: -6 }]} />
        <View style={[previewStyles.dot, { backgroundColor: palette.textPrimary, marginLeft: -6 }]} />
      </View>
      <Text style={previewStyles.label}>{palette.name}</Text>
    </View>
  )
}

function FontNamePreview({ font }: { font: ReturnType<typeof getFont> }) {
  const previewStyles = useThemedStyles(_previewStyles)
  return (
    <View style={previewStyles.wrap}>
      <Text style={[previewStyles.aa, font.previewFamily ? { fontFamily: font.previewFamily } : null]}>Aa</Text>
      <Text style={previewStyles.label}>{font.name}</Text>
    </View>
  )
}

function ShapeGlyphPreview({ shapeId, accent }: { shapeId: string; accent: string }) {
  const previewStyles = useThemedStyles(_previewStyles)
  // State ids aren't in the geometric SHAPES registry — `getShape`
  // falls back to 'heart' for them. Resolve to the actual state
  // silhouette so the collapsed preview matches the user's pick.
  if (isStateShape(shapeId)) {
    const code = shapeId.slice('state_'.length)
    const state = STATE_SHAPES.find((s) => s.code === code) ?? null
    return (
      <View style={previewStyles.wrap}>
        {state ? (
          <Svg width={22} height={22} viewBox="0 0 1 1">
            <Path d={state.d} fill={accent} />
          </Svg>
        ) : null}
        <Text style={previewStyles.label}>{state?.name ?? code}</Text>
      </View>
    )
  }
  const shape = getShape(shapeId)
  return (
    <View style={previewStyles.wrap}>
      <Svg width={22} height={22} viewBox="0 0 1 1">
        <Path d={shape.d} fill={accent} />
      </Svg>
      <Text style={previewStyles.label}>{shape.name}</Text>
    </View>
  )
}

const _previewStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotStack: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  aa: { fontFamily: FONTS.humanistBold, fontSize: 16, color: COLORS.ink, letterSpacing: -0.4 },
  label: { fontFamily: FONTS.humanistSemibold, fontSize: 12, color: COLORS.ink, maxWidth: 120 },
})

// ─── Root styles ─────────────────────────────────────────────────
const _styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  tabTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  tabSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 2 },

  gridTwo: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  colHalf: { width: '50%', paddingHorizontal: 4, marginBottom: 8 },
  gridThree: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  colThird: { width: '33.333%', paddingHorizontal: 4, marginBottom: 8 },

  sublabel: {
    fontFamily: FONTS.humanistSemibold, fontSize: 11.5, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.6, paddingTop: 4, paddingBottom: 4,
  },
  customLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, paddingBottom: 4 },
  paywallStub: {
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  paywallStubText: { fontFamily: FONTS.humanist, fontSize: 12.5, color: COLORS.graphite, lineHeight: 17 },
  collapsedPreviewText: {
    fontFamily: FONTS.humanistSemibold, fontSize: 12, color: COLORS.smoke,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: COLORS.pearl, overflow: 'hidden',
  },

  linksPosRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  linksPosLabel: {
    fontFamily: FONTS.humanistSemibold, fontSize: 11, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  linksPosGroup: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.cream,
    borderRadius: 999, padding: 2,
  },
  linksPosPill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
  },
  linksPosPillActive: {
    backgroundColor: COLORS.warmWhite,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 2,
  },
  linksPosPillText: {
    fontFamily: FONTS.humanistSemibold, fontSize: 11.5, color: COLORS.graphite,
  },
  linksPosPillTextActive: { color: COLORS.ink },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.tangerine,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
  },
  addBtnText: { fontFamily: FONTS.humanistBold, fontSize: 12, color: COLORS.warmWhite },
  platformRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.cream,
    padding: 10, borderRadius: 12,
    marginBottom: 6,
  },
  platformIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: COLORS.pearl,
    alignItems: 'center', justifyContent: 'center',
  },
  platformName: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.ink },
  platformValue: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, marginTop: 1 },
  emptyText: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, textAlign: 'center', paddingVertical: 8 },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 12,
    backgroundColor: COLORS.cream,
    borderWidth: 1, borderColor: COLORS.borderLight,
    marginTop: 4,
  },
  resetText: { fontFamily: FONTS.humanistMedium, fontSize: 13.5, color: COLORS.graphite },
})
