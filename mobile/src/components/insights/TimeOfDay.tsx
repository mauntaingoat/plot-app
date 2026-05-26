/**
 * 24-hour bar chart of when profile visitors arrive (in their own
 * local TZ — `event.hour` is captured at log time). Peak hour bar
 * is highlighted. Mirrors `TimeOfDay` in
 * `src/components/dashboard/AdvancedInsights.tsx`.
 */
import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Clock } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap } from '../../lib/haptics'
import { getAgentEvents, type AnalyticsEvent } from '../../lib/insights'

const TOOLTIP_AUTODISMISS_MS = 3000
const TOOLTIP_SLOT = 40

const CHART_H = 120

function fmtHour(h: number) {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

export function TimeOfDay({ agentId }: { agentId: string | null }) {
  const styles = useThemedStyles(_styles)
  const [events, setEvents] = useState<AnalyticsEvent[]>([])

  useEffect(() => {
    if (!agentId) return
    let cancelled = false
    getAgentEvents(agentId, 30).then((rows) => { if (!cancelled) setEvents(rows) })
    return () => { cancelled = true }
  }, [agentId])

  const hours = useMemo(() => {
    const counts = Array(24).fill(0)
    for (const e of events) {
      if (e.type !== 'profile_visit') continue
      if (e.hour >= 0 && e.hour < 24) counts[e.hour]++
    }
    return counts
  }, [events])

  const max = Math.max(1, ...hours)
  const peakHour = hours.indexOf(Math.max(...hours))
  const hasData = max > 1

  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  useEffect(() => {
    if (activeIdx === null) return
    const t = setTimeout(() => setActiveIdx(null), TOOLTIP_AUTODISMISS_MS)
    return () => clearTimeout(t)
  }, [activeIdx])

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>When visitors are active</Text>
          <Text style={styles.subtitle}>
            {hasData ? (
              <>Peak hour: <Text style={styles.peak}>{fmtHour(peakHour)}</Text></>
            ) : (
              'No data yet'
            )}
          </Text>
        </View>
        <Clock size={14} color={COLORS.smoke} />
      </View>

      <View style={[styles.barsRow, { height: CHART_H + TOOLTIP_SLOT }]}>
        {hours.map((value, i) => {
          const barH = Math.max(4, (value / max) * CHART_H)
          const isPeak = i === peakHour && hasData
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
                    <Text style={styles.tooltipValue}>{fmtHour(i)}</Text>
                    <Text style={styles.tooltipLabel}>
                      {hours[i]} active visitor{hours[i] === 1 ? '' : 's'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.barOuter, { height: barH }]}>
                {isPeak || active ? (
                  <LinearGradient
                    colors={['#FF6B3D', '#E8522A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 107, 61, 0.3)' }]} />
                )}
              </View>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.axisRow}>
        <Text style={styles.axisText}>12a</Text>
        <Text style={styles.axisText}>6a</Text>
        <Text style={styles.axisText}>12p</Text>
        <Text style={styles.axisText}>6p</Text>
        <Text style={styles.axisText}>12a</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  title: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  subtitle: { fontFamily: FONTS.humanist, fontSize: 11, color: COLORS.smoke, marginTop: 1 },
  peak: { fontFamily: FONTS.humanistBold, color: COLORS.tangerine },

  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barCol: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  tooltipSlot: { height: 40, alignItems: 'center', justifyContent: 'flex-end', minWidth: 90, marginBottom: 4 },
  tooltip: {
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
  },
  tooltipValue: { fontFamily: FONTS.humanistBold, fontSize: 11, color: COLORS.warmWhite },
  tooltipLabel: { fontFamily: FONTS.humanist, fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  barOuter: {
    width: '100%',
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
    overflow: 'hidden',
  },

  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisText: { fontFamily: FONTS.humanistSemibold, fontSize: 9, color: COLORS.ash },
})
