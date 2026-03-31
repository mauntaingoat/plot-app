import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, BarChart3, Users, Settings, Plus,
  Eye, MousePointerClick, Bookmark,
  ExternalLink, LogOut, ChevronRight, Bell, CreditCard,
  User, Trash2, Edit3, EyeOff, Link2, Shield, Palette,
  HelpCircle, Share2, Smartphone,
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
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { firebaseConfigured } from '@/config/firebase'
import { MOCK_PINS_CAROLINA, MOCK_CURRENT_USER, MOCK_AGENTS } from '@/lib/mock'
import { PLATFORM_LIST, PLATFORM_LOGOS } from '@/components/icons/PlatformLogos'
import { PIN_CONFIG, type Pin, type Platform } from '@/lib/types'

type DashTab = 'plot' | 'insights' | 'audience' | 'settings'

export default function Dashboard() {
  const navigate = useNavigate()
  const { userDoc, setUserDoc } = useAuthStore()
  const [activeTab, setActiveTab] = useState<DashTab>('plot')
  const [showSetup, setShowSetup] = useState(false)
  const [showPinActions, setShowPinActions] = useState<Pin | null>(null)
  const [showAddPlatform, setShowAddPlatform] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Pin | null>(null)

  const currentUser = userDoc || (!firebaseConfigured ? MOCK_CURRENT_USER : null)

  // Pins with toggle state
  const [pins, setPins] = useState<Pin[]>(!firebaseConfigured ? MOCK_PINS_CAROLINA : [])

  const handleTogglePin = useCallback((pinId: string, enabled: boolean) => {
    setPins((prev) => prev.map((p) => p.id === pinId ? { ...p, enabled } : p))
  }, [])

  const handleDeletePin = useCallback((pinId: string) => {
    setPins((prev) => prev.filter((p) => p.id !== pinId))
    setShowDeleteConfirm(null)
    setShowPinActions(null)
  }, [])

  const stats = useMemo(() => {
    let views = 0, taps = 0, saves = 0
    pins.forEach((p) => { views += p.views; taps += p.taps; saves += p.saves })
    return { views, taps, saves, pins: pins.length }
  }, [pins])

  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((label, i) => ({ label, value: [78, 125, 94, 156, 203, 187, 142][i] }))
  }, [])

  const handleSignOut = () => {
    setUserDoc(null)
    navigate('/')
  }

  const handleSharePlot = async () => {
    const url = `https://reeltor.co/${currentUser?.username || ''}`
    try { await navigator.share({ title: 'My Reeltor', url }) }
    catch { navigator.clipboard.writeText(url) }
  }

  const handleAddPlatform = (platformId: string, username: string) => {
    if (!currentUser || !username.trim()) return
    const updated = {
      ...currentUser,
      platforms: [...currentUser.platforms, { id: platformId, username: username.trim() }],
    }
    setUserDoc(updated)
    setShowAddPlatform(false)
  }

  if (!currentUser) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-ivory pb-tab-safe">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-xl border-b border-border-light">
        <div className="px-5 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)', paddingBottom: '12px' }}>
          <div className="flex items-center gap-3">
            <Avatar src={currentUser.photoURL} name={currentUser.displayName || 'Agent'} size={36} />
            <div>
              <p className="text-[16px] font-bold text-ink tracking-tight">
                {activeTab === 'plot' ? 'My Reeltor' : activeTab === 'insights' ? 'Insights' : activeTab === 'audience' ? 'Audience' : 'Settings'}
              </p>
              <p className="text-[12px] text-smoke">@{currentUser.username || 'you'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUser.setupPercent < 100 && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSetup(true)}>
                <SetupRing percent={currentUser.setupPercent} />
              </motion.button>
            )}
            <Button variant="secondary" size="sm" icon={<ExternalLink size={14} />} onClick={() => navigate('/carolina?preview=true')}>
              Preview
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

          {/* ═══ MY PLOT ═══ */}
          {activeTab === 'plot' && (
            <div className="px-5 py-5 space-y-4">
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
                  <p className="text-[20px] font-extrabold text-ink font-mono">{currentUser.followerCount}</p>
                  <p className="text-[10px] text-smoke font-semibold uppercase tracking-wider">Followers</p>
                </div>
              </div>

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
                <div className="space-y-3">
                  {pins.map((pin, i) => (
                    <motion.div key={pin.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <PinCard
                        pin={pin}
                        variant="manage"
                        dark={false}
                        onToggle={(enabled) => handleTogglePin(pin.id, enabled)}
                        onMore={() => setShowPinActions(pin)}
                        onClick={() => navigate(`/dashboard/pin/${pin.id}/edit`)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ INSIGHTS ═══ */}
          {activeTab === 'insights' && (
            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Views" value={stats.views} change={12} changePeriod="vs last week" icon={<Eye size={18} />} format="compact" />
                <StatCard label="Taps" value={stats.taps} change={8} changePeriod="vs last week" icon={<MousePointerClick size={18} />} color="#3B82F6" format="compact" />
                <StatCard label="Saves" value={stats.saves} change={-3} changePeriod="vs last week" icon={<Bookmark size={18} />} color="#A855F7" format="compact" />
                <StatCard label="Followers" value={currentUser.followerCount} change={15} changePeriod="vs last week" icon={<Users size={18} />} color="#34C759" />
              </div>
              <InsightsChart data={chartData} />
              {pins.length > 0 && (
                <div>
                  <h3 className="text-[14px] font-bold text-ink mb-3">Top Performing</h3>
                  <div className="space-y-2">
                    {[...pins].sort((a, b) => b.views - a.views).slice(0, 5).map((pin, i) => (
                      <div key={pin.id} className="flex items-center gap-3 bg-cream rounded-[14px] p-3">
                        <span className="text-[18px] font-extrabold text-tangerine/30 font-mono w-6 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink truncate">{pin.address}</p>
                          <p className="text-[11px] text-smoke">{PIN_CONFIG[pin.type].label}</p>
                        </div>
                        <span className="text-[14px] font-bold text-ink font-mono">{pin.views.toLocaleString()}</span>
                        <Eye size={12} className="text-ash" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ AUDIENCE ═══ */}
          {activeTab === 'audience' && (
            <div className="px-5 py-5 space-y-6">
              <div className="bg-cream rounded-[20px] p-6 text-center">
                <p className="text-[40px] font-extrabold text-ink font-mono">{currentUser.followerCount}</p>
                <p className="text-[14px] text-smoke font-medium">Total Followers</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[16px] font-bold text-ink">Connected Platforms</h3>
                  <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setShowAddPlatform(true)}>Add</Button>
                </div>
                {currentUser.platforms.length === 0 ? (
                  <div className="bg-cream rounded-[16px] p-5 text-center">
                    <p className="text-[14px] text-smoke mb-3">Connect platforms to grow your audience.</p>
                    <Button variant="primary" size="sm" onClick={() => setShowAddPlatform(true)}>Connect Platform</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentUser.platforms.map((p) => {
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
            <div className="px-5 py-5 space-y-2">
              <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1">Account</p>
              {[
                { icon: User, label: 'Edit Profile', desc: 'Name, bio, photo', onClick: () => {} },
                { icon: Link2, label: 'Social Links', desc: 'Connected platforms', onClick: () => setShowAddPlatform(true) },
                { icon: Shield, label: 'License Verification', desc: currentUser.licenseNumber || 'Not verified', onClick: () => {} },
              ].map((item, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
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
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (i + 3) * 0.04 }}
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

              <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1 pt-4">Plan</p>
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3.5 bg-cream rounded-[14px] p-4 text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-[12px] bg-pearl flex items-center justify-center"><CreditCard size={18} className="text-graphite" /></div>
                <div className="flex-1">
                  <span className="text-[15px] font-medium text-ink block">Subscription</span>
                  <span className="text-[12px] text-smoke">Free plan</span>
                </div>
                <Badge>Free</Badge>
              </motion.button>

              <div className="flex gap-3 pt-4">
                <Button variant="secondary" size="lg" fullWidth icon={<Share2 size={16} />} onClick={handleSharePlot}>
                  Share Reeltor
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
                <span className="text-[12px] text-ash">Reeltor v1.0.0</span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tab bar */}
      <TabBar
        tabs={[
          { id: 'plot', label: 'My Reeltor', icon: <MapPin size={20} /> },
          { id: 'insights', label: 'Insights', icon: <BarChart3 size={20} /> },
          { id: 'audience', label: 'Audience', icon: <Users size={20} /> },
          { id: 'settings', label: 'More', icon: <Settings size={20} /> },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as DashTab)}
        centerAction={{ icon: <Plus size={24} />, onClick: () => navigate('/dashboard/pin/new') }}
      />

      {/* Setup checklist */}
      <SetupChecklist isOpen={showSetup} onClose={() => setShowSetup(false)} user={currentUser} pinCount={pins.length} />

      {/* Pin action sheet (3-dot menu) */}
      <DarkBottomSheet isOpen={!!showPinActions} onClose={() => setShowPinActions(null)} title={showPinActions?.address}>
        <div className="px-5 pb-8 space-y-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { navigate(`/dashboard/pin/${showPinActions?.id}/edit`); setShowPinActions(null) }}
            className="w-full flex items-center gap-3 p-3.5 rounded-[14px] bg-slate text-left">
            <Edit3 size={18} className="text-mist" />
            <span className="text-[15px] font-medium text-white">Edit Pin</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (showPinActions) handleTogglePin(showPinActions.id, !showPinActions.enabled); setShowPinActions(null) }}
            className="w-full flex items-center gap-3 p-3.5 rounded-[14px] bg-slate text-left">
            <EyeOff size={18} className="text-mist" />
            <span className="text-[15px] font-medium text-white">{showPinActions?.enabled ? 'Hide from Map' : 'Show on Map'}</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setShowDeleteConfirm(showPinActions); }}
            className="w-full flex items-center gap-3 p-3.5 rounded-[14px] bg-live-red/10 text-left">
            <Trash2 size={18} className="text-live-red" />
            <span className="text-[15px] font-medium text-live-red">Delete Pin</span>
          </motion.button>
        </div>
      </DarkBottomSheet>

      {/* Delete confirm */}
      <DarkBottomSheet isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Delete this pin?">
        <div className="px-5 pb-8 space-y-4">
          <p className="text-[14px] text-mist">This will permanently remove the pin and all its data. This can't be undone.</p>
          <div className="flex gap-3">
            <Button variant="glass" size="lg" fullWidth onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="lg" fullWidth onClick={() => showDeleteConfirm && handleDeletePin(showDeleteConfirm.id)}>Delete</Button>
          </div>
        </div>
      </DarkBottomSheet>

      {/* Add platform sheet */}
      <AddPlatformSheet isOpen={showAddPlatform} onClose={() => setShowAddPlatform(false)} onAdd={handleAddPlatform} existingPlatforms={currentUser.platforms} />
    </div>
  )
}

// ── Add Platform Sub-component ──

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
