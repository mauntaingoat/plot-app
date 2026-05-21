import { useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { MapPin, FilmStrip, Palette, Tray, ChartBar } from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { selection } from '../lib/haptics'

/**
 * Native port of the web `<TabBar />` (src/components/ui/TabBar.tsx).
 *
 * Visual parity:
 *  - 5 dashboard tabs (My Pins, Content, Style, Inbox, Insights)
 *  - Tangerine active state with a 3px rounded indicator bar below
 *  - Frosted ivory background, top border, safe-area inset aware
 *
 * Behaviour parity:
 *  - The indicator bar SLIDES between tabs with spring physics,
 *    mirroring web's framer-motion `layoutId="tab-indicator"` shared
 *    transition (damping 25, stiffness 350). Using reanimated's
 *    `withSpring` with the same damping/stiffness so the feel matches.
 *  - Selection haptic on tab switch (iOS taptic flair).
 *  - 0.92 scale press feedback per tab tap.
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
  { id: 'reelst',   label: 'My Pins',  Icon: MapPin },
  { id: 'content',  label: 'Content',  Icon: FilmStrip },
  { id: 'style',    label: 'Style',    Icon: Palette },
  { id: 'inbox',    label: 'Inbox',    Icon: Tray },
  { id: 'insights', label: 'Insights', Icon: ChartBar },
]

const INDICATOR_WIDTH = 20
const INDICATOR_HEIGHT = 3

export function BottomTabBar({ active, onChange, inboxUnread = 0 }: Props) {
  const insets = useSafeAreaInsets()
  // Each tab's center-X (measured via onLayout). Indicator translates
  // between these positions with spring physics on `active` change.
  const tabCenters = useRef<Record<DashTab, number>>({} as Record<DashTab, number>)
  const indicatorX = useSharedValue(0)
  // Track whether we've measured at least once so the first-render
  // indicator doesn't slide in from x=0 — it should appear at the
  // correct position immediately on mount.
  const measured = useRef(false)

  useEffect(() => {
    const target = tabCenters.current[active]
    if (typeof target !== 'number') return
    if (!measured.current) {
      // First valid measurement: snap, don't spring.
      indicatorX.value = target
      measured.current = true
    } else {
      indicatorX.value = withSpring(target, { damping: 25, stiffness: 350, mass: 0.6 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const onTabLayout = (id: DashTab) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout
    const center = x + width / 2 - INDICATOR_WIDTH / 2
    tabCenters.current[id] = center
    if (id === active && !measured.current) {
      indicatorX.value = center
      measured.current = true
    }
  }

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }))

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Tabs row */}
      <View style={styles.row}>
        {TABS.map((tab) => {
          const isActive = active === tab.id
          const color = isActive ? COLORS.tangerine : COLORS.ash
          const badge = tab.id === 'inbox' && inboxUnread > 0 ? inboxUnread : 0
          return (
            <Pressable
              key={tab.id}
              onLayout={onTabLayout(tab.id)}
              onPress={() => { if (!isActive) { selection(); onChange(tab.id) } }}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
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
            </Pressable>
          )
        })}
      </View>

      {/* Sliding indicator — absolutely positioned, translates X with
          spring physics on active change. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          { bottom: Math.max(insets.bottom, 8) - 1 },
          indicatorStyle,
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: 'rgba(250, 250, 248, 0.96)',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 12, paddingBottom: 6, minWidth: 56 },
  pressed: { transform: [{ scale: 0.92 }] },
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
  indicator: {
    position: 'absolute',
    left: 0,
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderRadius: 2,
    backgroundColor: COLORS.tangerine,
  },
})
