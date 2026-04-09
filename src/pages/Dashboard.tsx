import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, BarChart3, Users, Settings, Plus,
  Eye, MousePointerClick, Bookmark,
  ExternalLink, LogOut, ChevronRight, Bell, CreditCard,
  User, Trash2, Edit3, EyeOff, Link2, Shield, Palette,
  Film, Share2, Smartphone, Copy, Check, X, QrCode, CalendarDays, Inbox,
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
import { ShowingInbox } from '@/components/dashboard/ShowingInbox'
import { canActivatePin, hasFeature, type Tier } from '@/lib/tiers'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { firebaseConfigured } from '@/config/firebase'
import { MOCK_PINS_CAROLINA, MOCK_CURRENT_USER, MOCK_AGENTS } from '@/lib/mock'
import { PLATFORM_LIST, PLATFORM_LOGOS } from '@/components/icons/PlatformLogos'
import { PIN_CONFIG, type Pin, type Platform, type ForSalePin, type OpenHouse } from '@/lib/types'

type DashTab = 'plot' | 'insights' | 'inbox' | 'audience' | 'settings'

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
  const [activeTab, setActiveTab] = useState<DashTab>('plot')
  const [showSetup, setShowSetup] = useState(false)
  const [showPinActions, setShowPinActions] = useState<Pin | null>(null)
  const [showAddPlatform, setShowAddPlatform] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Pin | null>(null)
  const [copied, setCopied] = useState(false)
  const [paywall, setPaywall] = useState<{ open: boolean; reason: string; upgradeTo?: Tier }>({ open: false, reason: '' })
  const [qrPin, setQrPin] = useState<Pin | null>(null)
  const [openHousePin, setOpenHousePin] = useState<ForSalePin | null>(null)
  const isDesktop = useIsDesktop()

  // Use real userDoc if signed in, otherwise fall back to Carolina (mock) for demo
  const currentUser = userDoc || MOCK_CURRENT_USER

  // Pins with toggle state — use Carolina's mock pins when there's no real data
  const [pins, setPins] = useState<Pin[]>(MOCK_PINS_CAROLINA)

  const handleTogglePin = useCallback(async (pinId: string, enabled: boolean) => {
    // Gate activation — block if at active pin cap
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

  const handleSignOut = () => {
    setUserDoc(null)
    navigate('/')
  }

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

  // ── Tab content (shared between mobile and desktop) ──

  const renderTabContent = () => (
    <div>

        {/* ═══ MY PLOT ═══ */}
        {activeTab === 'plot' && (
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
                <p className="text-[14px] text-smoke mb-5">Add a listing, story, or open house to your map.</p>
                <Button variant="primary" size="lg" icon={<Plus size={18} />} onClick={() => navigate('/dashboard/pin/new')}>Create Pin</Button>
              </motion.div>
            ) : (
              <div className={isDesktop ? 'grid grid-cols-2 gap-4' : 'space-y-3'}>
                {pins.map((pin) => (
                  <div key={pin.id}>
                    <PinCard
                      pin={pin}
                      variant="manage"
                      dark={false}
                      onToggle={(enabled) => handleTogglePin(pin.id, enabled)}
                      onMore={() => setShowPinActions(pin)}
                      onClick={() => navigate(`/dashboard/pin/${pin.id}/edit`)}
                    />
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
            <ShowingInbox agentId={activeUser.uid} />
          </div>
        )}

        {/* ═══ AUDIENCE ═══ */}
        {activeTab === 'audience' && (
          <div className={isDesktop ? 'space-y-6' : 'px-5 py-5 space-y-6'}>
            {/* What connected platforms do — info card */}
            <div className="bg-tangerine-soft rounded-[16px] p-4">
              <p className="text-[13px] font-bold text-ink mb-2">Connected platforms do two things:</p>
              <ul className="space-y-1.5">
                <li className="text-[12px] text-graphite flex items-start gap-2">
                  <span className="text-tangerine font-bold mt-0.5">1.</span>
                  <span>Show up on your profile pill so visitors can click into your other channels.</span>
                </li>
                <li className="text-[12px] text-graphite flex items-start gap-2">
                  <span className="text-tangerine font-bold mt-0.5">2.</span>
                  <span>Let you import content from those channels when creating or updating a listing pin.</span>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-bold text-ink">Your Channels</h3>
                <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setShowAddPlatform(true)}>Add</Button>
              </div>
              {activeUser.platforms.length === 0 ? (
                <div className="bg-cream rounded-[16px] p-5 text-center">
                  <p className="text-[14px] text-smoke mb-3">Connect platforms to bring your existing content into Reelst.</p>
                  <Button variant="primary" size="sm" onClick={() => setShowAddPlatform(true)}>Connect Platform</Button>
                </div>
              ) : (
                <div className={isDesktop ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
                  {activeUser.platforms.map((p) => {
                    const Logo = PLATFORM_LOGOS[p.id]
                    return (
                      <div key={p.id} className="flex items-center gap-3 bg-cream rounded-[14px] p-3">
                        {Logo ? <Logo size={28} /> : <div className="w-7 h-7 rounded-lg bg-pearl" />}
                        <div className="flex-1">
                          <p className="text-[14px] font-semibold text-ink capitalize">{PLATFORM_LIST.find((pl) => pl.id === p.id)?.name || p.id}</p>
                          <p className="text-[12px] text-smoke">@{p.username}</p>
                        </div>
                        <ChevronRight size={16} className="text-ash" />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {activeTab === 'settings' && (
          <div className={isDesktop ? 'space-y-2' : 'px-5 py-5 space-y-2'}>
            <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1">Account</p>
            {[
              { icon: User, label: 'Edit Profile', desc: 'Name, bio, photo', onClick: () => {} },
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

            <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1 pt-4">Preferences</p>
            {[
              { icon: Bell, label: 'Notifications', desc: 'Push & email', onClick: () => {} },
              { icon: Palette, label: 'Appearance', desc: 'Pin style, colors', onClick: () => {} },
              { icon: Smartphone, label: 'Install App', desc: 'Add to home screen', onClick: () => {} },
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
              <Button variant="danger" size="lg" fullWidth icon={<LogOut size={16} />} onClick={handleSignOut}>Sign out</Button>
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

      <DarkBottomSheet isOpen={!!showPinActions} onClose={() => setShowPinActions(null)} title={showPinActions?.address}>
        <div className="px-5 pb-8 space-y-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { navigate(`/dashboard/pin/${showPinActions?.id}/edit`); setShowPinActions(null) }}
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
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setShowDeleteConfirm(showPinActions); }}
            className="w-full flex items-center gap-3 p-3.5 rounded-[14px] bg-live-red/10 text-left">
            <Trash2 size={18} className="text-live-red" />
            <span className="text-[15px] font-medium text-live-red">Archive Pin</span>
          </motion.button>
        </div>
      </DarkBottomSheet>

      <DarkBottomSheet isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Archive this pin?">
        <div className="px-5 pb-8 space-y-4">
          <p className="text-[14px] text-mist">This will remove the pin from your map. The data is kept and can be restored later.</p>
          <div className="flex gap-3">
            <Button variant="glass" size="lg" fullWidth onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="lg" fullWidth onClick={() => showDeleteConfirm && handleDeletePin(showDeleteConfirm.id)}>Archive</Button>
          </div>
        </div>
      </DarkBottomSheet>

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
    </>
  )

  // ═══════════════════════════════════════════
  // DESKTOP: Sidebar + Content + Preview
  // ═══════════════════════════════════════════
  if (isDesktop) {
    const NAV_ITEMS: { id: DashTab; label: string; icon: typeof MapPin }[] = [
      { id: 'plot', label: 'My Reelst', icon: MapPin },
      { id: 'insights', label: 'Insights', icon: BarChart3 },
      { id: 'inbox', label: 'Inbox', icon: Inbox },
      { id: 'audience', label: 'Connected', icon: Link2 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]

    return (
      <div className="h-screen flex bg-ivory overflow-hidden">
        {/* ── Left Sidebar ── */}
        <aside className="w-[240px] shrink-0 border-r border-border-light flex flex-col" style={{ background: 'linear-gradient(180deg, #FAFAF8 0%, #F5F3EF 100%)' }}>
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
            {activeUser.setupPercent < 100 && (
              <button onClick={() => setShowSetup(true)} className="mt-3 w-full cursor-pointer">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-smoke uppercase tracking-wider">Setup</span>
                  <span className="text-[10px] font-bold text-tangerine">{activeUser.setupPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-pearl overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${activeUser.setupPercent}%` }}
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
                  onClick={() => setActiveTab(item.id)}
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
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-midnight text-white font-semibold text-[13px] cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus size={16} />
              <span>Add Pin</span>
            </button>
            <button
              onClick={handleSignOut}
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
              {activeTab === 'plot' ? 'My Reelst' : activeTab === 'insights' ? 'Insights' : activeTab === 'inbox' ? 'Inbox' : activeTab === 'audience' ? 'Connected' : 'Settings'}
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
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[760px] mx-auto px-8 py-6">
              {renderTabContent()}
            </div>
          </div>
        </main>

        {/* ── Right Preview Panel (Live iframe) ── */}
        <aside className="w-[300px] shrink-0 border-l border-border-light flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #F5F3EF 0%, #EDEAE4 100%)' }}>
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
      <div className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-xl border-b border-border-light">
        <div className="px-5 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)', paddingBottom: '12px' }}>
          <div className="flex items-center gap-3">
            <Avatar src={activeUser.photoURL} name={activeUser.displayName || 'Agent'} size={36} />
            <div>
              <p className="text-[16px] font-bold text-ink tracking-tight">
                {activeTab === 'plot' ? 'My Reelst' : activeTab === 'insights' ? 'Insights' : activeTab === 'inbox' ? 'Inbox' : activeTab === 'audience' ? 'Connected' : 'Settings'}
              </p>
              <p className="text-[12px] text-smoke">@{activeUser.username || 'you'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeUser.setupPercent < 100 && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSetup(true)}>
                <SetupRing percent={activeUser.setupPercent} />
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
          { id: 'plot', label: 'My Reelst', icon: <MapPin size={20} /> },
          { id: 'insights', label: 'Insights', icon: <BarChart3 size={20} /> },
          { id: 'inbox', label: 'Inbox', icon: <Inbox size={20} /> },
          { id: 'settings', label: 'More', icon: <Settings size={20} /> },
        ]}
        active={activeTab}
        onChange={(id) => { setActiveTab(id as DashTab); window.scrollTo(0, 0) }}
        centerAction={{ icon: <Plus size={24} />, onClick: () => navigate('/dashboard/pin/new') }}
      />

      {renderSheets()}
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

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
