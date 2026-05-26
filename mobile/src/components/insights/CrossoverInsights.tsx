/**
 * CrossoverInsights — tabbed card with two views:
 *   - "Within profile" — pin co-tap rankings (one of your pins → which
 *     other pins did the same visitors tap?)
 *   - "Across Reelst"   — top agents + neighborhoods whose visitors
 *     overlap with yours (Cloud Function-backed)
 *
 * Mirrors `src/components/dashboard/CrossoverInsights.tsx`. The
 * within-profile pin picker is a horizontal scroll strip on iOS
 * (web uses a <select>); easier to thumb-tap on phones.
 */
import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Buildings, MapTrifold, MapPin, UsersThree } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { selection } from '../../lib/haptics'
import { resolveStorageUrl } from '../../lib/firebaseStorageUrl'
import {
  getWithinProfileCrossover,
  getCrossAgentInsights,
  type WithinProfileCrossoverEntry,
  type CrossAgentInsights,
  type CrossAgentEntry,
} from '../../lib/insights'

type Tab = 'within' | 'across'
type Window = 'all' | '30d'

export function CrossoverInsights({ agentId }: { agentId: string | null }) {
  const styles = useThemedStyles(_styles)
  const [tab, setTab] = useState<Tab>('within')
  const [window, setWindow] = useState<Window>('all')

  // Each (tab × window) pair has its own dataset — the user can flip
  // between window pills and we cache per-key so we don't refetch on
  // every tap.
  const [withinCache, setWithinCache] = useState<Record<Window, Record<string, WithinProfileCrossoverEntry> | null>>({ all: null, '30d': null })
  const [acrossCache, setAcrossCache] = useState<Record<Window, CrossAgentInsights | null>>({ all: null, '30d': null })
  const [loadingWithin, setLoadingWithin] = useState(false)
  const [loadingAcross, setLoadingAcross] = useState(false)

  useEffect(() => {
    if (!agentId) return
    if (tab === 'within' && withinCache[window] === null) {
      setLoadingWithin(true)
      getWithinProfileCrossover(agentId, window === '30d' ? 30 : undefined)
        .then((res) => setWithinCache((c) => ({ ...c, [window]: res })))
        .catch(() => setWithinCache((c) => ({ ...c, [window]: {} })))
        .finally(() => setLoadingWithin(false))
    }
    if (tab === 'across' && acrossCache[window] === null) {
      setLoadingAcross(true)
      getCrossAgentInsights(agentId, window)
        .then((res) => setAcrossCache((c) => ({ ...c, [window]: res })))
        .finally(() => setLoadingAcross(false))
    }
  }, [tab, window, agentId, withinCache, acrossCache])

  const subtitle =
    tab === 'within'
      ? 'Pins your visitors tap together'
      : 'Other agents and neighborhoods your visitors explore'

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconChip}>
          <MapTrifold size={14} color="#3B82F6" weight="regular" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Crossover insights</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {/* All time / Last 30d toggle — same per-window cache underneath
            both tabs, so flipping windows refetches once per (tab, window). */}
        <View style={styles.windowWrap}>
          {(
            [
              { id: 'all' as Window,  label: 'All time' },
              { id: '30d' as Window,  label: 'Last 30d' },
            ]
          ).map((w) => {
            const active = window === w.id
            return (
              <Pressable
                key={w.id}
                onPress={() => { if (!active) { selection(); setWindow(w.id) } }}
                style={({ pressed }) => [
                  styles.windowBtn,
                  active && styles.windowBtnActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.windowText, active && styles.windowTextActive]}>{w.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(
          [
            { id: 'within' as Tab,  label: 'Within profile' },
            { id: 'across' as Tab,  label: 'Across Reelst' },
          ]
        ).map((t) => {
          const active = tab === t.id
          return (
            <Pressable
              key={t.id}
              onPress={() => { if (!active) { selection(); setTab(t.id) } }}
              style={({ pressed }) => [
                styles.tab,
                active && styles.tabActive,
                pressed && !active && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {tab === 'within' ? (
        <WithinProfileView entries={withinCache[window]} loading={loadingWithin} />
      ) : (
        <AcrossReelstView insights={acrossCache[window]} loading={loadingAcross} />
      )}
    </View>
  )
}

// ─── Within Profile ──────────────────────────────────────────────
function WithinProfileView({
  entries,
  loading,
}: {
  entries: Record<string, WithinProfileCrossoverEntry> | null
  loading: boolean
}) {
  const styles = useThemedStyles(_styles)
  const ranked = useMemo(() => {
    if (!entries) return []
    return Object.values(entries).sort((a, b) => b.totalVisitors - a.totalVisitors)
  }, [entries])
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedPinId == null && ranked.length > 0) setSelectedPinId(ranked[0].pinId)
  }, [ranked, selectedPinId])

  if (loading) {
    return <View style={styles.loadingWrap}><ActivityIndicator size="small" color={COLORS.tangerine} /></View>
  }
  if (ranked.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Not enough data yet. Co-tap insights appear once visitors start tapping
          multiple pins on your profile.
        </Text>
      </View>
    )
  }
  const selected = ranked.find((e) => e.pinId === selectedPinId) || ranked[0]

  return (
    <View>
      <Text style={styles.eyebrow}>Visitors who tapped…</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinStrip}>
        {ranked.map((e) => {
          const active = e.pinId === selected.pinId
          return (
            <Pressable
              key={e.pinId}
              onPress={() => { selection(); setSelectedPinId(e.pinId) }}
              style={({ pressed }) => [
                styles.pinChip,
                active && styles.pinChipActive,
                pressed && !active && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.pinChipText, active && styles.pinChipTextActive]} numberOfLines={1}>
                {e.address}
              </Text>
              <Text style={[styles.pinChipCount, active && { color: COLORS.warmWhite }]}>
                {e.totalVisitors} visitor{e.totalVisitors === 1 ? '' : 's'}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <Text style={[styles.eyebrow, { marginTop: 10 }]}>…also tapped</Text>

      {selected.coTaps.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No co-tap activity on this pin yet.</Text>
        </View>
      ) : (
        selected.coTaps.map((c) => (
          <View key={c.pinId} style={styles.rowCard}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{c.address}</Text>
              <Text style={styles.rowSub}>{c.sharedVisitors} shared</Text>
            </View>
            <View style={styles.percentBlock}>
              <Text style={styles.percentText}>{c.overlapPct}%</Text>
            </View>
          </View>
        ))
      )}
    </View>
  )
}

// ─── Across Reelst ───────────────────────────────────────────────
function AcrossReelstView({ insights, loading }: { insights: CrossAgentInsights | null; loading: boolean }) {
  const styles = useThemedStyles(_styles)
  if (loading) {
    return <View style={styles.loadingWrap}><ActivityIndicator size="small" color={COLORS.tangerine} /></View>
  }
  if (!insights || (insights.topAgents.length === 0 && insights.topNeighborhoods.length === 0)) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Not enough data yet. Cross-Reelst insights appear once your visitors engage
          with other agents on Reelst.
        </Text>
      </View>
    )
  }
  return (
    <View>
      {insights.topAgents.length > 0 ? (
        <>
          <View style={styles.sectionHead}>
            <UsersThree size={14} color={COLORS.graphite} weight="regular" />
            <Text style={styles.sectionTitle}>Other agents your visitors check out</Text>
          </View>
          {insights.topAgents.map((a) => (
            <AgentRow key={a.agentId} agent={a} />
          ))}
        </>
      ) : null}
      {insights.topNeighborhoods.length > 0 ? (
        <>
          <View style={[styles.sectionHead, { marginTop: 12 }]}>
            <MapPin size={14} color={COLORS.graphite} weight="regular" />
            <Text style={styles.sectionTitle}>Neighborhoods they explore elsewhere</Text>
          </View>
          {insights.topNeighborhoods.map((n) => (
            <View key={n.name} style={styles.rowCard}>
              <View style={[styles.avatar, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Buildings size={16} color="#3B82F6" weight="regular" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{n.name}</Text>
                <Text style={styles.rowSub}>{n.sharedVisitors} shared</Text>
              </View>
              <View style={styles.percentBlock}>
                <Text style={styles.percentText}>{n.overlapPct}%</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </View>
  )
}

/** Single agent row in the Across Reelst list. Pulls the avatar
 *  through resolveStorageUrl so direct-GCS profile photos go via
 *  Firebase's tokenized download URL — iOS networking is unreliable
 *  on plain storage.googleapis.com hosts and was leaving us with a
 *  blank gray circle whenever the underlying photo lived there. */
function AgentRow({ agent }: { agent: CrossAgentEntry }) {
  const styles = useThemedStyles(_styles)
  const [resolved, setResolved] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setResolved(null)
    setFailed(false)
    if (agent.photoURL) {
      resolveStorageUrl(agent.photoURL).then((url) => {
        if (!cancelled) setResolved(url ?? agent.photoURL ?? null)
      })
    }
    return () => { cancelled = true }
  }, [agent.photoURL])

  const showImage = !!resolved && !failed
  const initial = (agent.displayName || agent.username || 'A').slice(0, 1).toUpperCase()
  return (
    <View style={styles.rowCard}>
      <View style={styles.avatar}>
        {showImage ? (
          <Image
            source={{ uri: resolved! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={120}
            onError={() => setFailed(true)}
          />
        ) : (
          <Text style={styles.avatarInitial}>{initial}</Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{agent.displayName || agent.username || 'Agent'}</Text>
        {agent.username ? <Text style={styles.rowSub}>@{agent.username}</Text> : null}
      </View>
      <View style={styles.percentBlock}>
        <Text style={styles.percentText}>{agent.overlapPct}%</Text>
        <Text style={styles.rowSub}>{agent.sharedVisitors} shared</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconChip: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  subtitle: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, marginTop: 1 },

  windowWrap: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 999,
    backgroundColor: COLORS.cream,
  },
  windowBtn: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  windowBtnActive: {
    backgroundColor: COLORS.warmWhite,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 1,
  },
  windowText: { fontFamily: FONTS.humanistSemibold, fontSize: 10, color: COLORS.smoke },
  windowTextActive: { color: COLORS.ink },

  tabRow: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 10,
    backgroundColor: COLORS.cream,
    marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.warmWhite, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 2 },
  tabText: { fontFamily: FONTS.humanistMedium, fontSize: 12, color: COLORS.smoke },
  tabTextActive: { color: COLORS.ink, fontFamily: FONTS.humanistSemibold },

  loadingWrap: { height: 100, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 14, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.humanist, fontSize: 12.5, color: COLORS.smoke, textAlign: 'center', lineHeight: 17 },

  eyebrow: {
    fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke,
    marginBottom: 8,
  },
  pinStrip: { gap: 6, paddingBottom: 0 },
  pinChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: COLORS.cream,
    maxWidth: 220,
  },
  pinChipActive: { backgroundColor: COLORS.ink },
  pinChipText: { fontFamily: FONTS.humanistSemibold, fontSize: 12, color: COLORS.ink },
  pinChipTextActive: { color: COLORS.warmWhite },
  pinChipCount: { fontFamily: FONTS.humanist, fontSize: 10, color: COLORS.smoke, marginTop: 1 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  sectionTitle: { fontFamily: FONTS.humanistSemibold, fontSize: 12.5, color: COLORS.ink },

  rowCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    marginBottom: 6,
  },
  rowTitle: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.ink },
  rowSub: { fontFamily: FONTS.humanist, fontSize: 11, color: COLORS.smoke, marginTop: 1 },

  percentBlock: { alignItems: 'flex-end' },
  percentText: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.tangerine },

  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.pearl,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.graphite },
})
