import { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { COLORS } from '../lib/tokens'
import { BottomTabBar, type DashTab } from '../components/BottomTabBar'
import { DashboardHeader } from '../components/DashboardHeader'
import { PinActionsSheet } from '../components/PinActionsSheet'
import { SetupChecklistSheet } from '../components/SetupChecklistSheet'
import { MyPinsTab } from './tabs/MyPinsTab'
import { ContentTab } from './tabs/ContentTab'
import { StyleTab } from './tabs/StyleTab'
import { InboxTab } from './tabs/InboxTab'
import { InsightsTab } from './tabs/InsightsTab'
import { useUserDoc } from '../lib/useUserDoc'
import { usePins } from '../lib/usePins'
import { computeSetupPercent } from '../lib/setupPercent'
import { togglePinEnabled, archivePin } from '../lib/firestoreDb'
import { lightTap, warning } from '../lib/haptics'
import type { Pin } from '../types'
import type { AppStackParamList } from '../navigation/RootNavigator'

type Nav = NativeStackNavigationProp<AppStackParamList, 'Dashboard'>

/**
 * Dashboard shell. Sticky header (avatar + tab name + @username +
 * setup ring + Preview + settings) + scrollable tab content + bottom
 * tab bar. Pin actions sheet lifted up here so it can sit above the
 * tab bar at the screen-level z-index.
 */
export function DashboardScreen() {
  const navigation = useNavigation<Nav>()
  const [activeTab, setActiveTab] = useState<DashTab>('reelst')
  const [pinActions, setPinActions] = useState<Pin | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)

  const { userDoc } = useUserDoc()
  const { pins } = usePins()
  const setupPercent = computeSetupPercent(userDoc, pins)
  const isPro = userDoc?.tier === 'pro'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardHeader
        user={userDoc}
        activeTab={activeTab}
        setupPercent={setupPercent}
        onSettingsPress={() => navigation.navigate('Settings')}
        onSetupPress={() => setSetupOpen(true)}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'reelst' && (
          <MyPinsTab
            isPro={isPro}
            onAddPin={() => lightTap()}
            onPinPress={(pin) => setPinActions(pin)}
            onToggleEnabled={(pin, next) => {
              togglePinEnabled(pin.id, next).catch((e) => {
                console.warn('[togglePinEnabled] failed:', e?.code, e?.message)
                if (next) {
                  Alert.alert(
                    'Can\'t enable pin',
                    e?.message || 'You may be at your tier\'s active-pin cap. Upgrade to Pro to enable more pins.',
                  )
                }
              })
            }}
          />
        )}
        {activeTab === 'content'  && <ContentTab onUpload={() => lightTap()} />}
        {activeTab === 'style'    && <StyleTab />}
        {activeTab === 'inbox'    && <InboxTab />}
        {activeTab === 'insights' && <InsightsTab />}
      </ScrollView>

      <BottomTabBar active={activeTab} onChange={setActiveTab} />

      <SetupChecklistSheet
        visible={setupOpen}
        onClose={() => setSetupOpen(false)}
        user={userDoc}
        pins={pins}
      />

      <PinActionsSheet
        pin={pinActions}
        onClose={() => setPinActions(null)}
        onEditDetails={() => {
          setPinActions(null)
          Alert.alert('Edit Details', 'Edit-details sheet drops in next milestone.')
        }}
        onAddContent={() => {
          setPinActions(null)
          Alert.alert('Add Content', 'Content upload flow drops in next milestone.')
        }}
        onGetQR={() => {
          setPinActions(null)
          Alert.alert('QR Code', 'Per-pin QR generation drops in next milestone.')
        }}
        onOpenHouse={() => {
          setPinActions(null)
          Alert.alert('Open House', 'Open house scheduling drops in next milestone.')
        }}
        onToggleVisibility={() => {
          if (!pinActions) return
          togglePinEnabled(pinActions.id, !pinActions.enabled).catch(() => {})
          setPinActions(null)
        }}
        onArchive={() => {
          if (!pinActions) return
          warning()
          Alert.alert(
            'Archive pin',
            `Hide ${pinActions.address} from your map? It will auto-delete after 7 days unless restored.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Archive',
                style: 'destructive',
                onPress: () => {
                  archivePin(pinActions.id).catch(() => {})
                  setPinActions(null)
                },
              },
            ],
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ivory },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
})
