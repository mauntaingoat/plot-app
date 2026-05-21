import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MapPin, FilmStrip, Palette, Tray, ChartBar } from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { selection } from '../lib/haptics'

/**
 * Native port of the web `<TabBar />` component from
 * `src/components/ui/TabBar.tsx`. 5 dashboard tabs (My Pins, Content,
 * Style, Inbox, Insights), tangerine active state with a 3px indicator
 * bar, frosted ivory background, safe-area inset awareness.
 *
 * iOS flair: selection haptic on tab switch.
 */

export type DashTab = 'reelst' | 'content' | 'style' | 'inbox' | 'insights'

interface Props {
  active: DashTab
  onChange: (id: DashTab) => void
  inboxUnread?: number
}

interface TabDef {
  id: DashTab
  label: string
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: 'regular' | 'fill' }>
}

const TABS: TabDef[] = [
  { id: 'reelst',  label: 'My Pins',  Icon: MapPin },
  { id: 'content', label: 'Content',  Icon: FilmStrip },
  { id: 'style',   label: 'Style',    Icon: Palette },
  { id: 'inbox',   label: 'Inbox',    Icon: Tray },
  { id: 'insights',label: 'Insights', Icon: ChartBar },
]

export function BottomTabBar({ active, onChange, inboxUnread = 0 }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const isActive = active === tab.id
        const color = isActive ? COLORS.tangerine : COLORS.ash
        const badge = tab.id === 'inbox' && inboxUnread > 0 ? inboxUnread : 0
        return (
          <Pressable
            key={tab.id}
            onPress={() => { if (!isActive) { selection(); onChange(tab.id) } }}
            style={({ pressed }) => [styles.tab, pressed && { transform: [{ scale: 0.92 }] }]}
          >
            <View style={styles.iconSlot}>
              <tab.Icon size={22} color={color} weight={isActive ? 'fill' : 'regular'} />
              {badge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
            {isActive ? <View style={styles.indicator} /> : <View style={styles.indicatorPlaceholder} />}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(250, 250, 248, 0.96)',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 8,
  },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 12, minWidth: 56 },
  iconSlot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    backgroundColor: COLORS.liveRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: COLORS.warmWhite, fontFamily: FONTS.humanistBold, fontSize: 8 },
  label: { fontFamily: FONTS.humanistSemibold, fontSize: 10 },
  indicator: { width: 20, height: 3, borderRadius: 2, backgroundColor: COLORS.tangerine, marginTop: 2 },
  indicatorPlaceholder: { width: 20, height: 3, marginTop: 2 },
})
