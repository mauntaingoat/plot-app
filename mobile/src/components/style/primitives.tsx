/**
 * Style-tab shared primitives — Section / ToggleRow / ProBadge /
 * FrameSegmented. All are dumb presentational components; the
 * StyleTab passes state + callbacks.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CaretRight, Lock } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap, selection } from '../../lib/haptics'

// ─── Section — collapsible card chrome ────────────────────────────
export function Section({
  title,
  subtitle,
  action,
  children,
  collapsible,
  defaultCollapsed = true,
  collapsedPreview,
  expanded,
  onToggleExpanded,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  collapsedPreview?: ReactNode
  /** Controlled-mode: when both `expanded` and `onToggleExpanded`
   *  are provided, the parent owns the open/closed state — used to
   *  build accordion groups where opening one section collapses
   *  the others. Falls back to internal state otherwise. */
  expanded?: boolean
  onToggleExpanded?: (next: boolean) => void
}) {
  const sectionStyles = useThemedStyles(_sectionStyles)
  const controlled = expanded !== undefined && onToggleExpanded !== undefined
  const [internal, setInternal] = useState(collapsible ? defaultCollapsed : false)
  const collapsed = controlled ? !expanded : internal
  const isCollapsed = !!collapsible && collapsed
  const toggle = () => {
    if (controlled) onToggleExpanded!(!expanded)
    else setInternal((v) => !v)
  }

  const HeaderInner = (
    <>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={sectionStyles.title}>{title}</Text>
        {subtitle ? <Text style={sectionStyles.subtitle}>{subtitle}</Text> : null}
      </View>
      {collapsible ? (
        <View style={sectionStyles.previewWrap}>
          {isCollapsed ? collapsedPreview : action}
          <CaretRight
            size={14}
            color={COLORS.ash}
            style={{ transform: [{ rotate: isCollapsed ? '0deg' : '90deg' }] }}
          />
        </View>
      ) : (
        action
      )}
    </>
  )

  // When collapsible AND collapsed → the whole card is the tap
  // target (no children rendered, so the body padding would be a
  // dead zone otherwise). When expanded, the header alone is the
  // toggle so tapping into pickers/grids inside doesn't accidentally
  // collapse the section.
  if (collapsible && isCollapsed) {
    return (
      <Pressable
        onPress={() => { lightTap(); toggle() }}
        style={({ pressed }) => [sectionStyles.card, pressed && { opacity: 0.85 }]}
      >
        <View style={sectionStyles.header}>{HeaderInner}</View>
      </Pressable>
    )
  }

  return (
    <View style={sectionStyles.card}>
      {collapsible ? (
        <Pressable
          onPress={() => { lightTap(); toggle() }}
          style={({ pressed }) => [
            sectionStyles.header,
            { marginBottom: 12 },
            pressed && { opacity: 0.8 },
          ]}
        >
          {HeaderInner}
        </Pressable>
      ) : (
        <View style={[sectionStyles.header, { marginBottom: 12 }]}>{HeaderInner}</View>
      )}
      {children}
    </View>
  )
}

const _sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  subtitle: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 2 },
  previewWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
})

// ─── ProBadge — pill with lock glyph + brand gradient ─────────────
export function ProBadge({ corner = false }: { corner?: boolean }) {
  return (
    <View style={[badgeStyles.wrap, corner && badgeStyles.corner]} pointerEvents="none">
      <LinearGradient
        colors={[...COLORS.brandGradient]}
        locations={[...COLORS.brandGradientLocations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Lock size={8} color={COLORS.warmWhite} weight="fill" />
      <Text style={badgeStyles.text}>Pro</Text>
    </View>
  )
}

const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  corner: { position: 'absolute', top: 6, right: 6, zIndex: 10 },
  text: {
    fontFamily: FONTS.humanistBold,
    fontSize: 9,
    color: COLORS.warmWhite,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
})

// ─── ToggleRow — labeled iOS-style switch ─────────────────────────
export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  const toggleStyles = useThemedStyles(_toggleStyles)
  const [optimistic, setOptimistic] = useState(value)
  useEffect(() => { setOptimistic(value) }, [value])
  return (
    <View style={toggleStyles.row}>
      <Text style={toggleStyles.label}>{label}</Text>
      <Toggle
        value={optimistic}
        onChange={(next) => { setOptimistic(next); selection(); onChange(next) }}
      />
    </View>
  )
}

/** The visual toggle alone — used inside ToggleRow and elsewhere. */
export function Toggle({
  value,
  onChange,
  size = 'normal',
}: {
  value: boolean
  onChange: (v: boolean) => void
  size?: 'normal' | 'small'
}) {
  const toggleStyles = useThemedStyles(_toggleStyles)
  const W = size === 'small' ? 38 : 42
  const H = size === 'small' ? 22 : 24
  const BALL = size === 'small' ? 18 : 20
  const PAD = 2
  const TRAVEL = W - BALL - PAD * 2

  const x = useRef(new Animated.Value(value ? TRAVEL : 0)).current
  useEffect(() => {
    Animated.timing(x, {
      toValue: value ? TRAVEL : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [value, x, TRAVEL])

  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[toggleStyles.track, { width: W, height: H, borderRadius: H / 2 }]}
    >
      {value ? (
        <LinearGradient
          colors={[...COLORS.brandGradient]}
          locations={[...COLORS.brandGradientLocations]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: H / 2 }]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#D6D6D6', borderRadius: H / 2 }]} />
      )}
      <Animated.View
        style={[
          toggleStyles.ball,
          { width: BALL, height: BALL, borderRadius: BALL / 2, top: PAD, left: PAD, transform: [{ translateX: x }] },
        ]}
      />
    </Pressable>
  )
}

const _toggleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  label: { fontFamily: FONTS.humanist, fontSize: 13.5, color: COLORS.ink, flex: 1, marginRight: 12 },
  track: { position: 'relative' },
  ball: {
    backgroundColor: '#fff',
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1.5,
    elevation: 2,
  },
})

// ─── FrameSegmented — 4-option pill selector ──────────────────────
export function FrameSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  const segStyles = useThemedStyles(_segStyles)
  return (
    <View style={segStyles.wrap}>
      {options.map((o) => {
        const active = value === o.id
        return (
          <Pressable
            key={o.id}
            onPress={() => { if (!active) { selection(); onChange(o.id) } }}
            style={({ pressed }) => [
              segStyles.item,
              active && segStyles.itemActive,
              pressed && !active && { opacity: 0.7 },
            ]}
          >
            <Text style={[segStyles.text, active && segStyles.textActive]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const _segStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 10,
    backgroundColor: COLORS.cream,
  },
  item: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  text: { fontFamily: FONTS.humanistMedium, fontSize: 11.5, color: COLORS.smoke },
  // Literal black — the active pill keeps a white background in both
  // light AND dark modes, so we must NOT swap ink → light here or
  // the label disappears against the white pill.
  textActive: { color: '#0A0A0A' },
})
