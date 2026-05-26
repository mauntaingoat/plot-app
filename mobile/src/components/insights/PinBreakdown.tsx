/**
 * Top Pins ranked by selected metric (taps / saves / waves).
 * Each row shows rank + address + value + progress bar normalized
 * to the leader. Mirrors `PinBreakdown` in
 * `src/components/dashboard/AdvancedInsights.tsx`.
 */
import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap, selection } from '../../lib/haptics'
import type { Pin } from '../../types'

const TOOLTIP_AUTODISMISS_MS = 3500

type PinMetric = 'taps' | 'saves' | 'waves'
const PIN_METRICS: { id: PinMetric; label: string }[] = [
  { id: 'taps', label: 'Taps' },
  { id: 'saves', label: 'Subscribers' },
  { id: 'waves', label: 'Waves' },
]

export function PinBreakdown({ pins }: { pins: Pin[] }) {
  const styles = useThemedStyles(_styles)
  const [metric, setMetric] = useState<PinMetric>('taps')
  const getValue = (p: Pin) =>
    metric === 'taps' ? p.taps || 0 : metric === 'saves' ? p.saves || 0 : p.waves || 0

  const sorted = useMemo(
    () => [...pins].sort((a, b) => getValue(b) - getValue(a)).slice(0, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pins, metric],
  )
  const max = sorted[0] ? getValue(sorted[0]) : 1

  // Tap a row → reveal a chip with the pin's full primitives.
  const [activeId, setActiveId] = useState<string | null>(null)
  useEffect(() => {
    if (!activeId) return
    const t = setTimeout(() => setActiveId(null), TOOLTIP_AUTODISMISS_MS)
    return () => clearTimeout(t)
  }, [activeId])

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Pins by {PIN_METRICS.find((m) => m.id === metric)!.label}</Text>
        <View style={styles.toggleWrap}>
          {PIN_METRICS.map((m) => {
            const active = m.id === metric
            return (
              <Pressable
                key={m.id}
                onPress={() => { if (!active) { selection(); setMetric(m.id) } }}
                style={({ pressed }) => [
                  styles.toggleBtn,
                  active && styles.toggleBtnActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{m.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {sorted.length === 0 ? (
        <Text style={styles.empty}>No pins yet.</Text>
      ) : (
        sorted.map((p, i) => {
          const value = getValue(p)
          const pct = max > 0 ? (value / max) * 100 : 0
          const active = activeId === p.id
          return (
            <Pressable
              key={p.id}
              onPress={() => { lightTap(); setActiveId(active ? null : p.id) }}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
            >
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.rowHead}>
                  <Text style={styles.address} numberOfLines={1}>{p.address.split(',')[0]}</Text>
                  <Text style={styles.value}>{value.toLocaleString()}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]}>
                    <LinearGradient
                      colors={['#FF6B3D', '#E8522A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                </View>
                {active ? (
                  <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle} numberOfLines={1}>{p.address}</Text>
                    <View style={styles.tooltipStats}>
                      <TooltipStat label="views" value={p.views ?? 0} />
                      <TooltipDot />
                      <TooltipStat label="taps" value={p.taps ?? 0} />
                      <TooltipDot />
                      <TooltipStat label="subscribers" value={p.saves ?? 0} />
                      <TooltipDot />
                      <TooltipStat label="waves" value={p.waves ?? 0} />
                    </View>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )
        })
      )}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  title: { flex: 1, fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  toggleWrap: { flexDirection: 'row', padding: 2, borderRadius: 999, backgroundColor: COLORS.cream },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  toggleBtnActive: {
    backgroundColor: COLORS.warmWhite,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 1,
  },
  toggleText: { fontFamily: FONTS.humanistSemibold, fontSize: 11, color: COLORS.smoke },
  toggleTextActive: { color: COLORS.ink },

  empty: { fontFamily: FONTS.humanist, fontSize: 12.5, color: COLORS.smoke, textAlign: 'center', paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  rank: { width: 20, textAlign: 'right', fontFamily: FONTS.humanistBold, fontSize: 11, color: 'rgba(255, 107, 61, 0.4)', marginTop: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  address: { flex: 1, fontFamily: FONTS.humanistSemibold, fontSize: 12.5, color: COLORS.ink, marginRight: 8 },
  value: { fontFamily: FONTS.humanistBold, fontSize: 12.5, color: COLORS.ink },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.cream, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },

  tooltip: {
    // Absolute-positioned over the row so the chip doesn't push the
    // rest of the card downward. Left-anchored to the row content.
    position: 'absolute',
    top: -2,
    left: 30,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.ink,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  tooltipTitle: { fontFamily: FONTS.humanistBold, fontSize: 11, color: COLORS.warmWhite, marginBottom: 2 },
  tooltipStats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  tooltipStat: { fontFamily: FONTS.humanist, fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  tooltipDot: { fontFamily: FONTS.humanist, fontSize: 10, color: 'rgba(255,255,255,0.45)' },
})

function TooltipStat({ label, value }: { label: string; value: number }) {
  return <Text style={_styles.tooltipStat}>{value.toLocaleString()} {label}</Text>
}
function TooltipDot() {
  return <Text style={_styles.tooltipDot}>·</Text>
}
