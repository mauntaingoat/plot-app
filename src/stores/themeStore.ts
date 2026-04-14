import { create } from 'zustand'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'reelst_theme'
const LEGACY_KEY = 'reelst_dark'

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  // Migrate the legacy boolean flag used by the old inline toggle.
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (legacy === 'true') return 'dark'
  if (legacy === 'false') return 'light'
  return 'system'
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return pref
}

interface ThemeState {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (pref: ThemePreference) => void
  /** Activate dashboard dark scope — returns a cleanup fn to deactivate. */
  activate: () => () => void
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialPref = readStoredPreference()
  return {
    preference: initialPref,
    resolved: resolve(initialPref),
    setPreference: (pref) => {
      localStorage.setItem(STORAGE_KEY, pref)
      const resolved = resolve(pref)
      set({ preference: pref, resolved })
      // Only update the DOM class if the dashboard scope is currently active.
      if (document.documentElement.dataset.themeScope === 'dashboard') {
        document.documentElement.classList.toggle('dark-dashboard', resolved === 'dark')
      }
    },
    activate: () => {
      const root = document.documentElement
      root.dataset.themeScope = 'dashboard'
      const apply = () => {
        const resolved = resolve(get().preference)
        root.classList.toggle('dark-dashboard', resolved === 'dark')
        set({ resolved })
      }
      apply()

      // React to system preference changes while scope is active.
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const onSystemChange = () => {
        if (get().preference === 'system') apply()
      }
      mq.addEventListener('change', onSystemChange)

      return () => {
        mq.removeEventListener('change', onSystemChange)
        root.classList.remove('dark-dashboard')
        delete root.dataset.themeScope
      }
    },
  }
})
