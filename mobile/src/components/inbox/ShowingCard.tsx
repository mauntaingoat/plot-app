/**
 * Single showing request row. Visitor info + listing address +
 * preferred date/time + note + status pill + per-status actions
 * (Mark read / Mark scheduled / Close). Mirrors RequestCard from
 * `src/components/dashboard/ShowingInbox.tsx`.
 */
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native'
import { Calendar, Envelope, Phone, Check } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap } from '../../lib/haptics'
import type { ShowingRequest, ShowingRequestStatus } from '../../lib/inbox'

const STATUS_PILL: Record<ShowingRequestStatus, { bg: string; fg: string; label: string }> = {
  new:       { bg: COLORS.tangerine,  fg: COLORS.warmWhite, label: 'New' },
  read:      { bg: COLORS.pearl,      fg: COLORS.graphite,  label: 'Read' },
  scheduled: { bg: COLORS.soldGreen,  fg: COLORS.warmWhite, label: 'Scheduled' },
  closed:    { bg: COLORS.smoke,      fg: COLORS.warmWhite, label: 'Closed' },
}

function formatTime12h(t: string): string {
  if (!/^\d{1,2}:\d{2}$/.test(t)) return t
  const [hStr, m] = t.split(':')
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function formatDateShort(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  return new Date(`${d}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export function ShowingCard({
  request,
  onSetStatus,
}: {
  request: ShowingRequest
  onSetStatus: (next: ShowingRequestStatus) => void
}) {
  const styles = useThemedStyles(_styles)
  const status = request.status || 'new'
  const pill = STATUS_PILL[status]
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>{request.visitorName || 'Visitor'}</Text>
          <Text style={styles.address} numberOfLines={1}>
            {request.pinAddress || 'Listing'}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Calendar size={13} color={COLORS.smoke} weight="regular" />
          <Text style={styles.metaText}>
            {formatDateShort(request.preferredDate)} · {formatTime12h(request.preferredTime)}
          </Text>
        </View>
        {request.visitorEmail ? (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${request.visitorEmail}`)}
            style={styles.metaRow}
            hitSlop={4}
          >
            <Envelope size={13} color={COLORS.smoke} weight="regular" />
            <Text style={[styles.metaText, styles.metaLink]} numberOfLines={1}>
              {request.visitorEmail}
            </Text>
          </Pressable>
        ) : null}
        {request.visitorPhone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${request.visitorPhone}`)}
            style={styles.metaRow}
            hitSlop={4}
          >
            <Phone size={13} color={COLORS.smoke} weight="regular" />
            <Text style={[styles.metaText, styles.metaLink]}>{request.visitorPhone}</Text>
          </Pressable>
        ) : null}
      </View>

      {request.note ? (
        <Text style={styles.note} numberOfLines={3}>"{request.note}"</Text>
      ) : null}

      <View style={styles.actions}>
        {status === 'new' ? (
          <ActionButton label="Mark read" onPress={() => onSetStatus('read')} />
        ) : null}
        {status !== 'scheduled' ? (
          <ActionButton
            label="Mark scheduled"
            icon={<Check size={12} color={COLORS.soldGreen} weight="bold" />}
            onPress={() => onSetStatus('scheduled')}
          />
        ) : null}
        <View style={{ flex: 1 }} />
        {status !== 'closed' ? (
          <ActionButton label="Close" onPress={() => onSetStatus('closed')} dim />
        ) : null}
      </View>
    </View>
  )
}

function ActionButton({
  label,
  icon,
  onPress,
  dim,
}: {
  label: string
  icon?: React.ReactNode
  onPress: () => void
  dim?: boolean
}) {
  const styles = useThemedStyles(_styles)
  return (
    <Pressable
      onPress={() => { lightTap(); onPress() }}
      style={({ pressed }) => [styles.btn, dim && styles.btnDim, pressed && { opacity: 0.85 }]}
    >
      {icon}
      <Text style={[styles.btnText, dim && styles.btnTextDim]}>{label}</Text>
    </Pressable>
  )
}

const _styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderLight,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.ink },
  address: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontFamily: FONTS.humanistBold, fontSize: 10, letterSpacing: 0.3 },
  meta: { marginTop: 10, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: FONTS.humanist, fontSize: 12.5, color: COLORS.smoke },
  metaLink: { color: COLORS.tangerine, textDecorationLine: 'underline' },
  note: {
    marginTop: 10, padding: 10,
    backgroundColor: COLORS.cream, borderRadius: 10,
    fontFamily: FONTS.humanist, fontSize: 12.5, color: COLORS.graphite, lineHeight: 17,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.cream,
  },
  btnDim: { backgroundColor: 'transparent' },
  btnText: { fontFamily: FONTS.humanistSemibold, fontSize: 12, color: COLORS.ink },
  btnTextDim: { color: COLORS.smoke },
})
