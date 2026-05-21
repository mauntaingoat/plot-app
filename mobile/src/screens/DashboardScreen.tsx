import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Gear } from 'phosphor-react-native'
import { lightTap } from '../lib/haptics'
import { COLORS, FONTS } from '../lib/tokens'
import { ReelstLogo } from '../components/ReelstLogo'
import { BottomTabBar, type DashTab } from '../components/BottomTabBar'
import { MyPinsTab } from './tabs/MyPinsTab'
import { ContentTab } from './tabs/ContentTab'
import { StyleTab } from './tabs/StyleTab'
import { InboxTab } from './tabs/InboxTab'
import { InsightsTab } from './tabs/InsightsTab'
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
        {activeTab === 'reelst'   && <MyPinsTab onAddPin={() => lightTap()} />}
        {activeTab === 'content'  && <ContentTab onUpload={() => lightTap()} />}
        {activeTab === 'style'    && <StyleTab />}
        {activeTab === 'inbox'    && <InboxTab />}
        {activeTab === 'insights' && <InsightsTab />}
      </ScrollView>

      <BottomTabBar active={activeTab} onChange={setActiveTab} />
    </SafeAreaView>
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
  pressed: { opacity: 0.9 },
})
