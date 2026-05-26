/**
 * SaveGrowthChart — 30-day daily subscriber count line chart.
 * Hand-rolled with react-native-svg so the bundle stays light
 * (no chart lib). Filled gradient under the stroke; entrance
 * animation skipped for v1 to keep it dependency-free.
 *
 * Mirrors the web `SaveGrowth` block in `AdvancedInsights.tsx`.
 */
import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Path, Line, Circle } from 'react-native-svg'
import { Heart } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap } from '../../lib/haptics'
import { getSubscriberSnapshots, type SubscriberSnapshot } from '../../lib/insights'

const TOOLTIP_AUTODISMISS_MS = 3500

interface Props {
  agentId: string | null
  /** Live count from the user doc — appended as today's data point if
   *  it diverges from the latest stored snapshot. */
  currentCount: number
}

export function SaveGrowthChart({ agentId, currentCount }: Props) {
  const styles = useThemedStyles(_styles)
  const [snapshots, setSnapshots] = useState<SubscriberSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!agentId) return
    let cancelled = false
    setLoading(true)
    getSubscriberSnapshots(agentId, 30).then((rows) => {
      if (!cancelled) {
        setSnapshots(rows)
        setLoading(false)
      }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [agentId])

  // Always seed with the current live count so the rightmost point
  // reflects "today" even before the daily cron runs. If snapshots
  // exist they fill in the prior 30 days; if not, show a flat-zero
  // baseline rising to today — not a fake "had currentCount 30
  // days ago" line. Mirrors `SaveGrowth` in AdvancedInsights.tsx.
  const series: number[] = (() => {
    if (snapshots.length === 0) {
      const arr = new Array(7).fill(0)
      arr[arr.length - 1] = currentCount
      return arr
    }
    const points = snapshots.map((s) => s.count)
    const last = points[points.length - 1]
    if (last !== currentCount) points.push(currentCount)
    return points
  })()

  const growth = currentCount - series[0]
  const growthPct = series[0] > 0 ? Math.round((growth / series[0]) * 100) : 0

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconChip}>
          <Heart size={14} color={COLORS.tangerine} weight="regular" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Saves over time</Text>
          <Text style={styles.subtitle}>
            {growth >= 0 ? `+${growth}` : growth} {series[0] > 0 ? `(${growthPct >= 0 ? '+' : ''}${growthPct}%)` : ''} · last 30 days
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.tangerine} />
        </View>
      ) : currentCount === 0 && snapshots.length === 0 ? (
        <EmptyChart />
      ) : (
        <ChartBody series={series} />
      )}

      <View style={styles.axisRow}>
        <Text style={styles.axisText}>30 days ago</Text>
        <Text style={styles.axisText}>Today</Text>
      </View>
    </View>
  )
}

function ChartBody({ series }: { series: number[] }) {
  const styles = useThemedStyles(_styles)
  const W = 100
  const H = 100
  // Min-anchored y mapping (matches web). Prevents a flat or
  // slightly-falling line from looking like a giant spike — the
  // baseline becomes the smallest count, not zero.
  const max = Math.max(...series, 1)
  const min = Math.min(...series, 0)
  const range = max - min || 1
  const yFor = (v: number) => H - ((v - min) / range) * H

  const isFlat = series.length === 1
  const xys = series.map((v, i) => ({
    x: series.length > 1 ? (i / (series.length - 1)) * W : W / 2,
    y: yFor(v),
  }))

  const linePath = isFlat
    ? `M 0 ${yFor(series[0]).toFixed(2)} L ${W} ${yFor(series[0]).toFixed(2)}`
    : xys.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`

  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  useEffect(() => {
    if (activeIdx === null) return
    const t = setTimeout(() => setActiveIdx(null), TOOLTIP_AUTODISMISS_MS)
    return () => clearTimeout(t)
  }, [activeIdx])

  const activePt = activeIdx !== null ? xys[activeIdx] : null
  const daysAgo = activeIdx !== null && series.length > 1
    ? Math.round((1 - activeIdx / (series.length - 1)) * 30)
    : 0

  return (
    <View style={styles.chartWrap}>
      <Svg width="100%" height={120} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="saveGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.tangerine} stopOpacity={0.32} />
            <Stop offset="1" stopColor={COLORS.tangerine} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#saveGrowthFill)" />
        <Path
          d={linePath}
          stroke={COLORS.tangerine}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {activePt && !isFlat ? (
          <>
            <Line
              x1={activePt.x} y1={0} x2={activePt.x} y2={H}
              stroke={COLORS.ink}
              strokeWidth={0.4}
              strokeDasharray="1,1"
            />
            <Circle cx={activePt.x} cy={activePt.y} r={1.6} fill={COLORS.tangerine} stroke="#fff" strokeWidth={0.5} />
          </>
        ) : null}
      </Svg>
      {/* Tap zones — one per data point, evenly split across the
          chart width. We can't put Pressables inside the SVG
          (react-native-svg children can't receive touches reliably),
          so we overlay an absolutely-positioned row above the SVG. */}
      <View style={styles.tapOverlay} pointerEvents="box-none">
        {series.map((v, i) => (
          <Pressable
            key={i}
            onPress={() => { lightTap(); setActiveIdx(activeIdx === i ? null : i) }}
            style={styles.tapZone}
          />
        ))}
      </View>
      {/* Floating tooltip, positioned over the active point. */}
      {activeIdx !== null ? (
        <View style={[styles.tooltipWrap, { left: `${(activeIdx / Math.max(1, series.length - 1)) * 100}%` }]} pointerEvents="none">
          <View style={styles.tooltip}>
            <Text style={styles.tooltipValue}>{series[activeIdx].toLocaleString()} save{series[activeIdx] === 1 ? '' : 's'}</Text>
            <Text style={styles.tooltipLabel}>
              {daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function EmptyChart() {
  const styles = useThemedStyles(_styles)
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>
        Growth tracking begins once buyers start saving you.
      </Text>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconChip: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  subtitle: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.soldGreen, marginTop: 1 },
  chartWrap: { height: 120, marginVertical: 4, position: 'relative' },
  tapOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
  },
  tapZone: { flex: 1, height: '100%' },
  tooltipWrap: {
    position: 'absolute', top: -4,
    alignItems: 'center',
    // Center the chip horizontally on the active point by offsetting
    // half its width via marginLeft (chip is fixed-width). Without
    // this the chip would sit with its LEFT edge on the point.
    marginLeft: -60,
    width: 120,
  },
  tooltip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
  },
  tooltipValue: { fontFamily: FONTS.humanistBold, fontSize: 11, color: COLORS.warmWhite },
  tooltipLabel: { fontFamily: FONTS.humanist, fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  loadingWrap: { height: 120, alignItems: 'center', justifyContent: 'center' },
  empty: { height: 120, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  emptyText: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, textAlign: 'center' },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisText: { fontFamily: FONTS.humanistMedium, fontSize: 10, color: COLORS.ash, textTransform: 'uppercase', letterSpacing: 0.5 },
})
