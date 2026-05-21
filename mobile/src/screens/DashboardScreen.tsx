import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { currentUser, signOut } from '../lib/firebaseAuth'
import { lightTap } from '../lib/haptics'

/**
 * Dashboard placeholder — proves end-to-end auth works on native.
 *
 * Real dashboard with tabs (My Pins / Content / Style / Inbox /
 * Insights) lands in milestone 3. For now this just shows the
 * signed-in user's email + a Sign out button so we can verify the
 * full auth flow round-trip.
 */

const COLORS = {
  ivory: '#FFF8F1',
  ink: '#0A0E17',
  smoke: '#5C6373',
  tangerine: '#D94A1F',
  border: '#E8DDC8',
  white: '#FFFFFF',
}

export function DashboardScreen() {
  const user = currentUser()

  const handleSignOut = async () => {
    lightTap()
    await signOut()
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge} />
          <Text style={styles.logoText}>Reelst</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Signed in as</Text>
          <Text style={styles.cardValue}>{user?.email}</Text>
          <Text style={styles.cardSubLabel}>UID</Text>
          <Text style={styles.cardSubValue}>{user?.uid}</Text>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Dashboard coming soon</Text>
          <Text style={styles.placeholderBody}>
            My Pins, Content, Style, Inbox, Insights — all the surfaces
            you have on web — drop in next.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ivory },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  logoBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.tangerine },
  logoText: { fontSize: 22, fontWeight: '700', color: COLORS.ink, letterSpacing: -0.5 },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardLabel: { fontSize: 12, color: COLORS.smoke, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardValue: { fontSize: 18, color: COLORS.ink, fontWeight: '600', marginTop: 4, marginBottom: 12 },
  cardSubLabel: { fontSize: 11, color: COLORS.smoke, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardSubValue: { fontSize: 12, color: COLORS.ink, fontFamily: 'Menlo', marginTop: 2 },
  placeholder: {
    backgroundColor: 'rgba(217,74,31,0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  placeholderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink, marginBottom: 6 },
  placeholderBody: { fontSize: 14, color: COLORS.smoke, lineHeight: 20 },
  signOutBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  pressed: { opacity: 0.85 },
})
