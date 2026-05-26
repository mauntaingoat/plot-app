import { View, Text, Pressable, StyleSheet, Linking } from 'react-native'
import { Gear, ArrowSquareOut } from 'phosphor-react-native'
import { COLORS, FONTS } from '../lib/tokens'
import { useColors } from '../lib/theme'
import { Avatar } from './Avatar'
import { SetupRing } from './SetupRing'
import { lightTap } from '../lib/haptics'
import type { UserDocLite } from '../lib/firestoreDb'
import type { DashTab } from './BottomTabBar'

/**
 * Sticky dashboard header — mirrors `src/pages/Dashboard.tsx:1767-1800`
 * (web mobile layout).
 *
 * Left: Avatar (36) → tab name (bold) + @username (smoke)
 * Right: SetupRing (only when <100%) → Preview button → Settings gear
 */

const TAB_TITLES: Record<DashTab, string> = {
  reelst: 'My Pins',
  content: 'Content',
  style: 'Style',
  inbox: 'Inbox',
  insights: 'Insights',
}

interface Props {
  user: UserDocLite | null
  activeTab: DashTab
  setupPercent: number
  onPreviewPress?: () => void
  onSettingsPress: () => void
  onSetupPress?: () => void
}

export function DashboardHeader({ user, activeTab, setupPercent, onPreviewPress, onSettingsPress, onSetupPress }: Props) {
  const colors = useColors()
  const handlePreview = () => {
    lightTap()
    if (onPreviewPress) {
      onPreviewPress()
      return
    }
    const username = user?.username
    if (username) Linking.openURL(`https://reel.st/${username}?preview=true`)
  }

  return (
    <View style={[styles.wrap, { backgroundColor: colors.pageBg, borderBottomColor: colors.border }]}>
      {/* Left */}
      <View style={styles.left}>
        <Avatar src={user?.photoURL ?? undefined} name={user?.displayName ?? user?.username ?? 'Agent'} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
            {TAB_TITLES[activeTab]}
          </Text>
          <Text style={[styles.handle, { color: colors.smoke }]} numberOfLines={1}>
            @{user?.username ?? 'you'}
          </Text>
        </View>
      </View>

      {/* Right */}
      <View style={styles.right}>
        {setupPercent < 100 ? (
          <Pressable onPress={() => { lightTap(); onSetupPress?.() }} hitSlop={6}>
            <SetupRing percent={setupPercent} size={36} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={handlePreview}
          style={({ pressed }) => [
            styles.previewBtn,
            { backgroundColor: colors.surfaceBg, borderColor: colors.border },
            pressed && { opacity: 0.85 },
          ]}
        >
          <ArrowSquareOut size={13} color={colors.ink} weight="bold" />
          <Text style={[styles.previewText, { color: colors.ink }]}>Preview</Text>
        </Pressable>

        <Pressable
          onPress={() => { lightTap(); onSettingsPress() }}
          style={({ pressed }) => [
            styles.settingsBtn,
            { backgroundColor: colors.surfaceBg, borderColor: colors.border },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Gear size={16} color={colors.ink} weight="bold" />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    // backgroundColor + borderBottomColor injected inline from theme.
    borderBottomWidth: 1,
    gap: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  title: { fontFamily: FONTS.humanistSemibold, fontSize: 16, color: COLORS.ink, letterSpacing: -0.3 },
  handle: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 1 },

  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  previewText: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.ink },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
})
