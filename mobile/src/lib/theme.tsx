/**
 * Theme provider — mirrors web `themeStore.ts`.
 * Reads the persisted preference from AsyncStorage and resolves it
 * against the system color scheme on every render. Components that
 * want to participate in dark mode call `useColors()` and pull
 * surface/text tokens from the returned set. Static tokens that
 * never theme (brand gradient, status colors) keep living in
 * `tokens.ts` so primitive components don't have to touch context.
 *
 * Migration plan: the chrome (DashboardScreen root + BottomTabBar)
 * uses `useColors()` today; individual cards/sheets keep importing
 * `COLORS` from `tokens.ts` and migrate to the hook one PR at a
 * time. That avoids a 30+ file refactor while still giving the
 * appearance picker a visible result.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { COLORS as LIGHT } from './tokens'
import { getThemePreference, setThemePreference, type ThemePreference } from './appearance'

export type ResolvedTheme = 'light' | 'dark'

export interface ThemedColors {
  // Page backgrounds
  pageBg: string
  surfaceBg: string
  cardBg: string
  /** Soft tinted row/chip background (e.g. cream rows on light,
   *  near-black tinted rows on dark). */
  chipBg: string
  /** Darker chip — visually distinct from chipBg in both themes
   *  (pearl on light, slightly lighter than chip on dark). */
  pearlBg: string

  // Borders + dividers
  border: string

  // Text
  ink: string
  graphite: string
  smoke: string
  ash: string

  // Status accents that need to flip (e.g. soft pink heart icon bg
  // on light → richer maroon on dark to keep contrast).
  iconChipTangerineBg: string
  iconChipBlueBg: string
  iconChipRedBg: string
  iconChipGreenBg: string
}

const LIGHT_TOKENS: ThemedColors = {
  pageBg: LIGHT.ivory,
  surfaceBg: LIGHT.warmWhite,
  cardBg: LIGHT.warmWhite,
  chipBg: LIGHT.cream,
  pearlBg: LIGHT.pearl,
  border: LIGHT.borderLight,
  ink: LIGHT.ink,
  graphite: LIGHT.graphite,
  smoke: LIGHT.smoke,
  ash: LIGHT.ash,
  iconChipTangerineBg: 'rgba(255, 107, 61, 0.12)',
  iconChipBlueBg: 'rgba(59, 130, 246, 0.12)',
  iconChipRedBg: 'rgba(255, 107, 107, 0.12)',
  iconChipGreenBg: 'rgba(52, 199, 89, 0.12)',
}

const DARK_TOKENS: ThemedColors = {
  pageBg: '#08090E',
  surfaceBg: '#15161D',
  cardBg: '#15161D',
  chipBg: '#1F2129',
  pearlBg: '#2A2C36',
  border: 'rgba(255,255,255,0.10)',
  ink: '#F5F5F7',
  graphite: '#D5D5DA',
  smoke: '#A5A6AD',
  ash: '#7A7A82',
  iconChipTangerineBg: 'rgba(255, 107, 61, 0.18)',
  iconChipBlueBg: 'rgba(59, 130, 246, 0.20)',
  iconChipRedBg: 'rgba(255, 107, 107, 0.18)',
  iconChipGreenBg: 'rgba(52, 199, 89, 0.18)',
}

interface ThemeCtx {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (next: ThemePreference) => void
  colors: ThemedColors
}

const ThemeContext = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() // 'light' | 'dark' | null
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    getThemePreference().then((p) => {
      setPreferenceState(p)
      setHydrated(true)
    })
  }, [])

  const resolved: ResolvedTheme = useMemo(() => {
    if (preference === 'light') return 'light'
    if (preference === 'dark') return 'dark'
    return system === 'dark' ? 'dark' : 'light'
  }, [preference, system])

  const colors = resolved === 'dark' ? DARK_TOKENS : LIGHT_TOKENS

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next)
    setThemePreference(next)
  }

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference, colors }}>
      {hydrated ? children : null}
    </ThemeContext.Provider>
  )
}

/** Hook — falls back to light tokens when no provider is mounted so
 *  components can be rendered in isolation (tests, storybook). */
export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext)
  if (ctx) return ctx
  return {
    preference: 'system',
    resolved: 'light',
    setPreference: () => {},
    colors: LIGHT_TOKENS,
  }
}

export function useColors(): ThemedColors {
  return useTheme().colors
}

/**
 * Token-swap helper for the dark mode migration.
 *
 * Most components were built before the theme context existed, so
 * they use static `COLORS.warmWhite` etc. inside `StyleSheet.create`.
 * Refactoring every file to consume `useColors()` per-property is
 * weeks of grind — instead, this helper takes a frozen styles object,
 * walks every nested style block, and swaps any light-mode color
 * literal we recognize (warmWhite/cream/pearl/ink/etc.) to its dark
 * equivalent. Light mode is a no-op (returns the original ref).
 *
 * Usage:
 *   const styles = StyleSheet.create({ ... })
 *   function MyComponent() {
 *     const tStyles = useThemedStyles(styles)
 *     return <View style={tStyles.card}>...</View>
 *   }
 *
 * Tradeoffs: only swaps the *exact* light hex literals from
 * `tokens.ts`; anything bespoke (inline rgba blends, etc.) stays as
 * authored. Status colors (tangerine, soldGreen, liveRed, etc.) are
 * intentionally NOT in the swap map — the brand stays branded.
 */
// Property-specific swap maps. `warmWhite` and `ink` are used for
// both surfaces AND text, with opposite intent — swapping the wrong
// one inverts white button text or tooltip backgrounds. Splitting by
// property class lets us do the right thing automatically.
//
// Anywhere a value MUST stay literal (tooltip background black,
// type-pill text black overlaying a photo), use the literal
// `'#0A0A0A'` in the style — it sidesteps the swap entirely.

const SURFACE_SWAP: Record<string, string> = {
  [LIGHT.ivory]: DARK_TOKENS.pageBg,
  [LIGHT.warmWhite]: DARK_TOKENS.cardBg,
  [LIGHT.cream]: DARK_TOKENS.chipBg,
  [LIGHT.pearl]: DARK_TOKENS.pearlBg,
}

const BORDER_SWAP: Record<string, string> = {
  [LIGHT.borderLight]: DARK_TOKENS.border,
}

const TEXT_SWAP: Record<string, string> = {
  [LIGHT.ink]: DARK_TOKENS.ink,
  [LIGHT.graphite]: DARK_TOKENS.graphite,
  [LIGHT.smoke]: DARK_TOKENS.smoke,
  [LIGHT.ash]: DARK_TOKENS.ash,
}

const BG_KEYS = new Set(['backgroundColor'])
const BORDER_KEYS = new Set([
  'borderColor',
  'borderTopColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRightColor',
])
const TEXT_KEYS = new Set(['color'])

function swapValue(prop: string, val: string): string | null {
  if (BG_KEYS.has(prop)) return SURFACE_SWAP[val] ?? null
  if (BORDER_KEYS.has(prop)) return BORDER_SWAP[val] ?? null
  if (TEXT_KEYS.has(prop)) return TEXT_SWAP[val] ?? null
  return null
}

export function useThemedStyles<T extends Record<string, unknown>>(styles: T): T {
  const { resolved } = useTheme()
  return useMemo(() => {
    if (resolved !== 'dark') return styles
    const out: Record<string, unknown> = {}
    for (const k in styles) {
      const block = (styles as Record<string, unknown>)[k]
      if (block && typeof block === 'object') {
        const next: Record<string, unknown> = {}
        let touched = false
        for (const prop in block as Record<string, unknown>) {
          const val = (block as Record<string, unknown>)[prop]
          if (typeof val === 'string') {
            const swapped = swapValue(prop, val)
            if (swapped !== null) {
              next[prop] = swapped
              touched = true
              continue
            }
          }
          next[prop] = val
        }
        out[k] = touched ? next : block
      } else {
        out[k] = block
      }
    }
    return out as T
  }, [styles, resolved])
}
