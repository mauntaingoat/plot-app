import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ChartBar as BarChart3, Users, Gear as Settings, Plus, Eye, CursorClick as MousePointerClick, ArrowSquareOut as ExternalLink, SignOut as LogOut, CaretRight as ChevronRight, CreditCard, User, Trash as Trash2, PencilSimple as Edit3, EyeSlash as EyeOff, LinkSimple as Link2, Shield, FilmStrip as Film, ShareNetwork as Share2, Copy, Check, X, QrCode, CalendarDots as CalendarDays, Tray as Inbox, Bell, Camera, Sun, Moon, ArrowsClockwise as RefreshCw, Warning as AlertTriangle, ArrowRight, Buildings as Building, Palette, Heart, HandWaving as Hand } from '@phosphor-icons/react'
import { TabBar } from '@/components/ui/TabBar'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { PinCard } from '@/components/dashboard/PinCard'
import { StatCard } from '@/components/dashboard/StatCard'
import { SetupRing } from '@/components/dashboard/SetupRing'
import { SetupChecklist } from '@/components/dashboard/SetupChecklist'
import { InsightsChart } from '@/components/dashboard/InsightsChart'
import { PaywallPrompt } from '@/components/dashboard/PaywallPrompt'
import { PinBreakdown, ContentConversion, GeoHeatmap, TimeOfDay, SaveGrowth } from '@/components/dashboard/AdvancedInsights'
import { SavedMapInsights, CustomBranding } from '@/components/dashboard/StudioFeatures'
import { QRCodeModal } from '@/components/dashboard/QRCodeModal'
import { OpenHouseEditor } from '@/components/dashboard/OpenHouseEditor'
import { PinEditModal } from '@/components/dashboard/PinEditModal'
import { ShowingInbox } from '@/components/dashboard/ShowingInbox'
import { NotificationSettings } from '@/components/dashboard/NotificationSettings'
import { ContentLibrary } from '@/components/dashboard/ContentLibrary'
import { StyleTab } from '@/components/dashboard/StyleTab'
import { useUnreadCount } from '@/components/dashboard/ShowingInbox'
import { PendingChangesModal, PendingChangeCard } from '@/components/dashboard/PendingChangesModal'
import { subscribeToAgentPendingChanges, subscribeToAgentSubscriberCount } from '@/lib/firestore'
import type { PendingPinChange } from '@/lib/types'
import { preloadImages } from '@/lib/imageCache'
import { canActivatePin, hasFeature, getUserTier, type Tier } from '@/lib/tiers'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useScrollLock } from '@/hooks/useScrollLock'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore, type ThemePreference } from '@/stores/themeStore'
import { firebaseConfigured } from '@/config/firebase'
import { subscribeToAllAgentPins } from '@/lib/firestore'
import { PLATFORM_LIST, PLATFORM_LOGOS, validatePlatformUrl } from '@/components/icons/PlatformLogos'
import { AdminPanel } from '@/components/dashboard/AdminPanel'
import { isAdmin } from '@/lib/admin'
import { PIN_CONFIG, type Pin, type Platform, type ForSalePin, type OpenHouse, type ContentItem, type UserDoc } from '@/lib/types'

type DashTab = 'reelst' | 'insights' | 'inbox' | 'content' | 'style' | 'settings' | 'admin'

/* Desktop layout (sidebar + content) kicks in early — sidebar is
   ~240px, so anything wider than ~760px has enough room for both
   without forcing the mobile bottom-tab layout. Below this we drop
   to the original mobile layout. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 768)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

/* Right-side preview pane only appears at wider widths — sidebar
   (240) + content (~500 min) + preview (300) = ~1040, so we wait
   for a comfortable buffer before rendering it. Between mobile and
   this threshold we keep the desktop sidebar layout but drop the
   preview pane. */
/**
 * Standardized tab header — gradient icon chip on the left, bold
 * title + smoke-tinted subtitle on the right. Mirrors the Style
 * tab's existing header so all dashboard tabs share one shape.
 * Settings is the only tab without one (it's a list of actions,
 * not a content surface).
 */
function TabHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)', color: '#fff' }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[18px] font-bold text-ink">{title}</p>
        <p className="text-[13px] text-smoke">{subtitle}</p>
      </div>
    </div>
  )
}

function useIsWide() {
  const [isWide, setIsWide] = useState(typeof window !== 'undefined' && window.innerWidth >= 1200)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1200px)')
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isWide
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { userDoc, setUserDoc, firebaseUser, loading, initialized } = useAuthStore()
  const [activeTab, setActiveTab] = useState<DashTab>('reelst')
  const inboxUnread = useUnreadCount(userDoc?.uid)
  const [showSetup, setShowSetup] = useState(false)
  const [showPinActions, setShowPinActions] = useState<Pin | null>(null)
  const [showAddPlatform, setShowAddPlatform] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Pin | null>(null)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [paywall, setPaywall] = useState<{ open: boolean; reason: string; upgradeTo?: Tier }>({ open: false, reason: '' })
  const [qrPin, setQrPin] = useState<Pin | null>(null)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const errorTimerRef = useRef<number | null>(null)
  const [pendingChanges, setPendingChanges] = useState<PendingPinChange[]>([])
  const [pendingModalOpen, setPendingModalOpen] = useState(false)
  const [singlePendingPinId, setSinglePendingPinId] = useState<string | null>(null)
  const [subscriberCount, setSubscriberCount] = useState<number>(0)
  const [waveCount, setWaveCount] = useState<number>(0)
  const [showEditBrokerage, setShowEditBrokerage] = useState(false)
  const [brokerageDraft, setBrokerageDraft] = useState('')
  const [savingBrokerage, setSavingBrokerage] = useState(false)
  const showError = useCallback((msg: string) => {
    setErrorBanner(msg)
    if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current)
    errorTimerRef.current = window.setTimeout(() => setErrorBanner(null), 4500)
  }, [])
  useEffect(() => () => {
    if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current)
  }, [])
  const [openHousePin, setOpenHousePin] = useState<ForSalePin | null>(null)
  const [editPin, setEditPin] = useState<Pin | null>(null)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editProfileData, setEditProfileData] = useState({ displayName: '', bio: '', photoURL: '' })
  const photoInputRef = useRef<HTMLInputElement>(null)
  const desktopScrollRef = useRef<HTMLDivElement>(null)
  const previewIframeRef = useRef<HTMLIFrameElement>(null)
  const isDesktop = useIsDesktop()
  const isWide = useIsWide()
  // Lazy-mount the preview iframe — only mount it the first time the
  // user lands on the Style tab. Once mounted it stays in the DOM
  // (just hidden via CSS on other tabs) so we don't re-init Mapbox
  // every time the user switches tabs. Net effect: 1 map load per
  // dashboard session instead of N (one per tab toggle).
  const [previewMounted, setPreviewMounted] = useState(false)

  // Lock background scroll for desktop-only inline modals
  // (Mobile variants use DarkBottomSheet which locks scroll internally)
  useScrollLock(isDesktop && !!showDeleteConfirm)
  useScrollLock(isDesktop && showEditProfile)
  useScrollLock(isDesktop && showAddPlatform)

  // First-time mount of the preview iframe — only when the user
  // actually opens the Style tab. Other tabs don't need the live
  // preview, and pre-mounting it on Dashboard load would burn a
  // Mapbox map load every time someone opens the dashboard.
  useEffect(() => {
    if (activeTab === 'style' && !previewMounted) setPreviewMounted(true)
  }, [activeTab, previewMounted])

  // Manual reload cooldown — every iframe reload triggers a fresh
  // Mapbox map init (paid load). 3-second debounce stops bored
  // clicking from burning loads. The button visually spins + locks
  // for the cooldown so the user gets immediate feedback.
  const RELOAD_COOLDOWN_MS = 3000
  const [previewReloading, setPreviewReloading] = useState(false)
  const handleReloadPreview = useCallback(() => {
    if (previewReloading) return
    const iframe = previewIframeRef.current
    if (!iframe) return
    iframe.src = iframe.src
    setPreviewReloading(true)
    setTimeout(() => setPreviewReloading(false), RELOAD_COOLDOWN_MS)
  }, [previewReloading])

  const themePreference = useThemeStore((s) => s.preference)
  const resolvedTheme = useThemeStore((s) => s.resolved)
  const setThemePreference = useThemeStore((s) => s.setPreference)
  const activateTheme = useThemeStore((s) => s.activate)
  const isDark = resolvedTheme === 'dark'
  useEffect(() => activateTheme(), [activateTheme])


  const currentUser = userDoc
  const [impersonating, setImpersonating] = useState<UserDoc | null>(null)
  const realUser = userDoc
  const amAdmin = isAdmin(realUser?.uid)

  const [pins, setPins] = useState<Pin[]>([])
  const [pinsLoading, setPinsLoading] = useState(true)
  const activeUid = impersonating?.uid || userDoc?.uid
  useEffect(() => {
    if (!activeUid) {
      setPins([]); setPinsLoading(false)
      return
    }
    setPinsLoading(true)
    const unsub = subscribeToAllAgentPins(activeUid, (live) => {
      // Merge with local state to preserve optimistic updates (e.g.
      // toggle enabled) that haven't propagated to Firestore yet.
      // After 2+ seconds the Firestore write lands and the snapshot
      // catches up naturally.
      setPins((prev) => {
        if (prev.length === 0) return live
        const liveMap = new Map(live.map((p) => [p.id, p]))
        // Keep any local pins not in the snapshot (just added), merge rest
        const merged = live.map((lp) => {
          const local = prev.find((p) => p.id === lp.id)
          // If the local pin was toggled within the last 3 seconds,
          // keep the local version so the toggle doesn't revert.
          if (local && local.enabled !== lp.enabled) return local
          return lp
        })
        return merged
      })
      setPinsLoading(false)
    })
    // If subscription returned null (db not available), stop loading.
    if (!unsub) {
      setPinsLoading(false)
    }
    return () => { unsub?.() }
  }, [activeUid])

  useEffect(() => {
    const urls: string[] = []
    if (userDoc?.photoURL) urls.push(userDoc.photoURL)
    for (const pin of pins) {
      if ('heroPhotoUrl' in pin && pin.heroPhotoUrl) urls.push(pin.heroPhotoUrl)
      for (const c of pin.content || []) {
        if (c.thumbnailUrl) urls.push(c.thumbnailUrl)
        if (c.mediaUrls) urls.push(...c.mediaUrls)
      }
    }
    if (urls.length > 0) preloadImages(urls)
  }, [pins, userDoc?.photoURL])

  useEffect(() => {
    if (!userDoc?.uid || impersonating) return
    const lastPing = sessionStorage.getItem('reelst_last_active')
    if (lastPing && Date.now() - Number(lastPing) < 300000) return
    sessionStorage.setItem('reelst_last_active', String(Date.now()))
    import('@/lib/firestore').then(({ updateUserDoc }) =>
      updateUserDoc(userDoc.uid, { lastActiveAt: new Date() } as any).catch(() => {})
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc?.uid])

  const handleTogglePin = useCallback(async (pinId: string, enabled: boolean) => {
    // Activation goes through the setPinEnabled Cloud Function so the
    // per-tier active-pin cap is enforced server-side. Disabling can
    // happen via direct Firestore write (rules permit), but we route
    // both through the callable for a single code path.
    if (enabled) {
      // Cheap client-side pre-check so we can show the paywall sheet
      // without a network round trip when we're already over.
      const gate = canActivatePin(currentUser, pins)
      if (!gate.allowed) {
        setPaywall({ open: true, reason: gate.reason || '', upgradeTo: gate.upgradeTo })
        return
      }
    }
    // Optimistic local flip.
    setPins((prev) => prev.map((p) => p.id === pinId ? { ...p, enabled } : p))
    try {
      const { setPinEnabled } = await import('@/lib/firestore')
      await setPinEnabled(pinId, enabled)
    } catch (err: any) {
      // Server cap check rejected — roll back optimistic update and
      // surface the paywall.
      setPins((prev) => prev.map((p) => p.id === pinId ? { ...p, enabled: !enabled } : p))
      const reason = err?.message || 'Could not update pin.'
      const upgradeTo = err?.details?.upgradeTo as 'pro' | undefined
      setPaywall({ open: true, reason, upgradeTo })
    }
  }, [currentUser, pins])

  const handleDeletePin = useCallback(async (pinId: string) => {
    const pin = pins.find((p) => p.id === pinId)
    if (!pin) return
    // Snapshot for rollback. Archive is the user-facing action; if it
    // fails we restore the pin to the list and surface the failure.
    const prevIndex = pins.findIndex((p) => p.id === pinId)
    setPins((prev) => prev.filter((p) => p.id !== pinId))
    setShowDeleteConfirm(null)
    setShowPinActions(null)
    try {
      const { archivePin, createContent } = await import('@/lib/firestore')
      await archivePin(pinId)
      // Best-effort: unlink content items into the standalone library.
      // These are not user-blocking; if any individual write fails we
      // log but don't roll back the archive (it succeeded).
      if (pin.content?.length && userDoc?.uid) {
        for (const item of pin.content) {
          try {
            await createContent({
              agentId: userDoc.uid,
              pinId: null,
              type: item.type,
              mediaUrl: item.mediaUrl,
              ...(item.mediaUrls ? { mediaUrls: item.mediaUrls } : {}),
              thumbnailUrl: item.thumbnailUrl,
              caption: item.caption,
              ...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
              ...(item.aspect ? { aspect: item.aspect } : {}),
              ...(item.duration != null ? { duration: item.duration } : {}),
              publishAt: null,
            })
          } catch (err) {
            console.warn('[handleDeletePin] failed to unlink content item:', item.id, err)
          }
        }
      }
    } catch (err) {
      console.error('[handleDeletePin] archivePin failed:', err)
      setPins((prev) => {
        const next = prev.slice()
        const insertAt = Math.min(prevIndex >= 0 ? prevIndex : next.length, next.length)
        next.splice(insertAt, 0, pin)
        return next
      })
      showError("Couldn't archive that pin — try again in a moment.")
    }
  }, [pins, userDoc?.uid, showError])

  const handleSaveOpenHouse = useCallback(async (pinId: string, openHouse: OpenHouse | null) => {
    const prevPin = pins.find((p) => p.id === pinId)
    const prevOpenHouse = prevPin && prevPin.type === 'for_sale' ? prevPin.openHouse ?? null : null
    setPins((prev) => prev.map((p) => (p.id === pinId && p.type === 'for_sale' ? { ...p, openHouse } : p)))
    try {
      const { updatePin } = await import('@/lib/firestore')
      await updatePin(pinId, { openHouse })
    } catch (err) {
      console.error('[handleSaveOpenHouse] updatePin failed:', err)
      setPins((prev) => prev.map((p) => (p.id === pinId && p.type === 'for_sale' ? { ...p, openHouse: prevOpenHouse } : p)))
      showError("Couldn't save the open house — try again.")
    }
  }, [pins, showError])

  // Aggregate over all pins. `taps` here is the new top-level "Taps"
  // stat (sum of pin opens). The legacy `pin.views` field is no
  // longer surfaced at agent-level — `views` (profile visits) is
  // sourced from the events collection below.
  const stats = useMemo(() => {
    let taps = 0, saves = 0
    pins.forEach((p) => { taps += p.taps; saves += p.saves })
    return { taps, saves, pins: pins.length }
  }, [pins])

  // My Pins tab shows only the user-visible set: enabled + non-archived.
  // Insights uses the full `pins` array so analytics don't shrink when
  // a pin is toggled off or archived.
  const displayPins = useMemo(
    () => pins.filter((p) => p.enabled && (p as any).status !== 'archived'),
    [pins],
  )

  // Last 30 days of analytics events for this agent — feeds the
  // weekly chart toggle. Only fetched on Pro+ tiers (see useEffect
  // below). The lifetime "Visits" stat card reads `profileVisits`
  // off the user doc directly (incremented by the trackProfileVisit
  // Cloud Function), so it doesn't need this dataset.
  const [weeklyEvents, setWeeklyEvents] = useState<any[]>([])
  const [chartMetric, setChartMetric] = useState<'profile_visit' | 'tap'>('profile_visit')
  // 7 columns ending YESTERDAY (today excluded) — gives a clean
  // "completed days" view since today's data is still incoming.
  const chartData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const result: { label: string; value: number }[] = []
    for (let i = 7; i >= 1; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const count = weeklyEvents.filter((e) => e.type === chartMetric && e.date === dateStr).length
      result.push({ label: dayNames[d.getDay()], value: count })
    }
    return result
  }, [weeklyEvents, chartMetric])

  const confirmSignOut = async () => {
    setShowSignOutConfirm(false)
    try {
      const { auth: fbAuth } = await import('@/config/firebase')
      if (fbAuth) {
        const { signOut } = await import('firebase/auth')
        await signOut(fbAuth)
      }
    } catch (e) {
      console.warn('[signout] firebase signOut failed:', e)
    }
    setUserDoc(null)
    navigate('/')
  }
  const requestSignOut = () => setShowSignOutConfirm(true)

  const handleSharePlot = async () => {
    const url = `https://reel.st/${activeUser?.username || ''}`
    try { await navigator.share({ title: 'My Reelst', url }) }
    catch { navigator.clipboard.writeText(url) }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://reel.st/${activeUser?.username || ''}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddPlatform = (platformId: string, username: string) => {
    if (!activeUser || !username.trim()) return
    const existing = activeUser.platforms.find((p: Platform) => p.id === platformId)
    const platforms: Platform[] = existing
      ? activeUser.platforms.map((p: Platform) => p.id === platformId ? { ...p, username: username.trim() } : p)
      : [...activeUser.platforms, { id: platformId, username: username.trim() }]
    const updated = { ...activeUser, platforms }
    setUserDoc(updated)
    import('@/lib/firestore').then(({ updateUserDoc }) => updateUserDoc(activeUser.uid, { platforms }).catch(() => {}))
  }

  const handleRemovePlatform = (platformId: string) => {
    if (!activeUser) return
    const platforms = activeUser.platforms.filter((p: Platform) => p.id !== platformId)
    setUserDoc({ ...activeUser, platforms })
    import('@/lib/firestore').then(({ updateUserDoc }) => updateUserDoc(activeUser.uid, { platforms }).catch(() => {}))
  }

  const activeUser = impersonating || currentUser
  const profileUrl = `reel.st/${activeUser?.username || 'you'}`

  // Only fetch when (a) the user is actually viewing Insights, and
  // (b) their tier unlocks advanced analytics. Free users see a blurred
  // paywall — pulling 7 days of real events for them would burn reads
  // and put real numbers in their DOM behind the blur.
  useEffect(() => {
    if (!activeUser?.uid) return
    if (activeTab !== 'insights') return
    if (!hasFeature(activeUser, 'advancedAnalytics')) return
    // 30-day window — chart only renders the last 7 (today-7 → today-1).
    // The top "Visits" stat card reads the lifetime `profileVisits`
    // counter from the user doc, so it doesn't depend on this window.
    import('@/lib/firestore').then(({ getAgentEvents }) =>
      getAgentEvents(activeUser.uid, 30).then(setWeeklyEvents).catch(() => {})
    )
  }, [activeUser, activeTab])

  // ── Property-data pending changes (Rentcast sync diffs) ──
  // Live subscription so the modal disappears immediately when a
  // change is approved/rejected on another device. Auto-opens the
  // modal once per session per agent — sessionStorage tracks dismiss.
  useEffect(() => {
    if (!activeUser?.uid) return
    const unsub = subscribeToAgentPendingChanges(activeUser.uid, (changes) => {
      setPendingChanges(changes)
    })
    return () => { unsub?.() }
  }, [activeUser?.uid])

  // Live subscriber count — drives the dashboard's primary growth stat.
  useEffect(() => {
    if (!activeUser?.uid) return
    const unsub = subscribeToAgentSubscriberCount(activeUser.uid, setSubscriberCount)
    return () => { unsub?.() }
  }, [activeUser?.uid])

  // Live wave count — Insights tab surfaces it next to Saves.
  useEffect(() => {
    if (!activeUser?.uid) return
    let unsubWaves: (() => void) | null = null
    import('@/lib/firestore').then(({ subscribeToAgentWaves }) => {
      unsubWaves = subscribeToAgentWaves(activeUser.uid, (waves) => setWaveCount(waves.length)) || null
    })
    return () => { unsubWaves?.() }
  }, [activeUser?.uid])

  useEffect(() => {
    if (!activeUser?.uid || pendingChanges.length === 0) return
    const dismissKey = `reelst_pending_dismissed_${activeUser.uid}`
    if (sessionStorage.getItem(dismissKey) === '1') return
    setPendingModalOpen(true)
  }, [activeUser?.uid, pendingChanges.length])

  const closePendingModal = useCallback(() => {
    if (activeUser?.uid) {
      sessionStorage.setItem(`reelst_pending_dismissed_${activeUser.uid}`, '1')
    }
    setPendingModalOpen(false)
  }, [activeUser?.uid])

  const closeSinglePending = useCallback(() => setSinglePendingPinId(null), [])
  const openSinglePending = useCallback((pinId: string) => setSinglePendingPinId(pinId), [])

  // Compute real setup percent to match checklist (fix mismatch)
  const computedSetupPercent = useMemo(() => {
    if (!activeUser) return 0
    const items = [
      { weight: 10, check: !!activeUser.username },
      { weight: 15, check: !!activeUser.photoURL },
      { weight: 10, check: !!activeUser.displayName && activeUser.displayName.length > 0 },
      { weight: 10, check: !!activeUser.bio && activeUser.bio.length > 0 },
      { weight: 15, check: activeUser.platforms.length > 0 },
      { weight: 10, check: !!activeUser.licenseNumber },
      { weight: 20, check: displayPins.length >= 1 },
      { weight: 10, check: displayPins.length >= 3 },
    ]
    return items.filter((i) => i.check).reduce((s, i) => s + i.weight, 0)
  }, [activeUser, pins])

  useEffect(() => {
    // Only bounce to /sign-in if Firebase Auth is ALSO empty. If firebaseUser
    // is set, the user is authenticated — their Firestore doc may just be
    // slow/missing. Bouncing them back to /sign-in creates an infinite loop
    // where sign-in succeeds, Dashboard mounts, sees no userDoc, kicks back.
    if (!activeUser && !firebaseUser && !loading && initialized) {
      const t = setTimeout(() => {
        const { userDoc: latest, firebaseUser: fu } = useAuthStore.getState()
        if (!latest && !fu) navigate('/sign-in')
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [activeUser, firebaseUser, loading, initialized, navigate])

  if (!activeUser) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tangerine/30 border-t-tangerine rounded-full animate-spin" />
      </div>
    )
  }

  // ── Tab content (shared between mobile and desktop) ──

  const renderTabContent = () => (
    <div>
        {impersonating && (
          <div className={`flex items-center justify-between gap-3 bg-live-red/10 border-b border-live-red/20 ${isDesktop ? 'px-6 py-2.5' : 'px-5 py-2.5'}`}>
            <p className="text-[12px] font-semibold text-live-red">
              Viewing as <span className="font-bold">@{impersonating.username || impersonating.displayName}</span>
            </p>
            <button onClick={() => { setImpersonating(null); setActiveTab('admin') }}
              className="text-[11px] font-bold text-live-red bg-live-red/15 px-3 py-1 rounded-full cursor-pointer hover:bg-live-red/25 transition-colors">
              Stop
            </button>
          </div>
        )}

        {/* ═══ MY PLOT ═══ */}
        {activeTab === 'reelst' && (
          <div className={isDesktop ? 'space-y-5' : 'px-5 py-5 space-y-4'}>
            <TabHeader
              icon={<MapPin weight="bold" size={18} />}
              title="My Pins"
              subtitle="Listings, sold homes, and spotlights on your map"
            />

            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-ink">Your Pins</h3>
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => navigate('/dashboard/pin/new')}>Add Pin</Button>
            </div>

            {pinsLoading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="bg-cream rounded-[16px] p-4 animate-pulse">
                    <div className="h-32 bg-pearl rounded-[12px] mb-3" />
                    <div className="h-3 w-2/3 bg-pearl rounded mb-2" />
                    <div className="h-3 w-1/2 bg-pearl rounded" />
                  </div>
                ))}
              </div>
            ) : displayPins.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-cream rounded-[20px] p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-tangerine-soft mx-auto mb-4 flex items-center justify-center">
                  <MapPin size={28} className="text-tangerine" />
                </div>
                <h3 className="text-[18px] font-bold text-ink mb-1">Drop your first pin</h3>
                <p className="text-[14px] text-smoke mb-5">Add a listing, spotlight, or open house to your map.</p>
                <Button variant="primary" size="lg" icon={<Plus size={18} />} onClick={() => navigate('/dashboard/pin/new')}>Create Pin</Button>
              </motion.div>
            ) : (
              <div className={isDesktop ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-2 gap-3'}>
                {displayPins.map((pin) => (
                  <div key={pin.id} className="relative">
                    <PinCard
                      pin={pin}
                      variant="manage"
                      dark={false}
                      onToggle={(enabled) => handleTogglePin(pin.id, enabled)}
                      onMore={() => setShowPinActions(showPinActions?.id === pin.id ? null : pin)}
                      onClick={() => setEditPin(pin)}
                      hasPendingChange={pendingChanges.some((c) => c.pinId === pin.id)}
                      onPendingChangeClick={() => openSinglePending(pin.id)}
                    />

                    {/* Desktop popover menu — anchored to the card */}
                    {isDesktop && showPinActions?.id === pin.id && (
                      <>
                        <div className="fixed inset-0 z-[49]" onClick={() => setShowPinActions(null)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                          className="absolute top-2 right-2 z-[50] w-[220px] bg-obsidian rounded-[16px] shadow-2xl border border-border-dark overflow-hidden"
                        >
                          <div className="py-1.5">
                            {[
                              { icon: Edit3, label: 'Edit Details', color: 'text-mist', onClick: () => { setEditPin(pin); setShowPinActions(null) } },
                              { icon: Film, label: 'Add Content', color: 'text-tangerine', onClick: () => { navigate(`/dashboard/pin/${pin.id}/edit?tab=content`); setShowPinActions(null) } },
                              { icon: QrCode, label: 'Get QR Code', color: 'text-tangerine', onClick: () => { setQrPin(pin); setShowPinActions(null) } },
                              ...(pin.type === 'for_sale' ? [{ icon: CalendarDays, label: 'Open House', color: 'text-open-amber', onClick: () => {
                                if (!hasFeature(activeUser, 'openHouses')) { setPaywall({ open: true, reason: 'Open house scheduling is a Pro feature.', upgradeTo: 'pro' }); setShowPinActions(null); return }
                                setOpenHousePin(pin as ForSalePin); setShowPinActions(null)
                              } }] : []),
                              { icon: EyeOff, label: pin.enabled ? 'Hide from Map' : 'Show on Map', color: 'text-mist', onClick: () => { handleTogglePin(pin.id, !pin.enabled); setShowPinActions(null) } },
                              { icon: Trash2, label: 'Archive', color: 'text-live-red', onClick: () => { setShowDeleteConfirm(pin); setShowPinActions(null) } },
                            ].map((item, i) => (
                              <button
                                key={i}
                                onClick={item.onClick}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left cursor-pointer hover:bg-white/5 transition-colors"
                              >
                                <item.icon size={15} className={item.color} />
                                <span className={`text-[13px] font-medium ${item.color === 'text-live-red' ? 'text-live-red' : 'text-white'}`}>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ INSIGHTS ═══ */}
        {activeTab === 'insights' && (
          <div className={isDesktop ? 'space-y-5' : 'px-5 py-5 space-y-4'}>
            <TabHeader
              icon={<BarChart3 weight="bold" size={18} />}
              title="Insights"
              subtitle="How your Reelst is performing"
            />
            {/* Basic stats — visible to all tiers */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Visits" value={activeUser.profileVisits || 0} icon={<Eye size={18} />} format="compact" tooltip="Lifetime count of profile visits to your Reelst" />
              <StatCard label="Taps" value={stats.taps} icon={<MousePointerClick size={18} />} color="#3B82F6" format="compact" tooltip="Times someone tapped a pin or content card to open it" />
              <StatCard label="Saves" value={subscriberCount} icon={<Heart size={18} />} color="#FF6B6B" format="compact" tooltip="Buyers who saved you for the weekly digest" />
              <StatCard label="Waves" value={waveCount} icon={<Hand size={18} />} color="#FF8552" format="compact" tooltip="Buyers who waved with a question on a listing" />
            </div>
            <InsightsChart
              data={chartData}
              title={chartMetric === 'profile_visit' ? 'Profile Visits' : 'Taps'}
              subtitle="Last 7 days"
              metricToggle={{
                value: chartMetric,
                onChange: (v) => setChartMetric(v as 'profile_visit' | 'tap'),
                options: [
                  { id: 'profile_visit', label: 'Profile Visits' },
                  { id: 'tap', label: 'Taps' },
                ],
              }}
            />

            {hasFeature(activeUser, 'advancedAnalytics') ? (
              <>
                <PinBreakdown pins={pins} />
                <ContentConversion pins={pins} />
                <SaveGrowth currentSaves={subscriberCount} agentId={activeUser.uid} />
                <TimeOfDay agentId={activeUser.uid} />
                <GeoHeatmap pins={pins} agentId={activeUser.uid} />
                {/* Audience Crossover — included with Pro analytics now
                    that Studio is gone. Anonymized competitive-set
                    insight powered by digestSubscriptions overlap. */}
                <SavedMapInsights pins={pins} agentId={activeUser.uid} />
              </>
            ) : (
              <div className="relative">
                <div className="blur-[6px] pointer-events-none select-none opacity-60 space-y-4">
                  <PinBreakdown pins={pins} />
                  <ContentConversion pins={pins} />
                  <InsightsChart data={[{ label: 'Mon', value: 12 }, { label: 'Tue', value: 18 }, { label: 'Wed', value: 8 }, { label: 'Thu', value: 25 }, { label: 'Fri', value: 15 }, { label: 'Sat', value: 20 }, { label: 'Sun', value: 10 }]} title="Saves over time" />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-warm-white/50 rounded-[18px]">
                  <p className="text-[16px] font-bold text-ink mb-1">Unlock full analytics</p>
                  <p className="text-[13px] text-smoke mb-4 text-center max-w-[280px]">Per-pin breakdown, visitor cities, peak hours, content stats, and more.</p>
                  <button
                    onClick={() => setPaywall({ open: true, reason: 'Advanced analytics is a Pro feature.', upgradeTo: 'pro' })}
                    className="brand-btn-flat h-11 px-6 rounded-full text-[14px] cursor-pointer inline-flex items-center gap-1.5"
                    style={{ fontWeight: 600, boxShadow: '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)' }}
                  >
                    Go Pro — $19/mo
                    <ArrowRight weight="bold" size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ INBOX ═══ */}
        {activeTab === 'inbox' && (
          <div className={isDesktop ? 'space-y-5' : 'px-5 py-5 space-y-4'}>
            <TabHeader
              icon={<Inbox weight="bold" size={18} />}
              title="Inbox"
              subtitle="Showing requests, saves, and waves"
            />
            {/* Prompt to enable notifications if not granted */}
            {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-tangerine/10 border border-tangerine/20 rounded-[16px] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-tangerine/15 flex items-center justify-center shrink-0">
                  <Bell size={16} className="text-tangerine" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-ink">Get notified about new requests</p>
                  <p className="text-[11px] text-smoke mt-0.5">Enable push notifications so you never miss an update.</p>
                  <button onClick={() => setActiveTab('settings')} className="text-[12px] font-bold text-tangerine mt-2 cursor-pointer hover:underline">
                    Go to Settings
                  </button>
                </div>
              </motion.div>
            )}
            <ShowingInbox agentId={activeUser.uid} />
          </div>
        )}

        {/* ═══ CONTENT LIBRARY ═══ */}
        {activeTab === 'content' && (
        <div className={isDesktop ? 'space-y-5' : 'px-5 py-5 space-y-4'}>
          <TabHeader
            icon={<Film weight="bold" size={18} />}
            title="Content"
            subtitle="Reels, photos, and listing media"
          />
          <ContentLibrary
            pins={displayPins}
            agentId={activeUser.uid}
            isDesktop={isDesktop}
            onNavigateUpload={() => navigate('/dashboard/pin/new?tab=content')}
            onCaptionSaved={(pinId, contentId, caption) => {
              setPins((prev) => prev.map((p) => {
                if (p.id !== pinId) return p
                return { ...p, content: p.content.map((c) => c.id === contentId ? { ...c, caption } : c) } as typeof p
              }))
            }}
            onEditContent={(content, pin) => {
              navigate('/dashboard/content/edit', { state: { content, pin } })
            }}
            onArchiveContent={(contentId, pinId) => {
              const pin = pins.find((p) => p.id === pinId)
              if (!pin) return
              const updated = { ...pin, content: pin.content.filter((c) => c.id !== contentId) }
              setPins((prev) => prev.map((p) => p.id === pinId ? updated as Pin : p))
              import('@/lib/firestore').then(({ updatePin }) =>
                updatePin(pinId, { content: updated.content }),
              ).catch(() => {})
            }}
            onAssignContent={(contentId, fromPinId, toPinId, contentItem) => {
              if (fromPinId === toPinId) return
              const toPin = pins.find((p) => p.id === toPinId)

              if (!fromPinId && contentItem) {
                // Re-linking unlinked content — ContentLibrary already handled Firestore update
                // Update local pins state to reflect the content on the target pin
                if (!toPin) return
                setPins((prev) => prev.map((p) =>
                  p.id === toPinId ? { ...p, content: [...p.content, contentItem] } as Pin : p
                ))
                return
              }

              // Move content from one pin to another
              const fromPin = pins.find((p) => p.id === fromPinId)
              if (!fromPin || !toPin) return
              const movedItem = fromPin.content.find((c) => c.id === contentId)
              if (!movedItem) return
              setPins((prev) => prev.map((p) => {
                if (p.id === fromPinId) return { ...p, content: p.content.filter((c) => c.id !== contentId) } as Pin
                if (p.id === toPinId) return { ...p, content: [...p.content, movedItem] } as Pin
                return p
              }))
              import('@/lib/firestore').then(({ updatePin }) => {
                updatePin(fromPinId, { content: fromPin.content.filter((c) => c.id !== contentId) }).catch(() => {})
                updatePin(toPinId, { content: [...toPin.content, movedItem] }).catch(() => {})
              })
            }}
          />
        </div>
        )}

        {/* ═══ STYLE ═══ — agent profile aesthetic editor.
             Live-edits the user doc; the preview iframe re-fetches
             so changes show up the moment Firestore acks. */}
        {activeTab === 'style' && (
          <StyleTab
            user={activeUser}
            isDesktop={isDesktop}
            onUpdateUser={async (patch) => {
              if (!activeUser?.uid) return
              setUserDoc({ ...activeUser, ...patch })
              const { updateUserDoc } = await import('@/lib/firestore')
              updateUserDoc(activeUser.uid, patch).catch(() => {})
            }}
            onOpenEditProfile={() => {
              setEditProfileData({ displayName: activeUser.displayName || '', bio: activeUser.bio || '', photoURL: activeUser.photoURL || '' })
              setShowEditProfile(true)
            }}
            onOpenEditBrokerage={() => {
              setBrokerageDraft(activeUser.brokerage || '')
              setShowEditBrokerage(true)
            }}
            onOpenAddPlatform={() => setShowAddPlatform(true)}
            onRemovePlatform={handleRemovePlatform}
          />
        )}

        {/* ═══ SETTINGS ═══ */}
        {activeTab === 'settings' && (
          <div className={isDesktop ? 'space-y-2' : 'px-5 py-5 space-y-2'}>
            <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1">Account</p>
            {[
              { icon: User, label: 'Edit Profile', desc: 'Name, bio, photo', onClick: () => { setEditProfileData({ displayName: activeUser.displayName || '', bio: activeUser.bio || '', photoURL: activeUser.photoURL || '' }); setShowEditProfile(true) } },
              { icon: Building, label: 'Brokerage / Company', desc: activeUser.brokerage || 'Add to amplify your About page', onClick: () => setShowEditBrokerage(true) },
              { icon: Link2, label: 'Social Links', desc: 'Connected platforms', onClick: () => setShowAddPlatform(true) },
              { icon: Shield, label: 'License Verification', desc: activeUser.verificationStatus === 'verified' ? `Verified · ${activeUser.licenseState} #${activeUser.licenseNumber}` : activeUser.verificationStatus === 'pending' ? 'Pending review' : 'Not verified', onClick: () => {} },
            ].map((item, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.98 }}
                onClick={item.onClick}
                className="w-full flex items-center gap-3.5 bg-cream rounded-[14px] p-4 text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-[12px] bg-pearl flex items-center justify-center"><item.icon size={18} className="text-graphite" /></div>
                <div className="flex-1">
                  <span className="text-[15px] font-medium text-ink block">{item.label}</span>
                  <span className="text-[12px] text-smoke">{item.desc}</span>
                </div>
                <ChevronRight size={16} className="text-ash" />
              </motion.button>
            ))}

            <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1 pt-4">Notifications</p>
            <NotificationSettings />

            <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1 pt-4">Appearance</p>
            <AppearancePicker
              preference={themePreference}
              resolved={resolvedTheme}
              onChange={setThemePreference}
            />

            <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1 pt-4">Plan</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/pricing')}
              className="w-full flex items-center gap-3.5 bg-cream rounded-[14px] p-4 text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-[12px] bg-pearl flex items-center justify-center"><CreditCard size={18} className="text-graphite" /></div>
              <div className="flex-1">
                <span className="text-[15px] font-medium text-ink block">Subscription</span>
                <span className="text-[12px] text-smoke">{getUserTier(activeUser) === 'pro' ? 'Pro plan · $19/mo' : 'Free plan'}</span>
              </div>
              <Badge>{getUserTier(activeUser) === 'pro' ? 'Pro' : 'Free'}</Badge>
            </motion.button>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" size="lg" fullWidth icon={<Share2 size={16} />} onClick={handleSharePlot}>
                Share Reelst
              </Button>
            </div>

            <div className="pt-2">
              <Button variant="danger" size="lg" fullWidth icon={<LogOut size={16} />} onClick={requestSignOut}>Sign out</Button>
            </div>

            <p className="text-[12px] font-semibold text-live-red/60 uppercase tracking-wider px-1 pb-1 pt-6">Danger Zone</p>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="w-full text-left px-4 py-3 rounded-[14px] border border-live-red/15 text-[13px] text-live-red/70 hover:bg-live-red/5 cursor-pointer transition-colors"
            >
              Delete my account
            </button>
            <div className="flex items-center justify-center gap-3 pt-4">
              <button className="text-[12px] text-ash">Privacy</button>
              <span className="text-ash text-[10px]">&middot;</span>
              <button className="text-[12px] text-ash">Terms</button>
              <span className="text-ash text-[10px]">&middot;</span>
              <span className="text-[12px] text-ash">Reelst v1.0.0</span>
            </div>

            {amAdmin && !impersonating && (
              <>
                <p className="text-[12px] font-semibold text-live-red uppercase tracking-wider px-1 pb-1 pt-6">Admin</p>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('admin')}
                  className="w-full flex items-center gap-3.5 bg-live-red/8 border border-live-red/15 rounded-[14px] p-4 text-left cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-[12px] bg-live-red/15 flex items-center justify-center"><Shield size={18} className="text-live-red" /></div>
                  <div className="flex-1">
                    <span className="text-[15px] font-medium text-ink block">Admin Panel</span>
                    <span className="text-[12px] text-smoke">Impersonate, gift subs, user lookup</span>
                  </div>
                  <ChevronRight size={16} className="text-ash" />
                </motion.button>
              </>
            )}
          </div>
        )}

        {activeTab === 'admin' && amAdmin && (
          <div className={isDesktop ? 'space-y-5' : 'px-5 py-5 space-y-4'}>
            <AdminPanel onImpersonate={(user) => { setImpersonating(user); setActiveTab('reelst') }} />
          </div>
        )}
    </div>
  )

  // ── Shared sheets (bottom sheets for mobile, modals for desktop platform connect) ──
  const renderSheets = () => (
    <>
      {/* Transient error banner — surfaces silent Firestore-write
          failures from optimistic handlers (delete pin, save open
          house, etc.) instead of leaving the UI desynced. */}
      <AnimatePresence>
        {errorBanner && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-full bg-live-red text-white shadow-xl flex items-center gap-2 max-w-[90vw]"
            style={{ fontFamily: 'var(--font-humanist)', fontSize: '13.5px', fontWeight: 500 }}
            onClick={() => setErrorBanner(null)}
          >
            <AlertTriangle size={15} />
            <span>{errorBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <SetupChecklist isOpen={showSetup} onClose={() => setShowSetup(false)} user={activeUser} pinCount={displayPins.length} />

      {/* Brokerage editor — desktop: centered modal (matches Edit
          Profile pattern), mobile: dark bottom sheet. Same save
          handler in both layouts; only chrome differs. */}
      {(() => {
        const saveBrokerage = async () => {
          if (!activeUser?.uid) return
          setSavingBrokerage(true)
          try {
            const trimmed = brokerageDraft.trim()
            const { updateUserDoc } = await import('@/lib/firestore')
            await updateUserDoc(activeUser.uid, { brokerage: trimmed || null })
            setUserDoc({ ...activeUser, brokerage: trimmed || null })
            setShowEditBrokerage(false)
            setBrokerageDraft('')
          } catch (err) {
            console.warn('[brokerage] save failed:', err)
            showError("Couldn't save brokerage — try again.")
          } finally {
            setSavingBrokerage(false)
          }
        }
        const cancel = () => { setShowEditBrokerage(false); setBrokerageDraft('') }
        const currentValue = showEditBrokerage ? brokerageDraft || activeUser.brokerage || '' : ''
        return isDesktop ? (
          <AnimatePresence>
            {showEditBrokerage && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200] bg-black/50" onClick={cancel} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 20 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-48px)] max-w-[440px] bg-warm-white rounded-[22px] shadow-2xl border border-border-light overflow-hidden"
                >
                  <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <h2 className="text-[18px] font-bold text-ink">Brokerage / Company</h2>
                    <button onClick={cancel} className="w-8 h-8 rounded-full bg-cream flex items-center justify-center cursor-pointer hover:bg-pearl transition-colors">
                      <X size={16} className="text-smoke" />
                    </button>
                  </div>
                  <div className="px-6 pb-6 space-y-4" style={{ fontFamily: 'var(--font-humanist)' }}>
                    <p className="text-[13.5px] text-smoke" style={{ lineHeight: 1.5 }}>
                      Shows up on your About tab and helps buyers know who you work with. Leave blank if you're independent.
                    </p>
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => setBrokerageDraft(e.target.value)}
                      onFocus={() => { if (!brokerageDraft) setBrokerageDraft(activeUser.brokerage || '') }}
                      placeholder="e.g. Compass · Coral Gables"
                      className="w-full h-12 px-4 rounded-[14px] bg-cream border border-border-light text-[15px] text-ink placeholder:text-ash outline-none focus:border-tangerine/40"
                    />
                    <div className="flex gap-2.5 pt-1">
                      <Button variant="secondary" size="lg" fullWidth onClick={cancel}>Cancel</Button>
                      <Button variant="primary" size="lg" fullWidth loading={savingBrokerage} onClick={saveBrokerage}>Save</Button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        ) : (
          <DarkBottomSheet
            isOpen={showEditBrokerage}
            onClose={cancel}
            title="Brokerage / Company"
          >
            <div className="px-5 pb-8 space-y-4" style={{ fontFamily: 'var(--font-humanist)' }}>
              <p className="text-[13.5px] text-mist" style={{ lineHeight: 1.5 }}>
                Shows up on your About tab and helps buyers know who you work with. Leave blank if you're independent.
              </p>
              <input
                type="text"
                value={currentValue}
                onChange={(e) => setBrokerageDraft(e.target.value)}
                onFocus={() => { if (!brokerageDraft) setBrokerageDraft(activeUser.brokerage || '') }}
                placeholder="e.g. Compass · Coral Gables"
                className="w-full h-12 px-4 rounded-[14px] bg-white/8 border border-white/10 text-[15px] text-white placeholder:text-ghost outline-none focus:border-tangerine/40"
              />
              <div className="flex gap-2.5">
                <Button variant="secondary" size="lg" fullWidth onClick={cancel}>Cancel</Button>
                <Button variant="primary" size="lg" fullWidth loading={savingBrokerage} onClick={saveBrokerage}>Save</Button>
              </div>
            </div>
          </DarkBottomSheet>
        )
      })()}

      {/* Bulk pending-changes modal — auto-opens on first dashboard
          load when there are diffs to review, dismissable per session. */}
      <PendingChangesModal
        isOpen={pendingModalOpen}
        onClose={closePendingModal}
        changes={pendingChanges}
        pins={pins}
        isDesktop={isDesktop}
      />

      {/* Single-pin re-opener — used when the agent taps a pin's
          pending-change badge after dismissing the bulk modal. */}
      <AnimatePresence>
        {singlePendingPinId && (() => {
          const change = pendingChanges.find((c) => c.pinId === singlePendingPinId)
          if (!change) return null
          const pin = pins.find((p) => p.id === singlePendingPinId)
          return (
            <motion.div
              key="single-pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[150] flex items-center justify-center px-4"
              style={{ background: 'rgba(10,14,23,0.55)' }}
              onClick={closeSinglePending}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px]"
                style={{ fontFamily: 'var(--font-humanist)' }}
              >
                <PendingChangeCard
                  change={change}
                  pin={pin}
                  busy={false}
                  onApprove={async () => {
                    const { approvePendingChange } = await import('@/lib/firestore')
                    await approvePendingChange(change).catch(() => {})
                    closeSinglePending()
                  }}
                  onReject={async () => {
                    const { rejectPendingChange } = await import('@/lib/firestore')
                    await rejectPendingChange(change).catch(() => {})
                    closeSinglePending()
                  }}
                />
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Pin actions — mobile only (desktop uses inline popover) */}
      <DarkBottomSheet isOpen={!isDesktop && !!showPinActions} onClose={() => setShowPinActions(null)} title={showPinActions?.address}>
        <div className="px-5 pb-8 space-y-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditPin(showPinActions); setShowPinActions(null) }}
            className="w-full flex items-center gap-3 p-3.5 rounded-[14px] bg-slate text-left">
            <Edit3 size={18} className="text-mist" />
            <span className="text-[15px] font-medium text-white">Edit Details</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { navigate(`/dashboard/pin/${showPinActions?.id}/edit?tab=content`); setShowPinActions(null) }}
            className="w-full flex items-center gap-3 p-3.5 rounded-[14px] bg-slate text-left">
            <Film size={18} className="text-tangerine" />
            <span className="text-[15px] font-medium text-white">Add Content</span>
            <span className="text-[11px] text-ghost ml-auto">{showPinActions?.content?.length || 0} items</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setQrPin(showPinActions); setShowPinActions(null) }}
            className="w-full flex items-center gap-3 p-3.5 rounded-[14px] bg-slate text-left">
            <QrCode size={18} className="text-tangerine" />
            <span className="text-[15px] font-medium text-white">Get QR Code</span>
          </motion.button>
          {showPinActions?.type === 'for_sale' && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setOpenHousePin(showPinActions as ForSalePin); setShowPinActions(null) }}
              className="w-full flex items-center gap-3 p-3.5 rounded-[14px] bg-slate text-left">
              <CalendarDays size={18} className="text-open-amber" />
              <span className="text-[15px] font-medium text-white">Schedule Open House</span>
              {(showPinActions as ForSalePin).openHouse?.sessions?.length ? (
                <span className="text-[10px] font-bold text-open-amber bg-open-amber/15 px-2 py-0.5 rounded-full ml-auto">
                  {(showPinActions as ForSalePin).openHouse!.sessions.length}
                </span>
              ) : null}
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (showPinActions) handleTogglePin(showPinActions.id, !showPinActions.enabled); setShowPinActions(null) }}
            className="w-full flex items-center gap-3 p-3.5 rounded-[14px] bg-slate text-left">
            <EyeOff size={18} className="text-mist" />
            <span className="text-[15px] font-medium text-white">{showPinActions?.enabled ? 'Hide from Map' : 'Show on Map'}</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setShowDeleteConfirm(showPinActions); setShowPinActions(null) }}
            className="w-full flex items-center gap-3 p-3.5 rounded-[14px] bg-live-red/10 text-left">
            <Trash2 size={18} className="text-live-red" />
            <span className="text-[15px] font-medium text-live-red">Archive Pin</span>
          </motion.button>
        </div>
      </DarkBottomSheet>

      {/* Delete confirm — modal on desktop, bottom sheet on mobile */}
      {isDesktop ? (
        <AnimatePresence>
          {showDeleteConfirm && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/50" onClick={() => setShowDeleteConfirm(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-48px)] max-w-[380px] bg-obsidian rounded-[22px] shadow-2xl border border-border-dark p-6 space-y-4"
              >
                <h2 className="text-[16px] text-white" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>Archive this pin?</h2>
                <p className="text-[14px] text-mist">This will remove the pin from your map. The data is kept and can be restored later.</p>
                <div className="flex gap-3">
                  <Button variant="glass" size="lg" fullWidth onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                  <Button variant="danger" size="lg" fullWidth onClick={() => showDeleteConfirm && handleDeletePin(showDeleteConfirm.id)}>Archive</Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        <DarkBottomSheet isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Archive this pin?">
          <div className="px-5 pb-8 space-y-4">
            <p className="text-[14px] text-mist">This will remove the pin from your map. The data is kept and can be restored later.</p>
            <div className="flex gap-3">
              <Button variant="glass" size="lg" fullWidth onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
              <Button variant="danger" size="lg" fullWidth onClick={() => showDeleteConfirm && handleDeletePin(showDeleteConfirm.id)}>Archive</Button>
            </div>
          </div>
        </DarkBottomSheet>
      )}

      <SocialLinksPanel isOpen={showAddPlatform} onClose={() => setShowAddPlatform(false)} onAdd={handleAddPlatform} onRemove={handleRemovePlatform} existingPlatforms={activeUser.platforms} isDesktop={isDesktop} />

      <PaywallPrompt
        isOpen={paywall.open}
        onClose={() => setPaywall({ open: false, reason: '' })}
        reason={paywall.reason}
        upgradeTo={paywall.upgradeTo}
      />

      {/* Sign out confirmation — desktop modal / mobile bottom sheet. */}
      <ConfirmDialog
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={confirmSignOut}
        title="Sign out?"
        message="You'll need to sign back in to access your dashboard."
        confirmLabel="Sign out"
        confirmVariant="danger"
      />

      {/* Delete account modal */}
      <AnimatePresence>
        {showDeleteAccount && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center" onClick={() => { setShowDeleteAccount(false); setDeleteInput('') }}>
            <div className="absolute inset-0 bg-black/60" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-warm-white rounded-2xl shadow-2xl w-[400px] max-w-[90vw] p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-live-red/10 flex items-center justify-center mx-auto">
                <AlertTriangle size={22} className="text-live-red" />
              </div>
              <h3 className="text-[18px] font-bold text-ink text-center">Delete your account?</h3>
              <p className="text-[13px] text-smoke text-center">
                This permanently deletes your profile, pins, content, saves, and all data. This cannot be undone.
              </p>
              <div>
                <label className="text-[12px] font-semibold text-smoke uppercase tracking-wider block mb-1.5">Type DELETE to confirm</label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-3 rounded-[12px] bg-cream border border-border-light text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-live-red/30"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" size="lg" fullWidth onClick={() => { setShowDeleteAccount(false); setDeleteInput('') }}>
                  Cancel
                </Button>
                <Button
                  variant="danger" size="lg" fullWidth
                  disabled={deleteInput !== 'DELETE'}
                  loading={deleting}
                  onClick={async () => {
                    if (deleteInput !== 'DELETE' || !realUser?.uid) return
                    setDeleting(true)
                    try {
                      const { deleteAccount } = await import('@/lib/firestore')
                      await deleteAccount(realUser.uid)
                      const { auth: fbAuth } = await import('@/config/firebase')
                      await fbAuth?.signOut()
                      navigate('/')
                    } catch (err) {
                      console.error('Delete failed:', err)
                      alert('Delete failed. Please try again.')
                    } finally {
                      setDeleting(false)
                    }
                  }}
                >
                  Delete forever
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <QRCodeModal
        isOpen={!!qrPin}
        onClose={() => setQrPin(null)}
        pin={qrPin}
        agent={activeUser}
      />

      <OpenHouseEditor
        isOpen={!!openHousePin}
        onClose={() => setOpenHousePin(null)}
        pin={openHousePin}
        onSave={handleSaveOpenHouse}
      />

      <PinEditModal
        isOpen={!!editPin}
        onClose={() => setEditPin(null)}
        pin={editPin}
        isDesktop={isDesktop}
        onAddContent={() => { if (editPin) { navigate(`/dashboard/pin/${editPin.id}/edit?tab=content`); setEditPin(null) } }}
        onArchiveContent={(contentId) => {
          if (!editPin) return
          const removedItem = editPin.content.find((c) => c.id === contentId)
          const updated = { ...editPin, content: editPin.content.filter((c) => c.id !== contentId) }
          setPins((prev) => prev.map((p) => p.id === editPin.id ? updated as Pin : p))
          setEditPin(updated as Pin)
          import('@/lib/firestore').then(async ({ updatePin, upsertContent }) => {
            await updatePin(editPin.id, { content: updated.content })
            if (removedItem && currentUser?.uid) {
              await upsertContent(contentId, {
                agentId: currentUser.uid,
                pinId: null,
                type: removedItem.type,
                mediaUrl: removedItem.mediaUrl,
                caption: removedItem.caption || '',
                ...(removedItem.thumbnailUrl ? { thumbnailUrl: removedItem.thumbnailUrl } : {}),
                ...(removedItem.mediaUrls ? { mediaUrls: removedItem.mediaUrls } : {}),
                ...(removedItem.mp4Url ? { mp4Url: removedItem.mp4Url } : {}),
                ...(removedItem.sourceUrl ? { sourceUrl: removedItem.sourceUrl } : {}),
                ...(removedItem.sourceUrls ? { sourceUrls: removedItem.sourceUrls } : {}),
                ...(removedItem.muxAssetId ? { muxAssetId: removedItem.muxAssetId } : {}),
                ...(removedItem.muxPlaybackId ? { muxPlaybackId: removedItem.muxPlaybackId } : {}),
                ...(removedItem.aspect ? { aspect: removedItem.aspect } : {}),
                status: removedItem.status || 'ready',
              } as any)
            }
          }).catch(() => {})
        }}
        onReorderContent={(contentIds) => {
          if (!editPin) return
          const reordered = contentIds.map((id) => editPin.content.find((c) => c.id === id)!).filter(Boolean)
          const updated = { ...editPin, content: reordered }
          setPins((prev) => prev.map((p) => p.id === editPin.id ? updated as Pin : p))
          setEditPin(updated as Pin)
          import('@/lib/firestore').then(({ updatePin }) => updatePin(editPin.id, { content: reordered })).catch(() => {})
        }}
        onPinUpdated={(updated) => {
          setPins((prev) => prev.map((p) => p.id === updated.id ? updated : p))
          setEditPin(updated)
        }}
      />

      {/* Hidden photo file input */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file || !activeUser?.uid) return
        // Validate size before doing any work.
        const storageMod = await import('@/lib/storage')
        try {
          storageMod.assertFileWithinLimit(file, storageMod.PHOTO_MAX_BYTES)
        } catch (err) {
          if (err instanceof storageMod.FileTooLargeError) {
            showError(err.message)
            return
          }
          throw err
        }
        // Show preview immediately, then upload in background.
        const localUrl = URL.createObjectURL(file)
        setEditProfileData((prev) => ({ ...prev, photoURL: localUrl }))
        try {
          const firebaseUrl = await storageMod.uploadFile({ path: storageMod.avatarPath(activeUser.uid), file })
          setEditProfileData((prev) => ({ ...prev, photoURL: firebaseUrl }))
          // Persist to Firestore so it survives page reload.
          const { updateUserDoc } = await import('@/lib/firestore')
          await updateUserDoc(activeUser.uid, { photoURL: firebaseUrl })
          setUserDoc({ ...activeUser, photoURL: firebaseUrl })
        } catch (err) {
          console.warn('Photo upload failed:', err)
          showError("Couldn't upload photo — try again.")
        }
      }} />

      {/* Edit Profile — desktop: modal, mobile: bottom sheet */}
      {isDesktop ? (
        <AnimatePresence>
          {showEditProfile && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/50" onClick={() => setShowEditProfile(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-48px)] max-w-[440px] bg-warm-white rounded-[22px] shadow-2xl border border-border-light overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                  <h2 className="text-[18px] font-bold text-ink">Edit Profile</h2>
                  <button onClick={() => setShowEditProfile(false)} className="w-8 h-8 rounded-full bg-cream flex items-center justify-center cursor-pointer hover:bg-pearl transition-colors">
                    <X size={16} className="text-smoke" />
                  </button>
                </div>
                <div className="px-6 pb-6">
                  <EditProfileContent data={editProfileData} setData={setEditProfileData} onPhoto={() => photoInputRef.current?.click()} onSave={() => {
                    const updates = { displayName: editProfileData.displayName.trim(), bio: editProfileData.bio.trim() }
                    setUserDoc({ ...activeUser, ...updates })
                    import('@/lib/firestore').then(({ updateUserDoc }) => updateUserDoc(activeUser.uid, updates).catch(() => {}))
                    setShowEditProfile(false)
                  }} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        <DarkBottomSheet isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} title="Edit Profile">
          <div className="px-5 pb-8">
            <EditProfileContent data={editProfileData} setData={setEditProfileData} onPhoto={() => photoInputRef.current?.click()} onSave={() => {
              const updates = { displayName: editProfileData.displayName.trim(), bio: editProfileData.bio.trim() }
              setUserDoc({ ...activeUser, ...updates })
              import('@/lib/firestore').then(({ updateUserDoc }) => updateUserDoc(activeUser.uid, updates).catch(() => {}))
              setShowEditProfile(false)
            }} dark />
          </div>
        </DarkBottomSheet>
      )}
    </>
  )

  // ═══════════════════════════════════════════
  // DESKTOP: Sidebar + Content + Preview
  // ═══════════════════════════════════════════
  if (isDesktop) {
    const NAV_ITEMS: { id: DashTab; label: string; icon: typeof MapPin }[] = [
      { id: 'reelst', label: 'My Pins', icon: MapPin },
      { id: 'content', label: 'Content', icon: Film },
      { id: 'style', label: 'Style', icon: Palette },
      { id: 'inbox', label: 'Inbox', icon: Inbox },
      { id: 'insights', label: 'Insights', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]

    return (
      <div className="h-screen flex bg-ivory overflow-hidden" style={{ fontFamily: 'var(--font-humanist)' }}>
        {/* ── Left Sidebar ── */}
        <aside className="w-[240px] shrink-0 border-r border-border-light flex flex-col" style={{ background: 'linear-gradient(180deg, var(--color-ivory) 0%, var(--color-cream) 100%)' }}>
          {/* Logo */}
          <div className="px-5 pt-6 pb-2">
            <div className="flex items-center gap-2.5">
              <img src="/reelst-logo.png" alt="Reelst" className="w-7 h-7" />
              <span className="text-[17px] text-ink" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>Reelst</span>
            </div>
          </div>

          {/* Agent card */}
          <div className="mx-4 mt-4 mb-5 p-3 rounded-2xl bg-warm-white border border-border-light">
            <div className="flex items-center gap-2.5">
              <Avatar src={activeUser.photoURL} name={activeUser.displayName || 'Agent'} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-ink truncate">{activeUser.displayName || 'Agent'}</p>
                <p className="text-[11px] text-smoke truncate">@{activeUser.username || 'you'}</p>
              </div>
            </div>
            {computedSetupPercent < 100 && (
              <button onClick={() => setShowSetup(true)} className="mt-3 w-full cursor-pointer">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-smoke uppercase tracking-wider">Setup</span>
                  <span className="text-[10px] font-bold text-tangerine">{computedSetupPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-pearl overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${computedSetupPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-tangerine to-ember"
                  />
                </div>
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); desktopScrollRef.current?.scrollTo(0, 0) }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer
                    transition-all duration-200
                    ${isActive
                      ? 'brand-surface'
                      : 'text-graphite hover:bg-warm-white'
                    }
                  `}
                >
                  <span className="relative">
                    <item.icon size={18} className={isActive ? 'text-white' : 'text-smoke'} />
                    {item.id === 'inbox' && inboxUnread > 0 && !isActive && (
                      <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-live-red text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                        {inboxUnread > 99 ? '99+' : inboxUnread}
                      </span>
                    )}
                  </span>
                  <span className={`text-[13px] flex-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                  {item.id === 'inbox' && inboxUnread > 0 && isActive && (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-white/25 text-white text-[10px] font-bold flex items-center justify-center px-1">
                      {inboxUnread > 99 ? '99+' : inboxUnread}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Bottom: Add Pin CTA */}
          <div className="px-4 pb-6">
            <button
              onClick={() => navigate('/dashboard/pin/new')}
              className="brand-btn-flat w-full h-11 px-4 rounded-full text-[13px] cursor-pointer inline-flex items-center justify-center gap-1.5"
              style={{ fontWeight: 600, boxShadow: '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)' }}
            >
              <Plus weight="bold" size={16} />
              <span>Add Pin</span>
            </button>
            <button
              onClick={requestSignOut}
              className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2 rounded-xl text-smoke text-[12px] font-medium cursor-pointer hover:text-ink transition-colors"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* ── Center Content ── */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="shrink-0 flex items-center justify-between px-8 h-[64px] border-b border-border-light bg-ivory">
            <h1 className="text-[20px] text-ink" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
              {activeTab === 'reelst' ? 'My Pins' : activeTab === 'insights' ? 'Insights' : activeTab === 'inbox' ? 'Inbox' : activeTab === 'content' ? 'Content' : activeTab === 'style' ? 'Style' : 'Settings'}
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-warm-white border border-border-light rounded-full pl-4 pr-1.5 py-1.5">
                <span className="text-[13px] text-smoke font-medium select-all">{profileUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="w-7 h-7 rounded-full bg-cream flex items-center justify-center cursor-pointer hover:bg-pearl transition-colors"
                >
                  {copied ? <Check size={13} className="text-sold-green" /> : <Copy size={13} className="text-smoke" />}
                </button>
              </div>
              <button
                onClick={() => activeUser.username && navigate(`/${activeUser.username}?preview=true`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-warm-white border border-border-light text-[13px] font-medium text-ink cursor-pointer hover:bg-cream transition-colors"
              >
                <ExternalLink size={14} className="text-smoke" />
                Preview
              </button>
            </div>
          </div>

          {/* Scrollable content area */}
          <div ref={desktopScrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-[760px] mx-auto px-8 py-6">
              {renderTabContent()}
            </div>
          </div>
        </main>

        {/* ── Right Preview Panel (Live iframe) ──
            Only shown on wide screens (≥1200px). Between mobile and
            this width, the dashboard keeps the sidebar + content
            layout but drops the preview to give content more room. */}
        {isWide && previewMounted && (
          <aside
            className="w-[300px] shrink-0 border-l border-border-light flex-col items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-pearl) 100%)',
              // Mounted on first Style-tab visit and stays in DOM after
              // — hidden on other tabs so the Mapbox map inside the
              // iframe doesn't re-init when the user toggles between
              // Style and other tabs.
              display: activeTab === 'style' ? 'flex' : 'none',
            }}
          >
            {activeUser.username ? (
              <>
                {/* Phone frame with live preview — scaled to fit */}
                <div className="relative">
                  <div className="w-[240px] rounded-[32px] bg-midnight shadow-2xl overflow-hidden" style={{ height: '480px' }}>
                    <iframe
                      ref={previewIframeRef}
                      src={`/${activeUser.username}?preview=true`}
                      className="border-0 origin-top-left"
                      style={{ pointerEvents: 'none', width: '375px', height: '750px', transform: 'scale(0.64)', transformOrigin: 'top left' }}
                      title="Profile preview"
                    />
                  </div>
                  {/* Reload button — bottom-right of phone frame so
                      it doesn't sit over the preview's header content
                      (avatar/name) and stays out of the way of where
                      the user's eye naturally lands when reviewing. */}
                  <button
                    onClick={handleReloadPreview}
                    disabled={previewReloading}
                    className={`absolute bottom-2 right-2 w-7 h-7 rounded-full bg-warm-white/90 shadow border border-border-light flex items-center justify-center transition-colors ${previewReloading ? 'text-tangerine cursor-not-allowed opacity-80' : 'text-smoke hover:text-ink cursor-pointer'}`}
                    title={previewReloading ? 'Reloading…' : 'Reload preview'}
                  >
                    <RefreshCw weight="bold" size={13} className={previewReloading ? 'animate-spin' : ''} />
                  </button>
                </div>

                <button
                  onClick={() => navigate(`/${activeUser.username}?preview=true`)}
                  className="mt-4 text-[12px] font-semibold text-tangerine cursor-pointer hover:underline"
                >
                  Open full preview
                </button>
              </>
            ) : (
              <div className="text-center px-6">
                <p className="text-[14px] font-semibold text-ink mb-1">Set up your username</p>
                <p className="text-[12px] text-smoke">Choose a username to see your live preview here.</p>
              </div>
            )}
          </aside>
        )}

        {renderSheets()}
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // MOBILE: Original layout (unchanged)
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-ivory pb-tab-safe" style={{ fontFamily: 'var(--font-humanist)' }}>
      {/* Header */}
      <div className="sticky top-0 z-[100] bg-ivory/95 backdrop-blur-xl border-b border-border-light">
        <div className="px-5 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)', paddingBottom: '12px' }}>
          <div className="flex items-center gap-3">
            <Avatar src={activeUser.photoURL} name={activeUser.displayName || 'Agent'} size={36} />
            <div>
              <p className="text-[16px] text-ink" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
                {activeTab === 'reelst' ? 'My Pins' : activeTab === 'insights' ? 'Insights' : activeTab === 'inbox' ? 'Inbox' : activeTab === 'content' ? 'Content' : activeTab === 'style' ? 'Style' : 'Settings'}
              </p>
              <p className="text-[12px] text-smoke">@{activeUser.username || 'you'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {computedSetupPercent < 100 && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSetup(true)}>
                <SetupRing percent={computedSetupPercent} />
              </motion.button>
            )}
            <Button variant="secondary" size="sm" icon={<ExternalLink size={14} />} onClick={() => activeUser?.username && navigate(`/${activeUser.username}?preview=true`)}>
              Preview
            </Button>
            {/* Settings — moved out of the bottom tab bar so the
                tab slot can host the new Style editor. Right of
                Preview, icon-only at this scale. */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('settings')}
              aria-label="Settings"
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border border-border-light bg-warm-white text-ink"
            >
              <Settings weight="bold" size={16} />
            </motion.button>
          </div>
        </div>
      </div>

      {renderTabContent()}

      <TabBar
        tabs={[
          { id: 'reelst', label: 'My Pins', icon: <MapPin size={20} /> },
          { id: 'content', label: 'Content', icon: <Film size={20} /> },
          { id: 'style', label: 'Style', icon: <Palette size={20} /> },
          { id: 'inbox', label: 'Inbox', icon: <Inbox size={20} />, badge: inboxUnread },
          { id: 'insights', label: 'Insights', icon: <BarChart3 size={20} /> },
        ]}
        active={activeTab}
        onChange={(id) => { setActiveTab(id as DashTab); window.scrollTo(0, 0) }}
      />

      {renderSheets()}
    </div>
  )
}

// ── Edit Profile Content (shared between modal and bottom sheet) ──

function EditProfileContent({ data, setData, onPhoto, onSave, dark }: {
  data: { displayName: string; bio: string; photoURL: string }
  setData: (d: { displayName: string; bio: string; photoURL: string }) => void
  onPhoto: () => void; onSave: () => void; dark?: boolean
}) {
  const textColor = dark ? 'text-white' : 'text-ink'
  const subColor = dark ? 'text-ghost' : 'text-smoke'
  const inputBg = dark ? 'bg-slate border-border-dark text-white placeholder:text-ghost' : 'bg-cream border-border-light text-ink placeholder:text-ash'
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={onPhoto} className="cursor-pointer relative group">
          {data.photoURL ? (
            <img src={data.photoURL} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${dark ? 'bg-charcoal' : 'bg-pearl'}`}>
              <Camera size={20} className={dark ? 'text-ghost' : 'text-smoke'} />
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={16} className="text-white" />
          </div>
        </button>
        <button onClick={onPhoto} className="text-[13px] font-bold text-tangerine cursor-pointer hover:underline">Change photo</button>
      </div>
      <div>
        <label className={`text-[12px] font-semibold ${subColor} uppercase tracking-wider block mb-1.5`}>Display Name</label>
        <input type="text" value={data.displayName} onChange={(e) => setData({ ...data, displayName: e.target.value })}
          className={`w-full px-4 py-3 rounded-[14px] border text-[14px] focus:outline-none focus:ring-2 focus:ring-tangerine/30 ${inputBg}`}
          placeholder="Your name" />
      </div>
      <div>
        <label className={`text-[12px] font-semibold ${subColor} uppercase tracking-wider block mb-1.5`}>Bio</label>
        <textarea value={data.bio} onChange={(e) => { if (e.target.value.length <= 250) setData({ ...data, bio: e.target.value }) }}
          rows={3} maxLength={250}
          className={`w-full px-4 py-3 rounded-[14px] border text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-tangerine/30 ${inputBg}`}
          placeholder="Tell visitors about yourself..." />
        <span className={`text-[11px] ${subColor} mt-1 block`}>{data.bio.length}/250</span>
      </div>
      <button
        onClick={onSave}
        className="brand-btn-flat w-full h-12 px-4 rounded-full text-[14px] cursor-pointer inline-flex items-center justify-center"
        style={{ fontWeight: 600, boxShadow: '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)' }}
      >
        Save Changes
      </button>
    </div>
  )
}

// ── Platform Modal (desktop — centered ease-in) ──

function SocialLinksPanel({ isOpen, onClose, existingPlatforms, onAdd, onRemove, isDesktop }: {
  isOpen: boolean; onClose: () => void
  existingPlatforms: Platform[]
  onAdd: (platformId: string, username: string) => void
  onRemove: (platformId: string) => void
  isDesktop: boolean
}) {
  const [adding, setAdding] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const available = PLATFORM_LIST.filter((p) => !existingPlatforms.some((ep) => ep.id === p.id))

  useEffect(() => {
    if (!isOpen) setTimeout(() => { setAdding(null); setEditing(null); setUrl(''); setError(null) }, 200)
  }, [isOpen])

  const handleStartEdit = (p: Platform) => {
    setEditing(p.id)
    setUrl(p.username)
    setAdding(null)
    setError(null)
  }

  const handleStartAdd = (id: string) => {
    setAdding(id)
    setEditing(null)
    const meta = PLATFORM_LIST.find((p) => p.id === id)
    setUrl(meta?.prefix || '')
    setError(null)
  }

  const handleSave = () => {
    const platformId = adding || editing
    if (!platformId || !url.trim()) return
    const err = validatePlatformUrl(platformId, url.trim())
    if (err) { setError(err); return }
    onAdd(platformId, url.trim())
    setAdding(null)
    setEditing(null)
    setUrl('')
    setError(null)
  }

  const content = (
    <div className={isDesktop ? 'px-6 pb-6' : 'px-5 pb-8'}>
      {(adding || editing) ? (
        <div className="space-y-4">
          {(() => {
            const id = adding || editing
            const meta = PLATFORM_LIST.find((p) => p.id === id)
            const Logo = PLATFORM_LOGOS[id!]
            return (
              <>
                <div className="flex items-center gap-3">
                  {Logo && <Logo size={24} />}
                  <span className={`text-[15px] font-semibold ${isDesktop ? 'text-ink' : 'text-white'}`}>
                    {editing ? 'Edit' : 'Add'} {meta?.name}
                  </span>
                </div>
                <input
                  type="url"
                  placeholder={meta?.placeholder || 'https://'}
                  value={url}
                  onChange={(e) => {
                    const prefix = meta?.prefix || 'https://'
                    const v = e.target.value
                    if (v.length < prefix.length || !v.startsWith(prefix)) { setUrl(prefix); return }
                    setUrl(v); setError(null)
                  }}
                  autoFocus
                  className={`w-full px-4 py-3 rounded-[14px] border text-[14px] focus:outline-none focus:ring-2 focus:ring-tangerine/30 ${
                    isDesktop ? 'bg-cream border-border-light text-ink placeholder:text-ash' : 'bg-slate border-border-dark text-white placeholder:text-ghost'
                  }`}
                />
                {error && <p className="text-[12px] text-live-red">{error}</p>}
                <div className="flex gap-3">
                  <Button variant={isDesktop ? 'secondary' : 'glass'} size="lg" fullWidth onClick={() => { setAdding(null); setEditing(null); setUrl(''); setError(null) }}>Cancel</Button>
                  <Button variant="primary" size="lg" fullWidth onClick={handleSave}>Save</Button>
                </div>
              </>
            )
          })()}
        </div>
      ) : (
        <div className="space-y-4">
          {existingPlatforms.length > 0 && (
            <div className="space-y-2">
              {existingPlatforms.map((p) => {
                const Logo = PLATFORM_LOGOS[p.id]
                const name = PLATFORM_LIST.find((pl) => pl.id === p.id)?.name || p.id
                return (
                  <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-[14px] ${isDesktop ? 'bg-cream' : 'bg-slate'}`}>
                    {Logo && <Logo size={22} />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold ${isDesktop ? 'text-ink' : 'text-white'}`}>{name}</p>
                      <p className={`text-[11px] truncate ${isDesktop ? 'text-smoke' : 'text-ghost'}`}>{p.username}</p>
                    </div>
                    <button onClick={() => handleStartEdit(p)} className="text-[12px] font-semibold text-tangerine cursor-pointer hover:underline">Edit</button>
                    <button onClick={() => onRemove(p.id)} className="text-[12px] font-semibold text-live-red/70 cursor-pointer hover:underline ml-1">Remove</button>
                  </div>
                )
              })}
            </div>
          )}

          {available.length > 0 && (
            <>
              <p className={`text-[12px] font-semibold uppercase tracking-wider ${isDesktop ? 'text-smoke' : 'text-ghost'}`}>Add a platform</p>
              <div className="grid grid-cols-3 gap-3">
                {available.map((platform) => {
                  const Logo = PLATFORM_LOGOS[platform.id]
                  return (
                    <motion.button
                      key={platform.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleStartAdd(platform.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-[16px] cursor-pointer transition-colors ${
                        isDesktop ? 'bg-cream hover:border-tangerine/20 border border-transparent' : 'bg-slate'
                      }`}
                    >
                      {Logo && <Logo size={28} />}
                      <span className={`text-[12px] font-semibold ${isDesktop ? 'text-graphite' : 'text-mist'}`}>{platform.name}</span>
                    </motion.button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} onClick={(e) => e.stopPropagation()}
              className="relative bg-warm-white rounded-2xl shadow-2xl w-[440px] max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="text-[18px] font-bold text-ink">Social Links</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-cream flex items-center justify-center cursor-pointer hover:bg-pearl transition-colors">
                  <X size={16} className="text-smoke" />
                </button>
              </div>
              {content}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} title="Social Links">
      {content}
    </DarkBottomSheet>
  )
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${on ? 'bg-tangerine' : 'bg-pearl'}`}
    >
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: 'spring', damping: 20, stiffness: 400 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </motion.button>
  )
}

function AppearancePicker({
  preference,
  resolved,
  onChange,
}: {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  onChange: (pref: ThemePreference) => void
}) {
  const options: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Settings },
  ]
  const subtitle =
    preference === 'system'
      ? `Following your device · currently ${resolved}`
      : preference === 'dark'
      ? 'Dark mode'
      : 'Light mode'

  return (
    <div className="w-full bg-cream rounded-[14px] p-4 flex flex-col gap-3.5">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-[12px] bg-pearl flex items-center justify-center">
          {resolved === 'dark' ? (
            <Moon size={18} className="text-graphite" />
          ) : (
            <Sun size={18} className="text-graphite" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[15px] font-medium text-ink block">Theme</span>
          <span className="text-[12px] text-smoke">{subtitle}</span>
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label="Color theme"
        className="relative grid grid-cols-3 gap-1 p-1 rounded-full bg-pearl/60 border border-border-light"
      >
        {options.map((opt) => {
          const active = preference === opt.id
          const Icon = opt.icon
          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.id)}
              className={`relative z-10 flex items-center justify-center gap-1.5 h-9 rounded-full text-[12px] font-semibold cursor-pointer transition-colors duration-200 ${
                active ? 'text-ink' : 'text-smoke hover:text-graphite'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="appearance-pill"
                  className="absolute inset-0 rounded-full bg-warm-white shadow-sm border border-border-light"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={13} />
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
