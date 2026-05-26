/**
 * Per-pin QR code bottom sheet. Encodes `https://reel.st/{username}
 * ?pin={pinId}` — same URL the web QRCodeModal uses — so QR codes
 * printed on flyers/business cards route directly to the pin on
 * the agent's profile.
 *
 * Two actions: copy the URL to clipboard, and share via the native
 * iOS share sheet (so the user can save to Photos, AirDrop, etc.).
 */
import { View, Text, Pressable, StyleSheet, Share } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { ShareNetwork, X } from 'phosphor-react-native'
import { BottomSheet } from './BottomSheet'
import { COLORS, FONTS } from '../lib/tokens'
import { useColors, useThemedStyles } from '../lib/theme'
import { lightTap } from '../lib/haptics'
import type { Pin } from '../types'

export function QRCodeSheet({
  pin,
  username,
  onClose,
}: {
  pin: Pin | null
  username: string | null | undefined
  onClose: () => void
}) {
  const styles = useThemedStyles(_styles)
  const colors = useColors()

  const url = pin && username ? `https://reel.st/${username}?pin=${pin.id}` : ''

  const onShare = async () => {
    if (!url || !pin) return
    lightTap()
    try {
      // iOS's native Share sheet always includes Copy as a destination,
      // so we lean on that instead of bundling a separate clipboard
      // native module (which would need a debug-binary rebuild).
      await Share.share({
        url,
        message: `Scan or tap to view ${pin.address} on Reelst — ${url}`,
        title: `${pin.address} on Reelst`,
      })
    } catch {
      // user cancelled
    }
  }

  return (
    <BottomSheet visible={!!pin} onClose={onClose}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>Listing QR Code</Text>
          {pin ? (
            <>
              <Text style={styles.address} numberOfLines={1}>{pin.address}</Text>
              <Text style={styles.url} numberOfLines={1}>{url.replace('https://', '')}</Text>
            </>
          ) : null}
        </View>
        <Pressable
          onPress={() => { lightTap(); onClose() }}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <X size={18} color={colors.smoke} weight="bold" />
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* The QR is always rendered on a pure white tile regardless
            of theme — scanners depend on high foreground/background
            contrast and dark-mode tinting kills reliability. */}
        <View style={styles.qrCard}>
          {url ? <QRCode value={url} size={240} color="#0A0E17" backgroundColor="#FFFFFF" /> : null}
        </View>

        <Text style={styles.footnote}>Print this QR on flyers, signs, and business cards.</Text>

        <Pressable
          onPress={onShare}
          style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
        >
          <ShareNetwork size={15} color={COLORS.warmWhite} weight="bold" />
          <Text style={styles.shareBtnText}>Share QR · Copy link · Save</Text>
        </Pressable>
      </View>
    </BottomSheet>
  )
}

const _styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    gap: 10,
  },
  title: { fontFamily: FONTS.humanistBold, fontSize: 17, color: COLORS.ink },
  address: { fontFamily: FONTS.humanist, fontSize: 12.5, color: COLORS.smoke, marginTop: 2 },
  url: { fontFamily: FONTS.humanist, fontSize: 11, color: COLORS.ash, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.cream,
    alignItems: 'center', justifyContent: 'center',
  },

  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, alignItems: 'center' },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  footnote: {
    fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke,
    textAlign: 'center', marginTop: 16, paddingHorizontal: 20,
  },

  shareBtn: {
    marginTop: 18, alignSelf: 'stretch',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 12,
    backgroundColor: COLORS.tangerine,
    shadowColor: '#D94A1F',
    shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
    elevation: 4,
  },
  shareBtnText: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.warmWhite },
})
