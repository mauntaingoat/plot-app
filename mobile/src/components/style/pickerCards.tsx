/**
 * Style-tab picker cards — PaletteCard, FontCard, ShapeCard,
 * LayoutCard. Each tap selects the value (or fires the Pro paywall
 * when locked).
 */
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path } from 'react-native-svg'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap } from '../../lib/haptics'
import type { Palette, FontPairing, MapShape } from '../../lib/style'
import { ProBadge } from './primitives'

const ACTIVE_RING = '#D94A1F'

// ─── PaletteCard ─────────────────────────────────────────────────
export function PaletteCard({
  palette,
  active,
  locked,
  onPress,
}: {
  palette: Palette
  active: boolean
  locked?: boolean
  onPress: () => void
}) {
  const styles = useThemedStyles(_styles)
  return (
    <Pressable
      onPress={() => { lightTap(); onPress() }}
      style={({ pressed }) => [
        styles.card,
        active && styles.cardActive,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={[styles.paletteCanvas, { backgroundColor: palette.pageCanvas }]}>
        <View style={styles.paletteCardSurface}>
          {palette.cardGradient ? (
            <LinearGradient
              colors={
                palette.cardGradient.mid
                  ? [palette.cardGradient.from, palette.cardGradient.mid, palette.cardGradient.to]
                  : [palette.cardGradient.from, palette.cardGradient.to]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 8 }]}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.cardBg, borderRadius: 8 }]} />
          )}
          {/* Accent dot + text bar (bottom of card preview) */}
          <View style={styles.paletteRow}>
            <View style={[styles.paletteDot, { backgroundColor: palette.accent }]} />
            <View style={[styles.paletteBar, { backgroundColor: palette.textPrimary, opacity: 0.55 }]} />
          </View>
        </View>
        {locked ? <ProBadge corner /> : null}
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardName} numberOfLines={1}>{palette.name}</Text>
        <Text style={styles.cardVibe} numberOfLines={1}>{palette.vibe}</Text>
      </View>
    </Pressable>
  )
}

// ─── FontCard ─────────────────────────────────────────────────────
export function FontCard({
  font,
  active,
  locked,
  onPress,
}: {
  font: FontPairing
  active: boolean
  locked?: boolean
  onPress: () => void
}) {
  const styles = useThemedStyles(_styles)
  return (
    <Pressable
      onPress={() => { lightTap(); onPress() }}
      style={({ pressed }) => [
        styles.fontCard,
        active && styles.cardActive,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <Text
        style={[
          styles.fontPreview,
          font.previewFamily ? { fontFamily: font.previewFamily } : null,
        ]}
      >
        Aa
      </Text>
      <View style={styles.fontMeta}>
        <Text style={styles.cardName} numberOfLines={1}>{font.name}</Text>
        {locked ? <ProBadge /> : null}
      </View>
      <Text style={styles.cardVibe} numberOfLines={1}>{font.vibe}</Text>
    </Pressable>
  )
}

// ─── ShapeCard ────────────────────────────────────────────────────
export function ShapeCard({
  shape,
  active,
  accent,
  locked,
  onPress,
}: {
  shape: MapShape
  active: boolean
  accent: string
  locked?: boolean
  onPress: () => void
}) {
  const styles = useThemedStyles(_styles)
  return (
    <Pressable
      onPress={() => { lightTap(); onPress() }}
      style={({ pressed }) => [
        styles.shapeCard,
        active && styles.cardActive,
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      {locked ? <ProBadge corner /> : null}
      <Svg width="100%" height={60} viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet">
        <Path d={shape.d} fill={accent} />
      </Svg>
      <Text style={styles.shapeName} numberOfLines={1}>{shape.name}</Text>
    </Pressable>
  )
}

// ─── LayoutCard ───────────────────────────────────────────────────
export function LayoutCard({
  id,
  name,
  vibe,
  active,
  onPress,
}: {
  id: 'scroller' | 'grid'
  name: string
  vibe: string
  active: boolean
  onPress: () => void
}) {
  const styles = useThemedStyles(_styles)
  return (
    <Pressable
      onPress={() => { lightTap(); onPress() }}
      style={({ pressed }) => [
        styles.layoutCard,
        active && styles.layoutCardActive,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={styles.layoutPreview}>
        {id === 'scroller' ? (
          // Horizontal strip of placeholder cards
          <View style={styles.scrollerRow}>
            {[1, 0.95, 0.9, 0.7, 0.4].map((opacity, i) => (
              <View key={i} style={[styles.scrollerCell, { opacity }]} />
            ))}
          </View>
        ) : (
          // 3×2 grid of cells — two equal rows of three flex-1 cells.
          // We use explicit rows (not flex-wrap) because aspectRatio +
          // width-percent + wrap collapses cells inside a fixed-height
          // tray.
          <View style={styles.gridWrap}>
            <View style={styles.gridRow}>
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
            </View>
            <View style={styles.gridRow}>
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
            </View>
          </View>
        )}
      </View>
      <Text style={[styles.cardName, active && { color: '#0A0E17' }]} numberOfLines={1}>{name}</Text>
      <Text style={[styles.cardVibe, active && { color: 'rgba(10,14,23,0.6)' }]} numberOfLines={1}>{vibe}</Text>
    </Pressable>
  )
}

// ─────────────────────────────────────────────────────────────────
const _styles = StyleSheet.create({
  // Shared
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: ACTIVE_RING,
  },
  cardFooter: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: COLORS.warmWhite },
  cardName: { fontFamily: FONTS.humanistSemibold, fontSize: 12.5, color: COLORS.ink },
  cardVibe: { fontFamily: FONTS.humanist, fontSize: 10.5, color: COLORS.smoke, marginTop: 1 },

  // Palette
  paletteCanvas: { aspectRatio: 5 / 3, position: 'relative' },
  paletteCardSurface: {
    position: 'absolute',
    left: 12, right: 12, top: 18, bottom: 12,
    borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(10,14,23,0.10)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 8,
  },
  paletteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paletteDot: { width: 10, height: 10, borderRadius: 5 },
  paletteBar: { height: 5, borderRadius: 2, flex: 1 },

  // Font
  fontCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  fontPreview: {
    fontSize: 26,
    color: COLORS.ink,
    letterSpacing: -0.5,
    fontWeight: Platform.select({ ios: '600', default: 'bold' }) as '600',
  },
  fontMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },

  // Shape
  shapeCard: {
    borderRadius: 14,
    padding: 10,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
  },
  shapeName: { fontFamily: FONTS.humanistSemibold, fontSize: 11.5, color: COLORS.ink, marginTop: 4 },

  // Layout
  layoutCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1.5,
    borderColor: 'rgba(10,14,23,0.10)',
  },
  layoutCardActive: {
    backgroundColor: '#FFE5DA',
    borderWidth: 2,
    borderColor: ACTIVE_RING,
  },
  layoutPreview: {
    height: 64,
    borderRadius: 10,
    backgroundColor: COLORS.pearl,
    overflow: 'hidden',
    marginBottom: 10,
    justifyContent: 'center',
  },
  // Inactive cells lift off the cream tray; active state will tint
  // the tray peachier via parent bg, so we keep cells warm-white in
  // both states for legibility.
  scrollerRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, alignItems: 'center' },
  scrollerCell: {
    width: 40, height: 48, borderRadius: 6,
    backgroundColor: COLORS.warmWhite,
  },
  gridWrap: { flex: 1, flexDirection: 'column', padding: 6, gap: 5 },
  gridRow: { flexDirection: 'row', flex: 1, gap: 5 },
  gridCell: { flex: 1, borderRadius: 4, backgroundColor: COLORS.warmWhite },
})
