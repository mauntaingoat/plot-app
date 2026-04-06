import { motion, AnimatePresence } from 'framer-motion'
import { X, Bookmark } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { UserDoc, Pin } from '@/lib/types'

export type SidebarPanelType = 'selectAgent' | 'following' | 'exploreAll' | 'saved' | null

interface SidebarPanelsProps {
  sidebarPanel: SidebarPanelType
  setSidebarPanel: (panel: SidebarPanelType) => void
  sidebarWidth: number
  agent: UserDoc
  nearbyAgents: UserDoc[]
  enabledAgentIds: Set<string>
  onToggleAgent: (id: string) => void
  onSelectAgent: (agent: UserDoc) => void
  onSetMode: (mode: 'single' | 'following' | 'explore') => void
  isSignedIn: boolean
  onAuthRequired: () => void
  savedPins?: Pin[]
}

const PANEL_TITLES: Record<Exclude<SidebarPanelType, null>, string> = {
  selectAgent: 'Select Agent',
  following: 'Following',
  exploreAll: 'Explore All',
  saved: 'Saved',
}

export function SidebarPanels({
  sidebarPanel,
  setSidebarPanel,
  sidebarWidth,
  agent,
  nearbyAgents,
  enabledAgentIds,
  onToggleAgent,
  onSelectAgent,
  onSetMode,
  isSignedIn,
  onAuthRequired,
  savedPins = [],
}: SidebarPanelsProps) {
  return (
    <AnimatePresence>
      {sidebarPanel && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65]"
            style={{ left: sidebarWidth }}
            onClick={() => setSidebarPanel(null)}
          />
          <motion.div
            initial={{ x: -(sidebarWidth + 340) }}
            animate={{ x: 0 }}
            exit={{ x: -(sidebarWidth + 340) }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-0 bottom-0 z-[65] flex flex-col overflow-hidden"
            style={{ left: sidebarWidth, width: 340, background: '#1A1C26', borderRight: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Panel header */}
            <div className="px-5 pt-5 pb-4 shrink-0 flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-white">
                {PANEL_TITLES[sidebarPanel]}
              </h2>
              <button onClick={() => setSidebarPanel(null)} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/50 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {/* Select Agent panel — single-select from followed agents */}
              {sidebarPanel === 'selectAgent' && (
                <div className="space-y-4">
                  <p className="text-[13px] text-white/40 mb-2">Pick an agent to view their Reelst</p>
                  {[agent, ...nearbyAgents].map((a) => (
                    <button key={a.uid} onClick={() => { onSelectAgent(a); setSidebarPanel(null) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${a.uid === agent.uid ? 'bg-tangerine/15 border border-tangerine/20' : 'bg-white/5 hover:bg-white/8'}`}>
                      <Avatar src={a.photoURL} name={a.displayName} size={36} ring={a.uid === agent.uid ? 'story' : 'none'} />
                      <div className="text-left min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate">{a.displayName}</p>
                        <p className="text-[11px] text-white/40">@{a.username}</p>
                      </div>
                      {a.uid === agent.uid && <span className="ml-auto text-[10px] text-tangerine font-bold uppercase">Viewing</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Following panel — multi-select toggles */}
              {sidebarPanel === 'following' && (
                <div className="space-y-4">
                  <p className="text-[13px] text-white/40 mb-2">Toggle agents to show on map</p>
                  {nearbyAgents.map((a) => (
                    <button key={a.uid} onClick={() => { onToggleAgent(a.uid); onSetMode('following') }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${enabledAgentIds.has(a.uid) ? 'bg-tangerine/15 border border-tangerine/20' : 'bg-white/5 hover:bg-white/8'}`}>
                      <Avatar src={a.photoURL} name={a.displayName} size={36} ring="none" />
                      <div className="text-left min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate">{a.displayName}</p>
                        <p className="text-[11px] text-white/40">@{a.username}</p>
                      </div>
                      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${enabledAgentIds.has(a.uid) ? 'border-tangerine bg-tangerine' : 'border-white/20'}`}>
                        {enabledAgentIds.has(a.uid) && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Explore All panel */}
              {sidebarPanel === 'exploreAll' && (
                <div className="space-y-4">
                  <p className="text-[13px] text-white/40 mb-2">See all agents in your current map viewport. Pan and zoom to discover new agents.</p>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onSetMode('explore'); setSidebarPanel(null) }}
                    className="w-full py-3 rounded-xl bg-tangerine text-white font-semibold text-[14px] cursor-pointer hover:bg-ember transition-colors">
                    Explore All Agents
                  </motion.button>
                </div>
              )}

              {/* Saved panel */}
              {sidebarPanel === 'saved' && (
                <div className="space-y-4">
                  {!isSignedIn ? (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Bookmark size={22} className="text-white/20" />
                      </div>
                      <p className="text-[14px] font-semibold text-white mb-1">Sign in to save</p>
                      <p className="text-[13px] text-white/40 mb-5">Save listings and content from any agent to build your personal map.</p>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setSidebarPanel(null); onAuthRequired() }}
                        className="px-6 py-2.5 rounded-xl bg-tangerine text-white font-semibold text-[13px] cursor-pointer hover:bg-ember transition-colors">
                        Sign in
                      </motion.button>
                    </div>
                  ) : savedPins.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Bookmark size={22} className="text-white/20" />
                      </div>
                      <p className="text-[14px] font-semibold text-white mb-1">No saves yet</p>
                      <p className="text-[13px] text-white/40">Tap the bookmark icon on any listing to save it here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[13px] text-white/40 mb-2">{savedPins.length} saved listing{savedPins.length !== 1 ? 's' : ''}</p>
                      {savedPins.map((pin) => (
                        <div key={pin.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
                          {pin.content?.[0]?.thumbnailUrl ? (
                            <img src={pin.content[0].thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/8 flex items-center justify-center">
                              <Bookmark size={14} className="text-white/30" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-white truncate">{pin.address}</p>
                            <p className="text-[11px] text-white/40">{'price' in pin ? `$${(pin as any).price?.toLocaleString()}` : pin.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
