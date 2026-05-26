import { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { COLORS } from '../lib/tokens'
import { useColors } from '../lib/theme'
import { BottomTabBar, type DashTab } from '../components/BottomTabBar'
import { DashboardHeader } from '../components/DashboardHeader'
import { PinActionsSheet } from '../components/PinActionsSheet'
import { QRCodeSheet } from '../components/QRCodeSheet'
import { OpenHouseSheet } from '../components/OpenHouseSheet'
import { EditPinSheet } from '../components/EditPinSheet'
import { SetupChecklistSheet } from '../components/SetupChecklistSheet'
import { ConfirmSheet } from '../components/ConfirmSheet'
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
  const [qrPin, setQrPin] = useState<Pin | null>(null)
  const [openHousePin, setOpenHousePin] = useState<Pin | null>(null)
  const [editPin, setEditPin] = useState<Pin | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [archivePinTarget, setArchivePinTarget] = useState<Pin | null>(null)

  const { userDoc } = useUserDoc()
  const { pins } = usePins()
  const setupPercent = computeSetupPercent(userDoc, pins)
  const isPro = userDoc?.tier === 'pro'
  const colors = useColors()

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.pageBg }]} edges={['top']}>
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
            onAddPin={() => { lightTap(); navigation.navigate('PinCreate') }}
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
        {activeTab === 'content'  && (
          <ContentTab onUpload={() => { lightTap(); navigation.navigate('ContentCreate', {}) }} />
        )}
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
          const pin = pinActions
          setPinActions(null)
          if (pin) setEditPin(pin)
        }}
        onAddContent={() => {
          const pin = pinActions
          setPinActions(null)
          if (pin) navigation.navigate('ContentCreate', { pinId: pin.id })
        }}
        onGetQR={() => {
          const pin = pinActions
          setPinActions(null)
          if (pin) setQrPin(pin)
        }}
        onOpenHouse={() => {
          const pin = pinActions
          setPinActions(null)
          if (pin) setOpenHousePin(pin)
        }}
        onToggleVisibility={() => {
          if (!pinActions) return
          togglePinEnabled(pinActions.id, !pinActions.enabled).catch(() => {})
          setPinActions(null)
        }}
        onArchive={() => {
          if (!pinActions) return
          warning()
          setArchivePinTarget(pinActions)
          setPinActions(null)
        }}
      />

      <ConfirmSheet
        visible={!!archivePinTarget}
        title="Archive this pin?"
        message="This will remove the pin from your map and public profile. Archived pins are permanently deleted after 7 days."
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          const pin = archivePinTarget
          setArchivePinTarget(null)
          if (pin) archivePin(pin.id).catch(() => {})
        }}
        onClose={() => setArchivePinTarget(null)}
      />

      <QRCodeSheet
        pin={qrPin}
        username={userDoc?.username ?? null}
        onClose={() => setQrPin(null)}
      />

      <OpenHouseSheet
        pin={openHousePin}
        isPro={isPro}
        onClose={() => setOpenHousePin(null)}
        onUpgrade={() => {
          setOpenHousePin(null)
          Alert.alert('Go Pro', 'Upgrade flow lands in the next milestone.')
        }}
      />

      <EditPinSheet pin={editPin} onClose={() => setEditPin(null)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
})
