import { View, Text, Image, StyleSheet } from 'react-native'
import { COLORS, FONTS } from '../lib/tokens'

/**
 * Avatar — circular user image with initials fallback.
 * Mirrors `src/components/ui/Avatar.tsx` from the web app.
 */
interface Props {
  src?: string | null
  name?: string | null
  size?: number
}

export function Avatar({ src, name, size = 36 }: Props) {
  const initials = (name || 'Agent')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    )
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: { backgroundColor: COLORS.pearl },
  fallback: { backgroundColor: COLORS.pearl, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: FONTS.humanistBold, color: COLORS.graphite },
})
