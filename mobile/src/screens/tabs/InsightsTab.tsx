import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native'
import { lightTap } from '../../lib/haptics'
import { ChartBar, Eye, CursorClick, Heart, HandWaving } from 'phosphor-react-native'
import { BrandIconChip } from '../../components/BrandIconChip'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { useUserDoc, formatCompact } from '../../lib/useUserDoc'
import { usePins } from '../../lib/usePins'
import { getAgentEvents, subscribeWaveCount, subscribeActiveSubscriberCount, type AnalyticsEvent } from '../../lib/insights'
import { SaveGrowthChart } from '../../components/insights/SaveGrowthChart'
import { CrossoverInsights } from '../../components/insights/CrossoverInsights'
import { InsightsChart } from '../../components/insights/InsightsChart'
import { PinBreakdown } from '../../components/insights/PinBreakdown'
import { ContentConversion } from '../../components/insights/ContentConversion'
import { TimeOfDay } from '../../components/insights/TimeOfDay'
import { ProPaywall } from '../../components/insights/ProPaywall'

/**
 * Insights tab — port of `src/pages/Dashboard.tsx` insights block
 * (lines ~767-827). All-tier surfaces are visible to everyone; the
 * Pro-gated block (PinBreakdown / ContentConversion / SaveGrowth /
 * TimeOfDay / CrossoverInsights) sits behind a paywall overlay on
 * Free tier — same dimmed presentation the web ships.
 */
export function InsightsTab() {
  const styles = useThemedStyles(_styles)
  const { userDoc, loading } = useUserDoc()
  const { pins } = usePins()
  const agentId = userDoc?.uid ?? null
  const isPro = userDoc?.tier === 'pro'

  // ── Wave count (live) ──
  const [waveCount, setWaveCount] = useState(0)
  useEffect(() => {
    if (!agentId) return
    return subscribeWaveCount(agentId, setWaveCount)
  }, [agentId])

  // ── Active subscriber count (live) ──
  // Source of truth for "Saves" — the userDoc.subscriberCount field
  // can lag behind reality (it's updated by a Cloud Function trigger
  // and we've seen drifts). Reading the digestSubscriptions collection
  // directly keeps the Saves stat + SaveGrowth chart's right-edge
  // point in sync.
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null)
  useEffect(() => {
    if (!agentId) return
    return subscribeActiveSubscriberCount(agentId, setSubscriberCount)
  }, [agentId])

  // ── Events for the 7-day chart ──
  const [chartMetric, setChartMetric] = useState<'profile_visit' | 'tap'>('profile_visit')
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  useEffect(() => {
    if (!agentId) return
    let cancelled = false
    getAgentEvents(agentId, 30).then((rows) => { if (!cancelled) setEvents(rows) }).catch(() => {})
    return () => { cancelled = true }
  }, [agentId])

  const chartData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const result: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const value = events.filter((e) => e.type === chartMetric && e.date === dateStr).length
      result.push({ label: dayNames[d.getDay()], value })
    }
    return result
  }, [events, chartMetric])

  const stats = useMemo(() => {
    let taps = 0
    pins.forEach((p) => { taps += p.taps || 0 })
    return { taps }
  }, [pins])

  const visits = userDoc?.profileVisits ?? 0
  // Prefer the live count when we have it; fall back to the userDoc
  // field only while the first subscribe snapshot is pending.
  const saves = subscriberCount ?? userDoc?.subscriberCount ?? 0

  const onUpgrade = () =>
    Alert.alert('Go Pro', 'Pro upgrade flow lands in the next milestone.')

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* TabHeader */}
      <View style={styles.tabHeader}>
        <BrandIconChip>
          <ChartBar size={20} color={COLORS.warmWhite} weight="regular" />
        </BrandIconChip>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Insights</Text>
          <Text style={styles.tabSubtitle}>How your Reelst is performing</Text>
        </View>
      </View>

      {/* 4-card stat grid — web uses grid-cols-2 on mobile */}
      <View style={styles.statsGrid}>
        <StatCard label="Visits" value={loading ? '…' : formatCompact(visits)}        Icon={Eye}         iconColor={COLORS.tangerine} iconBg="rgba(255, 107, 61, 0.12)"  tooltip="Count of profile visits to your Reelst" />
        <StatCard label="Taps"   value={loading ? '…' : formatCompact(stats.taps)}    Icon={CursorClick} iconColor="#3B82F6"          iconBg="rgba(59, 130, 246, 0.12)"  tooltip="Times someone tapped a map pin or content card to open it" />
        <StatCard label="Subscribers"  value={loading ? '…' : formatCompact(saves)}         Icon={Heart}       iconColor="#FF6B6B"          iconBg="rgba(255, 107, 107, 0.12)" tooltip="People subscribed to your weekly updates" />
        <StatCard label="Waves"  value={loading ? '…' : formatCompact(waveCount)}     Icon={HandWaving}  iconColor="#FF8552"          iconBg="rgba(255, 133, 82, 0.12)"  tooltip="People who waved with a question on a listing" />
      </View>

      {/* 7-day chart — free for everyone */}
      <InsightsChart
        data={chartData}
        title={chartMetric === 'profile_visit' ? 'Profile Visits' : 'Taps'}
        subtitle="Last 7 days"
        metricToggle={{
          value: chartMetric,
          onChange: (v) => setChartMetric(v as 'profile_visit' | 'tap'),
          options: [
            { id: 'profile_visit', label: 'Profile Visits' },
            { id: 'tap', label: 'Taps' },
          ],
        }}
      />

      {/* Pro-gated advanced section */}
      {isPro ? (
        <>
          <PinBreakdown pins={pins} />
          <ContentConversion pins={pins} />
          <SaveGrowthChart agentId={agentId} currentCount={saves} />
          <TimeOfDay agentId={agentId} />
          <CrossoverInsights agentId={agentId} />
        </>
      ) : (
        <View style={styles.paywallStack}>
          {/* Dimmed preview stack so the Free user sees what they'd unlock. */}
          <View pointerEvents="none" style={styles.dimmed}>
            <PinBreakdown pins={pins} />
            <ContentConversion pins={pins} />
            <InsightsChart
              data={[
                { label: 'Mon', value: 12 }, { label: 'Tue', value: 18 }, { label: 'Wed', value: 8 },
                { label: 'Thu', value: 25 }, { label: 'Fri', value: 15 }, { label: 'Sat', value: 20 },
                { label: 'Sun', value: 10 },
              ]}
              title="Saves over time"
              subtitle="Last 30 days"
            />
          </View>
          <View style={styles.paywallOverlay}>
            <ProPaywall onUpgrade={onUpgrade} />
          </View>
        </View>
      )}
    </ScrollView>
  )
}

interface StatCardProps {
  label: string
  value: string
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: 'fill' | 'regular' }>
  iconColor: string
  iconBg: string
  tooltip?: string
}

function StatCard({ label, value, Icon, iconColor, iconBg, tooltip }: StatCardProps) {
  const styles = useThemedStyles(_styles)
  const [showTip, setShowTip] = useState(false)
  useEffect(() => {
    if (!showTip) return
    const t = setTimeout(() => setShowTip(false), 3000)
    return () => clearTimeout(t)
  }, [showTip])

  return (
    <View style={styles.statCol}>
      <View style={styles.statCard}>
        <Pressable
          onPress={() => { if (tooltip) { lightTap(); setShowTip((v) => !v) } }}
          style={[styles.statIcon, { backgroundColor: iconBg }]}
          hitSlop={6}
        >
          <Icon size={18} color={iconColor} weight="regular" />
        </Pressable>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {showTip && tooltip ? (
          <View style={styles.statTooltip} pointerEvents="none">
            <Text style={styles.statTooltipText}>{tooltip}</Text>
            <View style={styles.statTooltipTail} />
          </View>
        ) : null}
      </View>
    </View>
  )
}

const _styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  tabTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  tabSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 2 },

  // 2×2 stat grid (web uses grid-cols-2 on mobile too)
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginBottom: 16 },
  statCol: { width: '50%', paddingHorizontal: 5, marginBottom: 10 },
  statCard: {
    position: 'relative',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1, borderColor: COLORS.borderLight,
    borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 14,
    gap: 10,
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: FONTS.humanistBold, fontSize: 24, color: COLORS.ink, letterSpacing: -0.5 },
  statLabel: { fontFamily: FONTS.humanistMedium, fontSize: 12, color: COLORS.smoke, marginTop: -4 },

  // Tap-to-show tooltip anchored just below the stat icon.
  statTooltip: {
    position: 'absolute',
    top: 52, left: 12,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.ink,
    maxWidth: 200,
    zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
  },
  statTooltipText: { fontFamily: FONTS.humanistMedium, fontSize: 11, color: COLORS.warmWhite, lineHeight: 15 },
  statTooltipTail: {
    position: 'absolute', top: -4, left: 12,
    width: 0, height: 0,
    borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 4,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: COLORS.ink,
  },

  // Pro paywall stack — dimmed preview underneath, overlay centered.
  paywallStack: { position: 'relative' },
  dimmed: { opacity: 0.35 },
  paywallOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
})
