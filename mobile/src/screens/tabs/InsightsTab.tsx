import { View, Text, StyleSheet } from 'react-native'
import { ChartBar, Eye, CursorClick, Heart } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { useUserDoc, formatCompact } from '../../lib/useUserDoc'

/**
 * Insights tab — mirrors `src/pages/Dashboard.tsx` insights section
 * (lines ~767-840). Three primary stat cards (Visits / Taps / Saves),
 * then "Saves over time" line chart and "Crossover Insights" tabbed
 * card in subsequent milestones.
 *
 * Stat numbers read live from the user doc — same fields the web
 * dashboard reads (profileVisits, pinTaps, subscriberCount).
 */
export function InsightsTab() {
  const { userDoc, loading } = useUserDoc()

  const visits = userDoc?.profileVisits ?? 0
  const taps = userDoc?.pinTaps ?? 0
  const saves = userDoc?.subscriberCount ?? 0

  return (
    <View>
      {/* TabHeader */}
      <View style={styles.tabHeader}>
        <View style={styles.iconChip}>
          <ChartBar size={20} color={COLORS.warmWhite} weight="regular" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Insights</Text>
          <Text style={styles.tabSubtitle}>How your Reelst is performing</Text>
        </View>
      </View>

      {/* Stat cards — 3-up grid */}
      <View style={styles.statsRow}>
        <StatCard
          label="Visits"
          value={loading ? '…' : formatCompact(visits)}
          Icon={Eye}
          iconColor={COLORS.tangerine}
          iconBg="rgba(255, 107, 61, 0.12)"
          tooltip="Profile visits to your Reelst"
        />
        <StatCard
          label="Taps"
          value={loading ? '…' : formatCompact(taps)}
          Icon={CursorClick}
          iconColor="#3B82F6"
          iconBg="rgba(59, 130, 246, 0.12)"
          tooltip="Pin taps across your profile"
        />
        <StatCard
          label="Saves"
          value={loading ? '…' : formatCompact(saves)}
          Icon={Heart}
          iconColor="#FF3B30"
          iconBg="rgba(255, 59, 48, 0.12)"
          tooltip="Buyers who saved you for updates"
        />
      </View>

      {/* Coming-up placeholders for charts + crossover insights */}
      <View style={styles.note}>
        <Text style={styles.noteTitle}>Saves over time</Text>
        <Text style={styles.noteBody}>Daily subscriber line chart drops in next.</Text>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>Crossover Insights</Text>
        <Text style={styles.noteBody}>
          Buyers who saved you + which agents/neighborhoods overlap. Tabbed card
          (Within profile / Across Reelst) lands later.
        </Text>
      </View>
    </View>
  )
}

interface StatCardProps {
  label: string
  value: string
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: 'fill' | 'regular' }>
  iconColor: string
  iconBg: string
  tooltip: string
}

function StatCard({ label, value, Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} weight="fill" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconChip: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.tangerine,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#D94A1F', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  tabTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  tabSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1, borderColor: COLORS.borderLight,
    borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 12,
    alignItems: 'flex-start',
    gap: 10,
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontFamily: FONTS.humanistBold, fontSize: 24, color: COLORS.ink, letterSpacing: -0.5 },
  statLabel: { fontFamily: FONTS.humanistMedium, fontSize: 12, color: COLORS.smoke, marginTop: -4 },

  note: {
    backgroundColor: 'rgba(217,74,31,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  noteTitle: { fontFamily: FONTS.humanistBold, fontSize: 13, color: COLORS.ink, marginBottom: 4 },
  noteBody: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, lineHeight: 18 },
})
