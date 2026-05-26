/**
 * Grouped-by-day expandable card used for Saves, Unsaves, and Waves.
 * Tap the header to expand → reveals the individual notification
 * docs from that day. Mirrors the grouped lists in
 * `src/components/dashboard/ShowingInbox.tsx`.
 *
 * The icon left-of-title is brand-gradient when unread, plain
 * pearl when fully read — same affordance the web uses.
 */
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CaretRight, Envelope, Phone } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { lightTap } from '../../lib/haptics'
import type { NotificationDoc } from '../../lib/inbox'
import { formatGroupDate } from '../../lib/inbox'

interface Props {
  /** YYYY-MM-DD key from groupByDay. */
  dayKey: string
  items: NotificationDoc[]
  /** Singular noun ("save", "wave", etc.). Plural via auto-`s`. */
  noun: string
  /** Icon component shown to the left of the day label. */
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: 'fill' | 'regular' }>
  expanded: boolean
  onToggle: () => void
}

export function NotificationGroup({ dayKey, items, noun, Icon, expanded, onToggle }: Props) {
  const styles = useThemedStyles(_styles)
  const unreadCount = items.filter((n) => !n.read).length
  const hasUnread = unreadCount > 0

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => { lightTap(); onToggle() }}
        style={({ pressed }) => [styles.headerRow, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.iconWrap}>
          {hasUnread ? (
            <LinearGradient
              colors={[...COLORS.brandGradient]}
              locations={[...COLORS.brandGradientLocations]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.pearl }]} />
          )}
          <Icon size={16} color={hasUnread ? COLORS.warmWhite : COLORS.graphite} weight="fill" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>
            {items.length} new {noun}{items.length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.subtitle}>{formatGroupDate(dayKey)}</Text>
        </View>
        <CaretRight
          size={14}
          color={COLORS.ash}
          style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.expand}>
          {items.map((n) => (
            <NotificationLine key={n.id} item={n} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function NotificationLine({ item }: { item: NotificationDoc }) {
  const styles = useThemedStyles(_styles)
  const isWave = item.type === 'wave'
  return (
    <View style={styles.line}>
      <Text style={styles.lineName} numberOfLines={1}>
        {item.actorName || item.title || 'Buyer'}
      </Text>
      {item.pinAddress ? (
        <Text style={styles.lineMeta} numberOfLines={1}>
          about {item.pinAddress.split(',')[0]}
        </Text>
      ) : null}
      {isWave && item.question ? (
        <Text style={styles.lineQuote} numberOfLines={4}>"{item.question}"</Text>
      ) : item.body ? (
        <Text style={styles.lineQuote} numberOfLines={2}>{item.body}</Text>
      ) : null}
      <View style={styles.lineActions}>
        {item.visitorEmail ? (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${item.visitorEmail}`)}
            style={styles.lineAction}
            hitSlop={4}
          >
            <Envelope size={12} color={COLORS.tangerine} weight="regular" />
            <Text style={styles.lineActionText} numberOfLines={1}>{item.visitorEmail}</Text>
          </Pressable>
        ) : null}
        {item.visitorPhone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${item.visitorPhone}`)}
            style={styles.lineAction}
            hitSlop={4}
          >
            <Phone size={12} color={COLORS.tangerine} weight="regular" />
            <Text style={styles.lineActionText}>{item.visitorPhone}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const _styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderLight,
    marginBottom: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  title: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  subtitle: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, marginTop: 1 },

  expand: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  line: { paddingVertical: 10, gap: 2, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  lineName: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.ink },
  lineMeta: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke },
  lineQuote: {
    fontFamily: FONTS.humanist, fontSize: 12.5, color: COLORS.graphite,
    marginTop: 4, lineHeight: 17,
    fontStyle: 'italic',
  },
  lineActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  lineAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lineActionText: { fontFamily: FONTS.humanistMedium, fontSize: 11.5, color: COLORS.tangerine },
})
