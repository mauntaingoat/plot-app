/**
 * Landing — the marketing-style first screen new downloaders see.
 * Mirrors the Quill / Linear / Notion onboarding pattern: branded
 * illustration centered, value-prop headline + subhead, big CTA,
 * and a quiet "already have an account?" link.
 *
 * The hero illustration is the `howitworks-pin.png` asset used on
 * the marketing site + email digest — same brand visual the agent
 * will have seen if they came from the web.
 */
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BrandButton } from '../components/BrandButton'
import { ReelstLogo } from '../components/ReelstLogo'
import { COLORS, FONTS } from '../lib/tokens'
import { lightTap } from '../lib/haptics'
import type { AuthStackParamList } from '../navigation/RootNavigator'

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Landing'>

export function LandingScreen() {
  const navigation = useNavigation<Nav>()
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.logoBlock}>
          <ReelstLogo size="lg" />
        </View>

        <View style={styles.heroWrap}>
          <Image
            source={require('../../assets/landing-hero.png')}
            style={styles.hero}
            contentFit="contain"
          />
        </View>

        <Text style={styles.h1}>The link in your bio,{'\n'}built for real estate.</Text>
        <Text style={styles.sub}>
          A live map of your listings — paired with the reels and stories
          you already make. Your full agent brand on one shareable link.
        </Text>

        <View style={styles.actions}>
          <BrandButton
            label="Get Started"
            onPress={() => { lightTap(); navigation.navigate('Welcome') }}
          />
          <Pressable
            onPress={() => { lightTap(); navigation.navigate('SignIn') }}
            style={({ pressed }) => [styles.signInRow, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.signInText}>
              Already have an account? <Text style={styles.signInLink}>Sign in</Text>
            </Text>
          </Pressable>
        </View>

        <LegalFooter />
      </ScrollView>
    </SafeAreaView>
  )
}

/** Privacy / Terms link row — shared across all auth surfaces. */
export function LegalFooter() {
  return (
    <View style={styles.legalRow}>
      <Pressable onPress={() => Linking.openURL('https://reel.st/privacy')}>
        <Text style={styles.legalLink}>Privacy Policy</Text>
      </Pressable>
      <Text style={styles.legalDot}>·</Text>
      <Pressable onPress={() => Linking.openURL('https://reel.st/terms')}>
        <Text style={styles.legalLink}>Terms of Use</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ivory },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logoBlock: { marginTop: 8, marginBottom: 8, alignItems: 'center' },
  heroWrap: {
    flex: 1,
    minHeight: 260,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  hero: { width: '88%', height: 280, aspectRatio: 1 },
  h1: {
    fontFamily: FONTS.humanistSemibold,
    fontSize: 30,
    lineHeight: 36,
    color: COLORS.ink,
    letterSpacing: -0.7,
    textAlign: 'center',
    marginTop: 8,
  },
  sub: {
    fontFamily: FONTS.humanist,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.smoke,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  actions: { width: '100%', marginTop: 24, gap: 12 },
  signInRow: { alignItems: 'center', paddingVertical: 10 },
  signInText: { fontFamily: FONTS.humanist, fontSize: 14, color: COLORS.smoke },
  signInLink: { fontFamily: FONTS.humanistBold, color: COLORS.tangerine },

  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
  },
  legalLink: {
    fontFamily: FONTS.humanistSemibold,
    fontSize: 12,
    color: COLORS.smoke,
    textDecorationLine: 'underline',
  },
  legalDot: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.ash },
})
