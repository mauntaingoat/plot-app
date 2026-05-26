/**
 * Content performance breakdown by type — Reels / Photos / Open
 * Houses. Mirrors `ContentConversion` in
 * `src/components/dashboard/AdvancedInsights.tsx`.
 *
 * Taps + waves are spread evenly across content slots within a pin
 * (we don't know which slot drove a tap), so a 3-slot pin with 12
 * taps gets 4 taps per slot.
 */
import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { FilmStrip, Image as ImageIcon, CalendarBlank } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap, selection } from '../../lib/haptics'
import type { Pin } from '../../types'

const TOOLTIP_AUTODISMISS_MS = 3500

type ContentMetric = 'taps' | 'saves' | 'waves'
const METRICS: { id: ContentMetric; label: string }[] = [
  { id: 'taps', label: 'Taps' },
  { id: 'saves', label: 'Subscribers' },
  { id: 'waves', label: 'Waves' },
]

interface Bucket { count: number; views: number; taps: number; saves: number; waves: number }

const TYPE_META: Record<string, { label: string; Icon: React.ComponentType<{ size?: number; color?: string; weight?: 'fill' | 'regular' }>; color: string }> = {
  reel:       { label: 'Reels',       Icon: FilmStrip,    color: '#FF6B3D' },
  photo:      { label: 'Photos',      Icon: ImageIcon,    color: '#34C759' },
  open_house: { label: 'Open Houses', Icon: CalendarBlank, color: '#FFAA00' },
}

export function ContentConversion({ pins }: { pins: Pin[] }) {
  const styles = useThemedStyles(_styles)
  const [metric, setMetric] = useState<ContentMetric>('taps')
  const [activeType, setActiveType] = useState<string | null>(null)
  useEffect(() => {
    if (!activeType) return
    const t = setTimeout(() => setActiveType(null), TOOLTIP_AUTODISMISS_MS)
    return () => clearTimeout(t)
  }, [activeType])

  const stats = useMemo(() => {
    const byType: Record<string, Bucket> = {
      reel:       { count: 0, views: 0, taps: 0, saves: 0, waves: 0 },
      photo:      { count: 0, views: 0, taps: 0, saves: 0, waves: 0 },
      open_house: { count: 0, views: 0, taps: 0, saves: 0, waves: 0 },
    }
    for (const pin of pins) {
      const slots = pin.content?.length ?? 0
      const tapsPerSlot = slots > 0 ? Math.round((pin.taps || 0) / slots) : 0
      const wavesPerSlot = slots > 0 ? Math.round((pin.waves || 0) / slots) : 0
      if (pin.type === 'for_sale' && pin.openHouse) {
        byType.open_house.count += 1
        byType.open_house.views += pin.views || 0
        byType.open_house.taps  += pin.taps || 0
        byType.open_house.saves += pin.saves || 0
        byType.open_house.waves += pin.waves || 0
      }
      for (const c of pin.content ?? []) {
        const key = c.type ?? 'photo'
        if (key === 'video_note' || (key as string) === 'live') continue
        const b = byType[key] || (byType[key] = { count: 0, views: 0, taps: 0, saves: 0, waves: 0 })
        b.count += 1
        b.views += c.views || 0
        b.taps  += tapsPerSlot
        b.saves += c.saves || 0
        b.waves += wavesPerSlot
      }
    }
    return Object.entries(byType).map(([type, s]) => ({ type, ...s }))
  }, [pins])

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Content Performance</Text>
        <View style={styles.toggleWrap}>
          {METRICS.map((m) => {
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

      {stats.map((s) => {
        const meta = TYPE_META[s.type] || { label: s.type, Icon: ImageIcon, color: COLORS.smoke }
        const Icon = meta.Icon
        const value = s[metric]
        const active = activeType === s.type
        return (
          <Pressable
            key={s.type}
            onPress={() => { lightTap(); setActiveType(active ? null : s.type) }}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
          >
            <View style={[styles.iconChip, { backgroundColor: `${meta.color}1f` }]}>
              <Icon size={16} color={meta.color} weight="regular" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.rowHead}>
                <Text style={styles.label}>{meta.label}</Text>
                <Text style={styles.count}>{s.count} item{s.count !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.metricLine}>
                {value.toLocaleString()} {metric}
              </Text>
              {active ? (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipTitle}>{meta.label}</Text>
                  <View style={styles.tooltipStats}>
                    <Text style={styles.tooltipStat}>{s.count} item{s.count !== 1 ? 's' : ''}</Text>
                    <Text style={styles.tooltipDot}>·</Text>
                    <Text style={styles.tooltipStat}>{s.views.toLocaleString()} views</Text>
                    <Text style={styles.tooltipDot}>·</Text>
                    <Text style={styles.tooltipStat}>{s.taps.toLocaleString()} taps</Text>
                    <Text style={styles.tooltipDot}>·</Text>
                    <Text style={styles.tooltipStat}>{s.saves.toLocaleString()} saves</Text>
                    <Text style={styles.tooltipDot}>·</Text>
                    <Text style={styles.tooltipStat}>{s.waves.toLocaleString()} waves</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </Pressable>
        )
      })}
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
  toggleBtnActive: { backgroundColor: COLORS.warmWhite, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 1 },
  toggleText: { fontFamily: FONTS.humanistSemibold, fontSize: 11, color: COLORS.smoke },
  toggleTextActive: { color: COLORS.ink },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.cream,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  iconChip: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: FONTS.humanistBold, fontSize: 13, color: COLORS.ink },
  count: { fontFamily: FONTS.humanist, fontSize: 11, color: COLORS.smoke },
  metricLine: { fontFamily: FONTS.humanistSemibold, fontSize: 11.5, color: COLORS.tangerine, marginTop: 2 },

  tooltip: {
    position: 'absolute',
    top: -2,
    left: 0,
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
