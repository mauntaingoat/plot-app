import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, BarChart3, Users, Settings, Plus,
  Eye, MousePointerClick, Bookmark,
  ExternalLink, LogOut, ChevronRight, CreditCard,
  User, Trash2, Edit3, EyeOff, Link2, Shield,
  Film, Share2, Copy, Check, X, QrCode, CalendarDays, Inbox,
  Bell, Camera, Sun, Moon,
} from 'lucide-react'
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
import { PinBreakdown, ContentConversion, GeoHeatmap, TimeOfDay, FollowerGrowth, LockedFeature } from '@/components/dashboard/AdvancedInsights'
import { SavedMapInsights, CustomBranding } from '@/components/dashboard/StudioFeatures'
import { QRCodeModal } from '@/components/dashboard/QRCodeModal'
import { OpenHouseEditor } from '@/components/dashboard/OpenHouseEditor'
import { PinEditModal } from '@/components/dashboard/PinEditModal'
import { ShowingInbox } from '@/components/dashboard/ShowingInbox'
import { NotificationSettings } from '@/components/dashboard/NotificationSettings'
import { ContentLibrary } from '@/components/dashboard/ContentLibrary'
import { canActivatePin, hasFeature, type Tier } from '@/lib/tiers'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useScrollLock } from '@/hooks/useScrollLock'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore, type ThemePreference } from '@/stores/themeStore'
import { firebaseConfigured } from '@/config/firebase'
import { MOCK_PINS_CAROLINA, MOCK_CURRENT_USER, MOCK_AGENTS } from '@/lib/mock'
import { PLATFORM_LIST, PLATFORM_LOGOS } from '@/components/icons/PlatformLogos'
import { PIN_CONFIG, type Pin, type Platform, type ForSalePin, type OpenHouse, type ContentItem } from '@/lib/types'

type DashTab = 'reelst' | 'insights' | 'inbox' | 'content' | 'settings'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { userDoc, setUserDoc } = useAuthStore()
  const [activeTab, setActiveTab] = useState<DashTab>('reelst')
  const [showSetup, setShowSetup] = useState(false)
  const [showPinActions, setShowPinActions] = useState<Pin | null>(null)
  const [showAddPlatform, setShowAddPlatform] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Pin | null>(null)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [paywall, setPaywall] = useState<{ open: boolean; reason: string; upgradeTo?: Tier }>({ open: false, reason: '' })
  const [qrPin, setQrPin] = useState<Pin | null>(null)
  const [openHousePin, setOpenHousePin] = useState<ForSalePin | null>(null)
  const [editPin, setEditPin] = useState<Pin | null>(null)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editProfileData, setEditProfileData] = useState({ displayName: '', bio: '', photoURL: '' })
  const photoInputRef = useRef<HTMLInputElement>(null)
  const desktopScrollRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  // Lock background scroll for desktop-only inline modals
  // (Mobile variants use DarkBottomSheet which locks scroll internally)
  useScrollLock(isDesktop && !!showDeleteConfirm)
  useScrollLock(isDesktop && showEditProfile)
  useScrollLock(isDesktop && showAddPlatform)

  const themePreference = useThemeStore((s) => s.preference)
  const resolvedTheme = useThemeStore((s) => s.resolved)
  const setThemePreference = useThemeStore((s) => s.setPreference)
  const activateTheme = useThemeStore((s) => s.activate)
  const isDark = resolvedTheme === 'dark'
  useEffect(() => activateTheme(), [activateTheme])

  // Use real userDoc if signed in, otherwise fall back to Carolina (mock) for demo
  const currentUser = userDoc || MOCK_CURRENT_USER

  // Pins with toggle state — use Carolina's mock pins when there's no real data
  const [pins, setPins] = useState<Pin[]>(MOCK_PINS_CAROLINA)

  const handleTogglePin = useCallback(async (pinId: string, enabled: boolean) => {
    // Gate activation — block if at active pin cap (tier limits)
    if (enabled) {
      const gate = canActivatePin(currentUser, pins)
      if (!gate.allowed) {
        setPaywall({ open: true, reason: gate.reason || '', upgradeTo: gate.upgradeTo })
        return
      }
    }
    setPins((prev) => prev.map((p) => p.id === pinId ? { ...p, enabled } : p))
    const { updatePin } = await import('@/lib/firestore')
    await updatePin(pinId, { enabled } as any).catch(() => {})
  }, [currentUser, pins])

  const handleDeletePin = useCallback(async (pinId: string) => {
    setPins((prev) => prev.filter((p) => p.id !== pinId))
    setShowDeleteConfirm(null)
    setShowPinActions(null)
    // Soft delete — archive instead of destroy
    const { archivePin } = await import('@/lib/firestore')
    await archivePin(pinId).catch(() => {})
  }, [])

  const handleSaveOpenHouse = useCallback(async (pinId: string, openHouse: OpenHouse | null) => {
    setPins((prev) => prev.map((p) => (p.id === pinId && p.type === 'for_sale' ? { ...p, openHouse } : p)))
    const { updatePin } = await import('@/lib/firestore')
    await updatePin(pinId, { openHouse } as any).catch(() => {})
  }, [])

  const stats = useMemo(() => {
    let views = 0, taps = 0, saves = 0
    pins.forEach((p) => { views += p.views; taps += p.taps; saves += p.saves })
    return { views, taps, saves, pins: pins.length }
  }, [pins])

  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((label, i) => ({ label, value: [1240, 1890, 1560, 2340, 3120, 2870, 2180][i] }))
  }, [])

  const confirmSignOut = () => {
    setShowSignOutConfirm(false)
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
    const updated = {
      ...activeUser,
      platforms: [...activeUser.platforms, { id: platformId, username: username.trim() }],
    }
    setUserDoc(updated)
    setShowAddPlatform(false)
  }

  if (!currentUser && !MOCK_CURRENT_USER) {
    navigate('/')
    return null
  }
  const activeUser = currentUser || MOCK_CURRENT_USER
  const profileUrl = `reel.st/${activeUser.username || 'you'}`

  // Compute real setup percent to match checklist (fix mismatch)
  const computedSetupPercent = useMemo(() => {
    const items = [
      { weight: 10, check: !!activeUser.username },
      { weight: 15, check: !!activeUser.photoURL },
      { weight: 10, check: !!activeUser.displayName && activeUser.displayName.length > 0 },
      { weight: 10, check: !!activeUser.bio && activeUser.bio.length > 0 },
      { weight: 15, check: activeUser.platforms.length > 0 },
      { weight: 10, check: !!activeUser.licenseNumber },
      { weight: 20, check: pins.length >= 1 },
      { weight: 10, check: pins.length >= 3 },
    ]
    return items.filter((i) => i.check).reduce((s, i) => s + i.weight, 0)
  }, [activeUser, pins])

  // ── Tab content (shared between mobile and desktop) ──

  const renderTabContent = () => (
    <div>

        {/* ═══ MY PLOT ═══ */}
        {activeTab === 'reelst' && (
          <div className={isDesktop ? 'space-y-5' : 'px-5 py-5 space-y-4'}>
            {/* Desktop: profile card header */}
            {isDesktop && (
              <div className="flex items-center gap-4 bg-warm-white rounded-2xl p-5 border border-border-light">
                <Avatar src={activeUser.photoURL} name={activeUser.displayName || 'Agent'} size={56} />
                <div className="flex-1 min-w-0">
                  <p className="text-[18px] font-bold text-ink">{activeUser.displayName || 'Agent'}</p>
                  <p className="text-[13px] text-smoke">@{activeUser.username || 'you'}{activeUser.brokerage ? ` · ${activeUser.brokerage}` : ''}</p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <p className="text-[22px] font-extrabold text-ink font-mono">{stats.pins}</p>
                    <p className="text-[10px] text-smoke font-semibold uppercase tracking-wider">Pins</p>
                  </div>
                  <div className="w-px h-8 bg-border-light" />
                  <div className="text-center">
                    <p className="text-[22px] font-extrabold text-ink font-mono">{stats.views.toLocaleString()}</p>
                    <p className="text-[10px] text-smoke font-semibold uppercase tracking-wider">Views</p>
                  </div>
                  <div className="w-px h-8 bg-border-light" />
                  <div className="text-center">
                    <p className="text-[22px] font-extrabold text-ink font-mono">{activeUser.followerCount}</p>
                    <p className="text-[10px] text-smoke font-semibold uppercase tracking-wider">Followers</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile: compact stat chips */}
            {!isDesktop && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-cream rounded-[14px] p-3 text-center">
                  <p className="text-[20px] font-extrabold text-ink font-mono">{stats.pins}</p>
                  <p className="text-[10px] text-smoke font-semibold uppercase tracking-wider">Pins</p>
                </div>
                <div className="bg-cream rounded-[14px] p-3 text-center">
                  <p className="text-[20px] font-extrabold text-ink font-mono">{stats.views.toLocaleString()}</p>
                  <p className="text-[10px] text-smoke font-semibold uppercase tracking-wider">Views</p>
                </div>
                <div className="bg-cream rounded-[14px] p-3 text-center">
                  <p className="text-[20px] font-extrabold text-ink font-mono">{activeUser.followerCount}</p>
                  <p className="text-[10px] text-smoke font-semibold uppercase tracking-wider">Followers</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-ink">Your Pins</h3>
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => navigate('/dashboard/pin/new')}>Add Pin</Button>
            </div>

            {pins.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-cream rounded-[20px] p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-tangerine-soft mx-auto mb-4 flex items-center justify-center">
                  <MapPin size={28} className="text-tangerine" />
                </div>
                <h3 className="text-[18px] font-bold text-ink mb-1">Drop your first pin</h3>
                <p className="text-[14px] text-smoke mb-5">Add a listing, spotlight, or open house to your map.</p>
                <Button variant="primary" size="lg" icon={<Plus size={18} />} onClick={() => navigate('/dashboard/pin/new')}>Create Pin</Button>
              </motion.div>
            ) : (
              <div className={isDesktop ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
                {pins.map((pin) => (
                  <div key={pin.id} className="relative">
                    <PinCard
                      pin={pin}
                      variant="manage"
                      dark={false}
                      onToggle={(enabled) => handleTogglePin(pin.id, enabled)}
                      onMore={() => setShowPinActions(showPinActions?.id === pin.id ? null : pin)}
                      onClick={() => setEditPin(pin)}
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
                              ...(pin.type === 'for_sale' ? [{ icon: CalendarDays, label: 'Open House', color: 'text-open-amber', onClick: () => { setOpenHousePin(pin as ForSalePin); setShowPinActions(null) } }] : []),
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
            {/* Basic stats — visible to all tiers */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Views" value={stats.views} change={12} changePeriod="vs last week" icon={<Eye size={18} />} format="compact" />
              <StatCard label="Taps" value={stats.taps} change={8} changePeriod="vs last week" icon={<MousePointerClick size={18} />} color="#3B82F6" format="compact" />
              <StatCard label="Saves" value={stats.saves} change={-3} changePeriod="vs last week" icon={<Bookmark size={18} />} color="#A855F7" format="compact" />
              <StatCard label="Followers" value={activeUser.followerCount} change={15} changePeriod="vs last week" icon={<Users size={18} />} color="#34C759" />
            </div>
            <InsightsChart data={chartData} />

            {/* Advanced analytics — Pro/Studio only */}
            {hasFeature(activeUser, 'advancedAnalytics') ? (
              <>
                <PinBreakdown pins={pins} metric="views" />
                <ContentConversion pins={pins} />
                <FollowerGrowth currentFollowers={activeUser.followerCount} />
                <TimeOfDay pins={pins} />
                <GeoHeatmap pins={pins} />
                {/* Saved map insights — Studio only */}
                {hasFeature(activeUser, 'savedMapInsights') && <SavedMapInsights pins={pins} />}
              </>
            ) : (
              <LockedFeature
                title="Unlock advanced analytics"
                description="Per-pin breakdown, content conversion, geographic heatmap, time-of-day patterns, and follower growth charts."
                onUpgrade={() => setPaywall({ open: true, reason: 'Advanced analytics is a Pro feature.', upgradeTo: 'pro' })}
              />
            )}
          </div>
        )}

        {/* ═══ INBOX ═══ */}
        {activeTab === 'inbox' && (
          <div className={isDesktop ? 'space-y-5' : 'px-5 py-5 space-y-4'}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-ink">Showing Requests</h3>
                <p className="text-[12px] text-smoke mt-0.5">Visitors who asked to tour your listings.</p>
              </div>
            </div>
            {/* Prompt to enable notifications if not granted */}
            {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-tangerine/10 border border-tangerine/20 rounded-[16px] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-tangerine/15 flex items-center justify-center shrink-0">
                  <Bell size={16} className="text-tangerine" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-ink">Get notified about new requests</p>
                  <p className="text-[11px] text-smoke mt-0.5">Enable push notifications so you never miss a showing request.</p>
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
          <ContentLibrary
            pins={pins}
            agentId={activeUser.uid}
            isDesktop={isDesktop}
            onNavigateUpload={() => navigate('/dashboard/pin/new?tab=content')}
            onUploadContent={(files, type) => {
              // TODO: upload files to Storage, create content items
              console.log('Upload', files.length, type, 'files')
            }}
            onArchiveContent={(contentId, pinId) => {
              const pin = pins.find((p) => p.id === pinId)
              if (!pin) return
              const updated = { ...pin, content: pin.content.filter((c) => c.id !== contentId) }
              setPins((prev) => prev.map((p) => p.id === pinId ? updated as Pin : p))
              import('@/lib/firestore').then(({ updatePin }) => updatePin(pinId, { content: updated.content } as any)).catch(() => {})
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
                updatePin(fromPinId, { content: fromPin.content.filter((c) => c.id !== contentId) } as any).catch(() => {})
                updatePin(toPinId, { content: [...toPin.content, movedItem] } as any).catch(() => {})
              })
            }}
          />
        )}

        {/* ═══ SETTINGS ═══ */}
        {activeTab === 'settings' && (
          <div className={isDesktop ? 'space-y-2' : 'px-5 py-5 space-y-2'}>
            <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1">Account</p>
            {[
              { icon: User, label: 'Edit Profile', desc: 'Name, bio, photo', onClick: () => { setEditProfileData({ displayName: activeUser.displayName || '', bio: activeUser.bio || '', photoURL: activeUser.photoURL || '' }); setShowEditProfile(true) } },
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

            {/* Custom Branding — Studio only */}
            {hasFeature(activeUser, 'customBranding') && (
              <>
                <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1 pt-4">Branding</p>
                <CustomBranding
                  user={activeUser}
                  onSave={(color) => {
                    setUserDoc({ ...activeUser, brandColor: color })
                    import('@/lib/firestore').then(({ updateUserDoc }) => updateUserDoc(activeUser.uid, { brandColor: color }).catch(() => {}))
                  }}
                />
              </>
            )}

            <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1 pt-4">Plan</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/pricing')}
              className="w-full flex items-center gap-3.5 bg-cream rounded-[14px] p-4 text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-[12px] bg-pearl flex items-center justify-center"><CreditCard size={18} className="text-graphite" /></div>
              <div className="flex-1">
                <span className="text-[15px] font-medium text-ink block">Subscription</span>
                <span className="text-[12px] text-smoke">{activeUser.tier === 'studio' ? 'Studio plan · $39/mo' : activeUser.tier === 'pro' ? 'Pro plan · $19/mo' : 'Free plan'}</span>
              </div>
              <Badge>{activeUser.tier === 'studio' ? 'Studio' : activeUser.tier === 'pro' ? 'Pro' : 'Free'}</Badge>
            </motion.button>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" size="lg" fullWidth icon={<Share2 size={16} />} onClick={handleSharePlot}>
                Share Reelst
              </Button>
            </div>

            <div className="pt-2">
              <Button variant="danger" size="lg" fullWidth icon={<LogOut size={16} />} onClick={requestSignOut}>Sign out</Button>
            </div>
            <div className="flex items-center justify-center gap-3 pt-4">
              <button className="text-[12px] text-ash">Privacy</button>
              <span className="text-ash text-[10px]">&middot;</span>
              <button className="text-[12px] text-ash">Terms</button>
              <span className="text-ash text-[10px]">&middot;</span>
              <span className="text-[12px] text-ash">Reelst v1.0.0</span>
            </div>
          </div>
        )}
    </div>
  )

  // ── Shared sheets (bottom sheets for mobile, modals for desktop platform connect) ──
  const renderSheets = () => (
    <>
      <SetupChecklist isOpen={showSetup} onClose={() => setShowSetup(false)} user={activeUser} pinCount={pins.length} />

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
                <h2 className="text-[16px] font-extrabold text-white tracking-tight">Archive this pin?</h2>
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

      {/* Platform connect — modal on desktop, bottom sheet on mobile */}
      {isDesktop ? (
        <PlatformModal isOpen={showAddPlatform} onClose={() => setShowAddPlatform(false)} onAdd={handleAddPlatform} existingPlatforms={activeUser.platforms} />
      ) : (
        <AddPlatformSheet isOpen={showAddPlatform} onClose={() => setShowAddPlatform(false)} onAdd={handleAddPlatform} existingPlatforms={activeUser.platforms} />
      )}

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
          const updated = { ...editPin, content: editPin.content.filter((c) => c.id !== contentId) }
          setPins((prev) => prev.map((p) => p.id === editPin.id ? updated as Pin : p))
          setEditPin(updated as Pin)
          import('@/lib/firestore').then(({ updatePin }) => updatePin(editPin.id, { content: updated.content } as any)).catch(() => {})
        }}
        onReorderContent={(contentIds) => {
          if (!editPin) return
          const reordered = contentIds.map((id) => editPin.content.find((c) => c.id === id)!).filter(Boolean)
          const updated = { ...editPin, content: reordered }
          setPins((prev) => prev.map((p) => p.id === editPin.id ? updated as Pin : p))
          setEditPin(updated as Pin)
          import('@/lib/firestore').then(({ updatePin }) => updatePin(editPin.id, { content: reordered } as any)).catch(() => {})
        }}
      />

      {/* Hidden photo file input */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const url = URL.createObjectURL(file)
        setEditProfileData((prev) => ({ ...prev, photoURL: url }))
        // TODO: upload to Firebase Storage and get real URL
        e.target.value = ''
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
      { id: 'reelst', label: 'My Reelst', icon: MapPin },
      { id: 'insights', label: 'Insights', icon: BarChart3 },
      { id: 'inbox', label: 'Inbox', icon: Inbox },
      { id: 'content', label: 'Content', icon: Film },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]

    return (
      <div className="h-screen flex bg-ivory overflow-hidden">
        {/* ── Left Sidebar ── */}
        <aside className="w-[240px] shrink-0 border-r border-border-light flex flex-col" style={{ background: 'linear-gradient(180deg, var(--color-ivory) 0%, var(--color-cream) 100%)' }}>
          {/* Logo */}
          <div className="px-5 pt-6 pb-2">
            <div className="flex items-center gap-2.5">
              <img src="/reelst-logo.png" alt="Reelst" className="w-7 h-7" />
              <span className="text-[17px] font-bold text-ink tracking-tight">Reelst</span>
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
                      ? 'bg-tangerine text-white shadow-md'
                      : 'text-graphite hover:bg-warm-white'
                    }
                  `}
                >
                  <item.icon size={18} className={isActive ? 'text-white' : 'text-smoke'} />
                  <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Bottom: Add Pin CTA */}
          <div className="px-4 pb-6">
            <button
              onClick={() => navigate('/dashboard/pin/new')}
              className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-2xl font-semibold text-[13px] cursor-pointer shadow-lg hover:shadow-xl transition-shadow ${isDark ? 'bg-tangerine text-white' : 'bg-midnight text-white'}`}
            >
              <Plus size={16} />
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
            <h1 className="text-[20px] font-bold text-ink tracking-tight">
              {activeTab === 'reelst' ? 'My Reelst' : activeTab === 'insights' ? 'Insights' : activeTab === 'inbox' ? 'Inbox' : activeTab === 'content' ? 'Content' : 'Settings'}
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
                onClick={() => navigate(`/${activeUser.username || 'carolina'}?preview=true`)}
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

        {/* ── Right Preview Panel (Live iframe) ── */}
        <aside className="w-[300px] shrink-0 border-l border-border-light flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-pearl) 100%)' }}>
          {/* Phone frame with live preview — scaled to fit */}
          <div className="relative">
            <div className="w-[240px] rounded-[32px] bg-midnight shadow-2xl overflow-hidden" style={{ height: '480px' }}>
              <iframe
                src={`/${activeUser.username || 'carolina'}?preview=true`}
                className="border-0 origin-top-left"
                style={{ pointerEvents: 'none', width: '375px', height: '750px', transform: 'scale(0.64)', transformOrigin: 'top left' }}
                title="Profile preview"
              />
            </div>
          </div>

          <button
            onClick={() => navigate(`/${activeUser.username || 'carolina'}?preview=true`)}
            className="mt-4 text-[12px] font-semibold text-tangerine cursor-pointer hover:underline"
          >
            Open full preview
          </button>
        </aside>

        {renderSheets()}
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // MOBILE: Original layout (unchanged)
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-ivory pb-tab-safe">
      {/* Header */}
      <div className="sticky top-0 z-[100] bg-ivory/95 backdrop-blur-xl border-b border-border-light">
        <div className="px-5 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)', paddingBottom: '12px' }}>
          <div className="flex items-center gap-3">
            <Avatar src={activeUser.photoURL} name={activeUser.displayName || 'Agent'} size={36} />
            <div>
              <p className="text-[16px] font-bold text-ink tracking-tight">
                {activeTab === 'reelst' ? 'My Reelst' : activeTab === 'insights' ? 'Insights' : activeTab === 'inbox' ? 'Inbox' : activeTab === 'content' ? 'Content' : 'Settings'}
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
            <Button variant="secondary" size="sm" icon={<ExternalLink size={14} />} onClick={() => navigate('/carolina?preview=true')}>
              Preview
            </Button>
          </div>
        </div>
      </div>

      {renderTabContent()}

      <TabBar
        tabs={[
          { id: 'reelst', label: 'My Reelst', icon: <MapPin size={20} /> },
          { id: 'insights', label: 'Insights', icon: <BarChart3 size={20} /> },
          { id: 'inbox', label: 'Inbox', icon: <Inbox size={20} /> },
          { id: 'content', label: 'Content', icon: <Film size={20} /> },
          { id: 'settings', label: 'More', icon: <Settings size={20} /> },
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
        {data.photoURL ? (
          <img src={data.photoURL} alt="" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${dark ? 'bg-charcoal' : 'bg-pearl'}`}>
            <Camera size={20} className={dark ? 'text-ghost' : 'text-smoke'} />
          </div>
        )}
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
      <button onClick={onSave}
        className="w-full px-4 py-3 rounded-full bg-tangerine text-white text-[14px] font-bold cursor-pointer hover:brightness-110 transition-all">
        Save Changes
      </button>
    </div>
  )
}

// ── Platform Modal (desktop — centered ease-in) ──

function PlatformModal({ isOpen, onClose, onAdd, existingPlatforms }: {
  isOpen: boolean; onClose: () => void
  onAdd: (platformId: string, username: string) => void
  existingPlatforms: Platform[]
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [username, setUsername] = useState('')

  const available = PLATFORM_LIST.filter((p) => !existingPlatforms.some((ep) => ep.id === p.id))

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => { setSelected(null); setUsername('') }, 200)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop — darkened, no blur */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-warm-white rounded-2xl shadow-2xl w-[440px] max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="text-[18px] font-bold text-ink">Connect a platform</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-cream flex items-center justify-center cursor-pointer hover:bg-pearl transition-colors">
                <X size={16} className="text-smoke" />
              </button>
            </div>

            <div className="px-6 pb-6">
              {!selected ? (
                <div className="grid grid-cols-3 gap-3">
                  {available.map((platform) => {
                    const Logo = PLATFORM_LOGOS[platform.id]
                    return (
                      <motion.button
                        key={platform.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelected(platform.id)}
                        className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-cream border border-transparent hover:border-tangerine/20 cursor-pointer transition-colors"
                      >
                        {Logo && <Logo size={32} />}
                        <span className="text-[12px] font-semibold text-graphite">{platform.name}</span>
                      </motion.button>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[14px] text-smoke">Enter your {PLATFORM_LIST.find((p) => p.id === selected)?.name} {selected === 'website' ? 'URL' : 'username'}</p>
                  <Input
                    placeholder={selected === 'website' ? 'https://yoursite.com' : `@${selected} username`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button variant="secondary" size="lg" fullWidth onClick={() => { setSelected(null); setUsername('') }}>Back</Button>
                    <Button variant="primary" size="lg" fullWidth onClick={() => { onAdd(selected, username); setSelected(null); setUsername('') }}>Connect</Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Add Platform Bottom Sheet (mobile) ──

function AddPlatformSheet({ isOpen, onClose, onAdd, existingPlatforms }: {
  isOpen: boolean; onClose: () => void
  onAdd: (platformId: string, username: string) => void
  existingPlatforms: Platform[]
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [username, setUsername] = useState('')

  const available = PLATFORM_LIST.filter((p) => !existingPlatforms.some((ep) => ep.id === p.id))

  return (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} title="Connect a platform">
      <div className="px-5 pb-8">
        {!selected ? (
          <div className="grid grid-cols-3 gap-3">
            {available.map((platform) => {
              const Logo = PLATFORM_LOGOS[platform.id]
              return (
                <motion.button
                  key={platform.id}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setSelected(platform.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-[16px] bg-slate cursor-pointer"
                >
                  {Logo && <Logo size={28} />}
                  <span className="text-[12px] font-semibold text-mist">{platform.name}</span>
                </motion.button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[14px] text-mist">Enter your {PLATFORM_LIST.find((p) => p.id === selected)?.name} username or URL</p>
            <Input
              dark
              placeholder={`@${selected} username`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="glass" size="lg" fullWidth onClick={() => { setSelected(null); setUsername('') }}>Back</Button>
              <Button variant="primary" size="lg" fullWidth onClick={() => { onAdd(selected, username); setSelected(null); setUsername('') }}>Connect</Button>
            </div>
          </div>
        )}
      </div>
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
