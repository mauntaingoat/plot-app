import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Palette, Eye, TextAa, MapPin, Layout, ImageSquare, Lock } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { lightTap } from '../../lib/haptics'

/**
 * Style tab — mirrors `src/components/dashboard/StyleTab.tsx` layout.
 *
 * The actual interactive pickers (palette swatches, font picker, map
 * shape selector, template grid, custom background upload, layout
 * templates) land in a later milestone — they're substantial UI
 * surfaces each. For now this is a faithful section-structure
 * placeholder so the visual hierarchy + iconography match the web.
 */

interface SectionDef {
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: 'fill' | 'regular' }>
  title: string
  subtitle: string
  pro?: boolean
}

const SECTIONS: SectionDef[] = [
  { Icon: Palette, title: 'Palette', subtitle: 'Brand colors for your profile' },
  { Icon: TextAa, title: 'Fonts', subtitle: 'Typography for headings + body' },
  { Icon: MapPin, title: 'Map Shape', subtitle: 'The silhouette your pins live inside' },
  { Icon: Layout, title: 'Template', subtitle: 'Pre-styled looks you can start from' },
  { Icon: ImageSquare, title: 'Custom Background', subtitle: 'Upload your own', pro: true },
]

export function StyleTab() {
  return (
    <View>
      {/* TabHeader */}
      <View style={styles.tabHeader}>
        <View style={styles.iconChip}>
          <Palette size={20} color={COLORS.warmWhite} weight="fill" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Style your Reelst</Text>
          <Text style={styles.tabSubtitle}>The signature element of your Reelst</Text>
        </View>
      </View>

      {/* Preview button (matches web's mobile Preview sub-tab) */}
      <Pressable
        onPress={() => lightTap()}
        style={({ pressed }) => [styles.previewBtn, pressed && { opacity: 0.85 }]}
      >
        <Eye size={16} color={COLORS.ink} />
        <Text style={styles.previewBtnText}>Preview your Reelst</Text>
      </Pressable>

      {/* Section list */}
      <View style={styles.sectionList}>
        {SECTIONS.map((s) => (
          <Pressable
            key={s.title}
            onPress={() => lightTap()}
            style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <View style={styles.rowIcon}>
              <s.Icon size={18} color={COLORS.graphite} weight="regular" />
            </View>
            <View style={styles.rowBody}>
              <View style={styles.rowTitleRow}>
                <Text style={styles.rowTitle}>{s.title}</Text>
                {s.pro ? (
                  <View style={styles.proBadge}>
                    <Lock size={8} color={COLORS.warmWhite} weight="fill" />
                    <Text style={styles.proBadgeText}>Pro</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.rowSubtitle}>{s.subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Interactive pickers (palette swatches, font picker, map-shape selector,
          template grid, custom background upload) drop in next milestone.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconChip: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.tangerine,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#D94A1F', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  tabTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  tabSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 2 },

  previewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 44, borderRadius: 12,
    backgroundColor: COLORS.warmWhite, borderWidth: 1, borderColor: COLORS.borderLight,
    marginBottom: 20,
  },
  previewBtnText: { fontFamily: FONTS.humanistSemibold, fontSize: 14, color: COLORS.ink },

  sectionList: { gap: 10, marginBottom: 16 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.cream, borderRadius: 14, padding: 16,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.pearl,
    alignItems: 'center', justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontFamily: FONTS.humanistMedium, fontSize: 15, color: COLORS.ink },
  rowSubtitle: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 2 },

  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    backgroundColor: '#D94A1F',
  },
  proBadgeText: { fontFamily: FONTS.humanistBold, fontSize: 9, color: COLORS.warmWhite, textTransform: 'uppercase', letterSpacing: 0.4 },

  note: {
    backgroundColor: 'rgba(217,74,31,0.06)',
    borderRadius: 14, padding: 14,
  },
  noteText: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, lineHeight: 18 },
})
