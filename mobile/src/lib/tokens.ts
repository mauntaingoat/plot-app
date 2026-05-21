/**
 * Reelst design tokens — mirrors `src/styles/index.css` from the web app.
 *
 * Keep this file in sync with the web styleguide when colors / spacing
 * change. Pull from the web index.css :root declarations directly to
 * avoid drift.
 */

export const COLORS = {
  // Tangerine family
  tangerine: '#FF6B3D',
  ember: '#E8522A',
  emberDeep: '#C73E18',
  // Brand gradient stops (for LinearGradient)
  brandGradient: ['#FF8552', '#F26340', '#D94A1F'] as const,
  brandGradientLocations: [0, 0.35, 1] as const,
  brandShadowColor: 'rgba(217, 74, 31, 0.48)',
  brandShadowInner: 'rgba(255, 255, 255, 0.24)',

  // Surfaces
  ivory: '#FAFAF8',
  cream: '#F5F3EF',
  pearl: '#EDEAE4',
  warmWhite: '#FFFFFF',

  // Text
  ink: '#1A1A1A',
  graphite: '#3D3D3D',
  smoke: '#6B7280',
  ash: '#9CA3AF',

  // Status
  soldGreen: '#34C759',
  liveRed: '#FF3B30',
  openAmber: '#FFAA00',
  listingBlue: '#3B82F6',

  // Borders
  borderLight: 'rgba(0, 0, 0, 0.06)',

  // Dark surfaces (used in some Reelst dark contexts)
  midnight: '#0A0E17',
  obsidian: '#12161F',
  slate: '#1C2130',
} as const

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
  sheet: 24,
} as const

export const FONTS = {
  // Tier 1: humanist body / UI — matches `var(--font-humanist)`
  // (Web prefers General Sans; we substitute Outfit which is on Google
  // Fonts and reads very close.)
  humanist: 'Outfit_400Regular',
  humanistMedium: 'Outfit_500Medium',
  humanistSemibold: 'Outfit_600SemiBold',
  humanistBold: 'Outfit_700Bold',
  // Tier 2: serif accents — matches `var(--font-serif)`
  serif: 'Fraunces_400Regular',
  serifSemibold: 'Fraunces_600SemiBold',
  serifBold: 'Fraunces_700Bold',
} as const
