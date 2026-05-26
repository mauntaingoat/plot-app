/**
 * 7-day bar chart with metric toggle (Profile Visits / Taps).
 * Mirrors `src/components/dashboard/InsightsChart.tsx` — data points
 * end at TODAY so the last bar reflects the in-progress day.
 *
 * Tap a bar to reveal its count in a floating chip. Tap the same
 * bar (or any other) to dismiss/move. Auto-clears after ~3s.
 */
import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap, selection } from '../../lib/haptics'

export interface ChartPoint {
  label: string
  value: number
}

const TOOLTIP_AUTODISMISS_MS = 3000
const TOOLTIP_SLOT = 40

export function InsightsChart<T extends string>({
  data,
  height = 160,
  title = 'Weekly Views',
  subtitle = 'Last 7 days',
  metricToggle,
}: {
  data: ChartPoint[]
  height?: number
  title?: string
  subtitle?: string
  metricToggle?: {
    value: T
    onChange: (next: T) => void
    options: { id: T; label: string }[]
  }
}) {
  const styles = useThemedStyles(_styles)
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data])
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data])

  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  useEffect(() => {
    if (activeIdx === null) return
    const t = setTimeout(() => setActiveIdx(null), TOOLTIP_AUTODISMISS_MS)
    return () => clearTimeout(t)
  }, [activeIdx])

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{total.toLocaleString()} total · {subtitle}</Text>
        </View>
        {metricToggle ? (
          <View style={styles.toggleWrap}>
            {metricToggle.options.map((opt) => {
              const active = opt.id === metricToggle.value
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => { if (!active) { selection(); metricToggle.onChange(opt.id) } }}
                  style={({ pressed }) => [
                    styles.toggleBtn,
                    active && styles.toggleBtnActive,
                    pressed && !active && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{opt.label}</Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}
      </View>

      {/* Bars area. Each column reserves a fixed-height tooltip slot
          at the top so a chip appearing above the bar doesn't shove
          the layout around (the slot is always present, just empty
          when no bar is active). */}
      <View style={[styles.barsArea, { height: height + TOOLTIP_SLOT }]}>
        {data.map((p, i) => {
          const barH = Math.max(4, (p.value / max) * height)
          const active = activeIdx === i
          return (
            <Pressable
              key={i}
              onPress={() => { lightTap(); setActiveIdx(active ? null : i) }}
              style={styles.barCol}
            >
              <View style={styles.tooltipSlot}>
                {active ? (
                  <View style={styles.tooltip}>
                    <Text style={styles.tooltipValue}>{p.value.toLocaleString()}</Text>
                    <Text style={styles.tooltipLabel}>{p.label}</Text>
                    <View style={styles.tooltipTail} />
                  </View>
                ) : null}
              </View>
              <View style={[styles.barOuter, { height: barH }]}>
                <LinearGradient
                  colors={active
                    ? ['#FF6B3D', '#E8522A']
                    : ['rgba(255, 107, 61, 0.5)', '#FF6B3D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </Pressable>
          )
        })}
      </View>
      <View style={styles.labelRow}>
        {data.map((p, i) => (
          <Text key={i} style={styles.barLabel}>{p.label}</Text>
        ))}
      </View>
    </View>
  )
}

const _styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.borderLight,
    padding: 16,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  title: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  subtitle: { fontFamily: FONTS.humanist, fontSize: 11, color: COLORS.smoke, marginTop: 1 },
  toggleWrap: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 999,
    backgroundColor: COLORS.cream,
  },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  toggleBtnActive: {
    backgroundColor: COLORS.warmWhite,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: { fontFamily: FONTS.humanistSemibold, fontSize: 11, color: COLORS.smoke },
  toggleTextActive: { color: COLORS.ink },

  barsArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },

  tooltipSlot: { height: TOOLTIP_SLOT, alignItems: 'center', justifyContent: 'flex-end' },
  tooltip: {
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    marginBottom: 6,
  },
  tooltipValue: { fontFamily: FONTS.humanistBold, fontSize: 11, color: COLORS.warmWhite },
  tooltipLabel: { fontFamily: FONTS.humanist, fontSize: 9, color: 'rgba(255,255,255,0.7)' },
  tooltipTail: {
    position: 'absolute', bottom: -4,
    width: 0, height: 0,
    borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 4,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: COLORS.ink,
  },

  barOuter: {
    width: '100%',
    borderTopLeftRadius: 6, borderTopRightRadius: 6,
    overflow: 'hidden',
  },
  labelRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  barLabel: { flex: 1, textAlign: 'center', fontFamily: FONTS.humanistSemibold, fontSize: 10, color: COLORS.ash },
})
