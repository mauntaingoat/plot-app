import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, BarChart3, Users, Settings, Plus,
  Eye, MousePointerClick, Bookmark,
  ExternalLink, LogOut, ChevronRight, Bell, CreditCard,
  User, Home,
} from 'lucide-react'
import { TabBar } from '@/components/ui/TabBar'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { PinCard } from '@/components/dashboard/PinCard'
import { StatCard } from '@/components/dashboard/StatCard'
import { SetupRing } from '@/components/dashboard/SetupRing'
import { InsightsChart } from '@/components/dashboard/InsightsChart'
import { useAuthStore } from '@/stores/authStore'
import { firebaseConfigured } from '@/config/firebase'
import { MOCK_PINS_CAROLINA, MOCK_CURRENT_USER } from '@/lib/mock'
import { PIN_CONFIG, type Pin } from '@/lib/types'

type DashTab = 'plot' | 'insights' | 'audience' | 'settings'

export default function Dashboard() {
  const navigate = useNavigate()
  const { userDoc, setUserDoc } = useAuthStore()
  const [activeTab, setActiveTab] = useState<DashTab>('plot')

  // In demo mode, ensure we have a user doc
  const currentUser = userDoc || (!firebaseConfigured ? MOCK_CURRENT_USER : null)

  // Use mock pins in demo mode (pretend they're the agent's)
  const [pins] = useState<Pin[]>(!firebaseConfigured ? MOCK_PINS_CAROLINA : [])

  // Aggregated stats
  const stats = useMemo(() => {
    let views = 0, taps = 0, saves = 0
    pins.forEach((p) => { views += p.views; taps += p.taps; saves += p.saves })
    return { views, taps, saves, pins: pins.length }
  }, [pins])

  // Chart data
  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((label, i) => ({ label, value: [78, 125, 94, 156, 203, 187, 142][i] }))
  }, [])

  const handleSignOut = () => {
    setUserDoc(null)
    navigate('/')
  }

  if (!currentUser) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-ivory pb-tab-safe">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-xl border-b border-border-light">
        <div
          className="px-5 flex items-center justify-between"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)', paddingBottom: '12px' }}
        >
          <div className="flex items-center gap-3">
            <Avatar src={currentUser.photoURL} name={currentUser.displayName || 'Agent'} size={36} />
            <div>
              <p className="text-[16px] font-bold text-ink tracking-tight">
                {activeTab === 'plot' ? 'My Plot' : activeTab === 'insights' ? 'Insights' : activeTab === 'audience' ? 'Audience' : 'Settings'}
              </p>
              <p className="text-[12px] text-smoke">@{currentUser.username || 'mau'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.setupPercent < 100 && (
              <SetupRing percent={currentUser.setupPercent} />
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<ExternalLink size={14} />}
              onClick={() => navigate('/carolina')}
            >
              Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* My Plot */}
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
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => navigate('/dashboard/pin/new')}>
                  Add Pin
                </Button>
              </div>

              {pins.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-cream rounded-[20px] p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-tangerine-soft mx-auto mb-4 flex items-center justify-center">
                    <MapPin size={28} className="text-tangerine" />
                  </div>
                  <h3 className="text-[18px] font-bold text-ink mb-1">Drop your first pin</h3>
                  <p className="text-[14px] text-smoke mb-5">Add a listing, story, or open house to your map.</p>
                  <Button variant="primary" size="lg" icon={<Plus size={18} />} onClick={() => navigate('/dashboard/pin/new')}>
                    Create Pin
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {pins.map((pin, i) => (
                    <motion.div key={pin.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <PinCard pin={pin} variant="manage" dark={false} onToggle={() => {}} onMore={() => {}} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Insights */}
          {activeTab === 'insights' && (
            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Views" value={stats.views} change={12} icon={<Eye size={18} />} format="compact" />
                <StatCard label="Taps" value={stats.taps} change={8} icon={<MousePointerClick size={18} />} color="#3B82F6" format="compact" />
                <StatCard label="Saves" value={stats.saves} change={-3} icon={<Bookmark size={18} />} color="#A855F7" format="compact" />
                <StatCard label="Followers" value={currentUser.followerCount} change={15} icon={<Users size={18} />} color="#34C759" />
              </div>

              <InsightsChart data={chartData} />

              {pins.length > 0 && (
                <div>
                  <h3 className="text-[14px] font-bold text-ink mb-3">Top Performing</h3>
                  <div className="space-y-2">
                    {[...pins].sort((a, b) => b.views - a.views).slice(0, 3).map((pin, i) => (
                      <div key={pin.id} className="flex items-center gap-3 bg-cream rounded-[14px] p-3">
                        <span className="text-[18px] font-extrabold text-tangerine/30 font-mono w-6 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink truncate">{pin.address}</p>
                          <p className="text-[11px] text-smoke">{PIN_CONFIG[pin.type].label}</p>
                        </div>
                        <span className="text-[14px] font-bold text-ink font-mono">{pin.views}</span>
                        <Eye size={12} className="text-ash" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audience */}
          {activeTab === 'audience' && (
            <div className="px-5 py-5 space-y-6">
              <div className="bg-cream rounded-[20px] p-6 text-center">
                <p className="text-[40px] font-extrabold text-ink font-mono">{currentUser.followerCount}</p>
                <p className="text-[14px] text-smoke font-medium">Total Followers</p>
              </div>

              <div>
                <h3 className="text-[16px] font-bold text-ink mb-3">Connected Platforms</h3>
                {currentUser.platforms.length === 0 ? (
                  <div className="bg-cream rounded-[16px] p-5 text-center">
                    <p className="text-[14px] text-smoke mb-3">No platforms connected yet.</p>
                    <Button variant="secondary" size="sm" onClick={() => setActiveTab('settings')}>Add platforms</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentUser.platforms.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 bg-cream rounded-[14px] p-3">
                        <div className="w-8 h-8 rounded-lg bg-pearl flex items-center justify-center">
                          <span className="text-[14px] font-bold text-smoke capitalize">{p.id[0]}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[14px] font-semibold text-ink capitalize">{p.id}</p>
                          <p className="text-[12px] text-smoke">@{p.username}</p>
                        </div>
                        <ChevronRight size={16} className="text-ash" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="px-5 py-5 space-y-2">
              {[
                { icon: User, label: 'Edit Profile', onClick: () => {} },
                { icon: Home, label: 'Go Home', onClick: () => navigate('/') },
                { icon: Bell, label: 'Notifications', onClick: () => {} },
                { icon: CreditCard, label: 'Subscription', badge: 'Free', onClick: () => {} },
                { icon: ExternalLink, label: 'View as Consumer', onClick: () => navigate('/carolina') },
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
                  <div className="w-10 h-10 rounded-[12px] bg-pearl flex items-center justify-center">
                    <item.icon size={18} className="text-graphite" />
                  </div>
                  <span className="flex-1 text-[15px] font-medium text-ink">{item.label}</span>
                  {item.badge && <Badge>{item.badge}</Badge>}
                  <ChevronRight size={16} className="text-ash" />
                </motion.button>
              ))}

              <div className="pt-6">
                <Button variant="danger" size="lg" fullWidth icon={<LogOut size={16} />} onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
              <p className="text-center text-[11px] text-ash pt-4">Plot v1.0.0</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tab bar */}
      <TabBar
        tabs={[
          { id: 'plot', label: 'My Plot', icon: <MapPin size={20} /> },
          { id: 'insights', label: 'Insights', icon: <BarChart3 size={20} /> },
          { id: 'audience', label: 'Audience', icon: <Users size={20} /> },
          { id: 'settings', label: 'More', icon: <Settings size={20} /> },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as DashTab)}
        centerAction={{
          icon: <Plus size={24} />,
          onClick: () => navigate('/dashboard/pin/new'),
        }}
      />
    </div>
  )
}
