import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Gear, MapPin as MapPinIcon, FilmStrip, Palette, Tray, ChartBar } from 'phosphor-react-native'
import { lightTap } from '../lib/haptics'
import { COLORS, FONTS } from '../lib/tokens'
import { ReelstLogo } from '../components/ReelstLogo'
import { BottomTabBar, type DashTab } from '../components/BottomTabBar'
import type { AppStackParamList } from '../navigation/RootNavigator'

type Nav = NativeStackNavigationProp<AppStackParamList, 'Dashboard'>

/**
 * Dashboard shell — mirrors `src/pages/Dashboard.tsx` mobile layout:
 *  - Sticky header with Reelst logo + settings gear
 *  - Scrollable tab content
 *  - Fixed bottom tab bar (5 tabs: My Pins, Content, Style, Inbox, Insights)
 *
 * Each tab currently renders a placeholder `TabPlaceholder`. The actual
 * dashboard content per tab (pins list, content library, style picker,
 * inbox, insights charts) lands in subsequent milestones, one tab at a
 * time, to keep changes reviewable.
 */
export function DashboardScreen() {
  const navigation = useNavigation<Nav>()
  const [activeTab, setActiveTab] = useState<DashTab>('reelst')

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sticky header */}
      <View style={styles.header}>
        <ReelstLogo size="sm" />
        <Pressable
          onPress={() => { lightTap(); navigation.navigate('Settings') }}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Gear size={20} color={COLORS.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'reelst'   && <TabPlaceholder Icon={MapPinIcon} title="My Pins"   subtitle="Your listings on the map. Add and edit pins here." />}
        {activeTab === 'content'  && <TabPlaceholder Icon={FilmStrip}  title="Content"   subtitle="Reels, photos, and listing media." />}
        {activeTab === 'style'    && <TabPlaceholder Icon={Palette}    title="Style"     subtitle="The signature element of your Reelst." />}
        {activeTab === 'inbox'    && <TabPlaceholder Icon={Tray}       title="Inbox"     subtitle="Waves, showings, and questions from buyers." />}
        {activeTab === 'insights' && <TabPlaceholder Icon={ChartBar}   title="Insights"  subtitle="How your Reelst is performing." />}
      </ScrollView>

      <BottomTabBar active={activeTab} onChange={setActiveTab} />
    </SafeAreaView>
  )
}

/**
 * Tab header pattern that matches the web `<TabHeader />` component
 * in Dashboard.tsx:79 — gradient icon chip + bold title + smoke subtitle.
 */
function TabPlaceholder({ Icon, title, subtitle }: {
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: 'fill' | 'regular' }>
  title: string
  subtitle: string
}) {
  return (
    <View>
      <View style={styles.tabHeader}>
        <View style={styles.iconChip}>
          <Icon size={20} color={COLORS.warmWhite} weight="fill" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>{title}</Text>
          <Text style={styles.tabSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Coming up next</Text>
        <Text style={styles.placeholderBody}>
          This tab will mirror the {title.toLowerCase()} surface from your web dashboard.
          Wiring it up in the next milestone — pin list, edit flow, photo carousel, and the create-pin step.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ivory },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.ivory,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cream,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },

  // TabHeader pattern (matches web)
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D94A1F',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  tabTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  tabSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 2 },

  placeholder: {
    backgroundColor: 'rgba(217,74,31,0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  placeholderTitle: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.ink, marginBottom: 6 },
  placeholderBody: { fontFamily: FONTS.humanist, fontSize: 14, color: COLORS.smoke, lineHeight: 21 },
  pressed: { opacity: 0.9 },
})
