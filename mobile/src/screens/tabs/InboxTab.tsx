import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { Tray, Heart, HandWaving, Calendar } from 'phosphor-react-native'
import { BrandIconChip } from '../../components/BrandIconChip'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { selection } from '../../lib/haptics'
import { useUserDoc } from '../../lib/useUserDoc'
import {
  subscribeShowingRequests,
  subscribeNotifications,
  updateShowingRequestStatus,
  groupByDay,
  type ShowingRequest,
  type NotificationDoc,
  type ShowingRequestStatus,
} from '../../lib/inbox'
import { ShowingCard } from '../../components/inbox/ShowingCard'
import { NotificationGroup } from '../../components/inbox/NotificationGroup'

/**
 * Inbox tab — mobile port of `src/components/dashboard/ShowingInbox.tsx`.
 *
 * Live Firestore subs:
 *   - `showing_requests where agentId == uid` — buyer-requested
 *     showings; per-status actions write back directly.
 *   - `notifications where agentId == uid` — subscriber capture,
 *     unsubscriber, and wave (buyer question) events emitted by
 *     server triggers.
 *
 * Filter pills: All / Saves / Waves / Showings  (no Questions — web
 * doesn't ship it either; that filter only existed in the iOS
 * placeholder by mistake.)
 */

type InboxFilter = 'all' | 'saves' | 'waves' | 'showings'

const FILTERS: { id: InboxFilter; label: string; Icon: React.ComponentType<{ size?: number; color?: string; weight?: 'fill' | 'regular' }> }[] = [
  { id: 'all',      label: 'All',      Icon: Tray },
  { id: 'saves',    label: 'Subscribers', Icon: Heart },
  { id: 'waves',    label: 'Waves',    Icon: HandWaving },
  { id: 'showings', label: 'Showings', Icon: Calendar },
]

export function InboxTab() {
  const styles = useThemedStyles(_styles)
  const { userDoc } = useUserDoc()
  const agentId = userDoc?.uid ?? null

  const [filter, setFilter] = useState<InboxFilter>('all')
  const [requests, setRequests] = useState<ShowingRequest[]>([])
  const [notifications, setNotifications] = useState<NotificationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  useEffect(() => {
    if (!agentId) return
    setLoading(true)
    const unsubShow = subscribeShowingRequests(agentId, (rows) => {
      setRequests(rows)
      setLoading(false)
    })
    const unsubNotif = subscribeNotifications(agentId, setNotifications)
    return () => { unsubShow?.(); unsubNotif?.() }
  }, [agentId])

  // ── Notification partitioning (matches web; legacy `follow` / `save` /
  //    `showing_request` types are no longer surfaced). ──
  const saves = useMemo(() => notifications.filter((n) => n.type === 'subscriber'), [notifications])
  const unsaves = useMemo(() => notifications.filter((n) => n.type === 'unsubscriber'), [notifications])
  const waves = useMemo(() => notifications.filter((n) => n.type === 'wave'), [notifications])
  const gifts = useMemo(() => notifications.filter((n) => n.type === 'gift'), [notifications])

  const savesByDay = useMemo(() => groupByDay(saves), [saves])
  const unsavesByDay = useMemo(() => groupByDay(unsaves), [unsaves])
  const wavesByDay = useMemo(() => groupByDay(waves), [waves])

  // Unread counts (used for pill badges)
  const counts = useMemo(() => ({
    showings: requests.filter((r) => r.status === 'new').length,
    saves: saves.filter((n) => !n.read).length + unsaves.filter((n) => !n.read).length,
    waves: waves.filter((n) => !n.read).length,
  }), [requests, saves, unsaves, waves])
  const totalUnread = counts.showings + counts.saves + counts.waves

  // Optimistic status update — flips local state immediately, then
  // writes; if the write fails the live sub will reconcile on next
  // snapshot.
  const setStatus = (id: string, next: ShowingRequestStatus) => {
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status: next } : r)))
    updateShowingRequestStatus(id, next).catch((e) => {
      // eslint-disable-next-line no-console
      console.warn('[InboxTab] status write failed', e)
    })
  }

  const showShowings  = filter === 'all' || filter === 'showings'
  const showSaves     = filter === 'all' || filter === 'saves'
  const showWaves     = filter === 'all' || filter === 'waves'
  const showGifts     = filter === 'all'

  const isEmpty = !loading && requests.length === 0 && saves.length === 0 && unsaves.length === 0 && waves.length === 0 && gifts.length === 0

  return (
    <View>
      {/* TabHeader */}
      <View style={styles.tabHeader}>
        <BrandIconChip>
          <Tray size={20} color={COLORS.warmWhite} weight="regular" />
        </BrandIconChip>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Inbox</Text>
          <Text style={styles.tabSubtitle}>Waves, showings, and questions from buyers</Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = filter === f.id
          const badgeCount = f.id === 'all' ? totalUnread : (counts as Record<string, number>)[f.id] ?? 0
          return (
            <Pressable
              key={f.id}
              onPress={() => { if (!isActive) { selection(); setFilter(f.id) } }}
              style={({ pressed }) => [
                styles.pill,
                isActive ? styles.pillActive : styles.pillInactive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <f.Icon size={12} color={isActive ? COLORS.warmWhite : COLORS.smoke} weight={isActive ? 'fill' : 'regular'} />
              <Text style={[styles.pillText, { color: isActive ? COLORS.warmWhite : COLORS.smoke }]}>
                {f.label}
              </Text>
              {badgeCount > 0 ? (
                <View style={[styles.badge, isActive && styles.badgeOnActive]}>
                  <Text style={[styles.badgeText, isActive && { color: COLORS.tangerine }]}>{badgeCount}</Text>
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </View>

      {/* List */}
      {isEmpty ? (
        <EmptyState />
      ) : loading ? (
        <View>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {showShowings && requests.length > 0 ? (
            <>
              {filter === 'all' ? <SectionLabel>Showing requests</SectionLabel> : null}
              {requests.map((r) => (
                <ShowingCard key={r.id} request={r} onSetStatus={(next) => setStatus(r.id, next)} />
              ))}
            </>
          ) : null}

          {showSaves && (savesByDay.length > 0 || unsavesByDay.length > 0) ? (
            <>
              {filter === 'all' ? <SectionLabel>Subscribers</SectionLabel> : null}
              {savesByDay.map(([day, items]) => {
                const key = `save-${day}`
                return (
                  <NotificationGroup
                    key={key}
                    dayKey={day}
                    items={items}
                    noun="save"
                    Icon={Heart}
                    expanded={expandedGroup === key}
                    onToggle={() => setExpandedGroup((c) => (c === key ? null : key))}
                  />
                )
              })}
              {unsavesByDay.map(([day, items]) => {
                const key = `unsave-${day}`
                return (
                  <NotificationGroup
                    key={key}
                    dayKey={day}
                    items={items}
                    noun="unsave"
                    Icon={Heart}
                    expanded={expandedGroup === key}
                    onToggle={() => setExpandedGroup((c) => (c === key ? null : key))}
                  />
                )
              })}
            </>
          ) : null}

          {showWaves && wavesByDay.length > 0 ? (
            <>
              {filter === 'all' ? <SectionLabel>Waves</SectionLabel> : null}
              {wavesByDay.map(([day, items]) => {
                const key = `wave-${day}`
                return (
                  <NotificationGroup
                    key={key}
                    dayKey={day}
                    items={items}
                    noun="wave"
                    Icon={HandWaving}
                    expanded={expandedGroup === key}
                    onToggle={() => setExpandedGroup((c) => (c === key ? null : key))}
                  />
                )
              })}
            </>
          ) : null}

          {showGifts && gifts.length > 0 ? (
            <>
              <SectionLabel>Gifts</SectionLabel>
              {gifts.map((g) => (
                <View key={g.id} style={styles.giftCard}>
                  <Text style={styles.giftTitle}>{g.title}</Text>
                  {g.body ? <Text style={styles.giftBody}>{g.body}</Text> : null}
                </View>
              ))}
            </>
          ) : null}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(_styles)
  return <Text style={styles.sectionLabel}>{children}</Text>
}

function EmptyState() {
  const styles = useThemedStyles(_styles)
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Tray size={28} color={COLORS.tangerine} weight="fill" />
      </View>
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptyBody}>
        Showing requests, new subscribers, and waves will appear here.
      </Text>
    </View>
  )
}

function SkeletonCard() {
  const styles = useThemedStyles(_styles)
  return <View style={styles.skeleton} />
}

const _styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  tabTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  tabSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 2 },

  filterRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 30, paddingHorizontal: 12, borderRadius: 999,
  },
  pillActive: { backgroundColor: COLORS.ink },
  pillInactive: { backgroundColor: COLORS.cream },
  pillText: { fontFamily: FONTS.humanistBold, fontSize: 12 },
  badge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.tangerine,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeOnActive: { backgroundColor: COLORS.warmWhite },
  badgeText: { fontFamily: FONTS.humanistBold, fontSize: 10, color: COLORS.warmWhite },

  sectionLabel: {
    fontFamily: FONTS.humanistSemibold, fontSize: 11.5, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 8, marginBottom: 8,
  },

  skeleton: {
    height: 100, borderRadius: 16,
    backgroundColor: COLORS.cream, marginBottom: 10,
  },
  giftCard: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderLight,
    padding: 14,
    marginBottom: 10,
  },
  giftTitle: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  giftBody: { fontFamily: FONTS.humanist, fontSize: 12.5, color: COLORS.smoke, marginTop: 4, lineHeight: 17 },

  empty: { backgroundColor: COLORS.cream, borderRadius: 20, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: FONTS.humanistBold, fontSize: 18, color: COLORS.ink, marginBottom: 4 },
  emptyBody: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, lineHeight: 20, textAlign: 'center' },
})
