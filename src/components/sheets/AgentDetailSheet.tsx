import { motion } from 'framer-motion'
import { ExternalLink, MapPin, Award, UserPlus, UserCheck, Globe, Users } from 'lucide-react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PLATFORM_LOGOS, PLATFORM_LIST } from '@/components/icons/PlatformLogos'
import type { UserDoc } from '@/lib/types'

export type AgentMode = 'single' | 'following' | 'explore'

interface AgentDetailSheetProps {
  isOpen: boolean
  onClose: () => void
  agent: UserDoc
  isFollowing: boolean
  onFollow: () => void
  nearbyAgents?: UserDoc[]
  enabledAgentIds?: Set<string>
  onToggleAgent?: (agentId: string) => void
  onExploreAll?: () => void
  onAgentTap?: (agent: UserDoc) => void
  isPreview?: boolean
  agentMode?: AgentMode
  onSetMode?: (mode: AgentMode) => void
  mapBounds?: { left: number; right: number }
}

export function AgentDetailSheet({
  isOpen, onClose, agent, isFollowing, onFollow,
  nearbyAgents = [], enabledAgentIds, onToggleAgent, onExploreAll, onAgentTap,
  isPreview, agentMode = 'single', onSetMode, mapBounds,
}: AgentDetailSheetProps) {
  return (
    <ResponsiveSheet isOpen={isOpen} onClose={onClose} dark mapBounds={mapBounds}>
      <div className="px-5 pb-8 space-y-6">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          <Avatar src={agent.photoURL} name={agent.displayName} size={64} ring="story" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-extrabold text-white tracking-tight">{agent.displayName}</h2>
            <p className="text-[13px] text-tangerine font-medium">@{agent.username}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[12px] text-ghost">{agent.followerCount.toLocaleString()} followers</span>
              {agent.brokerage && (
                <span className="text-[12px] text-ghost flex items-center gap-1">
                  <Award size={10} /> {agent.brokerage}
                </span>
              )}
            </div>
          </div>
        </div>

        {agent.bio && <p className="text-[14px] text-mist leading-relaxed">{agent.bio}</p>}

        {/* Follow */}
        <Button
          variant={isFollowing ? 'glass' : 'primary'}
          size="lg"
          fullWidth
          icon={isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
          onClick={onFollow}
          disabled={isPreview}
          className={isPreview ? 'opacity-50' : ''}
        >
          {isPreview ? 'Follow (preview)' : isFollowing ? 'Following' : 'Follow'}
        </Button>

        {/* Platforms */}
        {agent.platforms.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-ghost uppercase tracking-wider mb-3">Links</h3>
            <div className="flex flex-wrap gap-2">
              {agent.platforms.map((p) => {
                const Logo = PLATFORM_LOGOS[p.id]
                const name = PLATFORM_LIST.find((pl) => pl.id === p.id)?.name || p.id
                return (
                  <motion.button key={p.id} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 bg-slate rounded-full px-3.5 py-2 cursor-pointer">
                    {Logo && <Logo size={18} />}
                    <span className="text-[13px] font-medium text-white">{name}</span>
                    <ExternalLink size={11} className="text-ghost" />
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}

        {/* License */}
        {agent.licenseNumber && (
          <div className="flex items-center gap-2 bg-sold-green/10 rounded-[12px] px-4 py-2.5">
            <Award size={16} className="text-sold-green" />
            <div>
              <p className="text-[12px] font-semibold text-sold-green">Licensed Agent</p>
              <p className="text-[11px] text-ghost">{agent.licenseState} #{agent.licenseNumber}</p>
            </div>
          </div>
        )}

        {/* View Mode + Nearby Agents — consumer only */}
        {!isPreview && nearbyAgents.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-ghost uppercase tracking-wider mb-3">View Mode</h3>

            {/* Mode selector */}
            <div className="flex gap-2 mb-4">
              {([
                { mode: 'single' as const, label: 'This Agent', icon: MapPin },
                { mode: 'following' as const, label: 'Following', icon: Users },
                { mode: 'explore' as const, label: 'Explore All', icon: Globe },
              ]).map(({ mode, label, icon: Icon }) => (
                <motion.button
                  key={mode}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSetMode?.(mode)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-[12px] cursor-pointer transition-all ${
                    agentMode === mode
                      ? 'bg-tangerine text-white'
                      : 'bg-slate text-ghost hover:text-mist'
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-[11px] font-semibold">{label}</span>
                </motion.button>
              ))}
            </div>

            {/* Agent list with toggles (for following mode) */}
            {agentMode === 'following' && (
              <div className="space-y-2">
                <p className="text-[12px] text-ghost mb-2">Toggle agents to show their pins on map. Feed shows content from all toggled agents.</p>
                {nearbyAgents.map((a) => {
                  const isEnabled = enabledAgentIds?.has(a.uid) ?? false
                  return (
                    <div key={a.uid} className="flex items-center gap-3 bg-slate rounded-[14px] p-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onAgentTap?.(a)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <Avatar src={a.photoURL} name={a.displayName} size={36} ring="story" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-white truncate">{a.displayName}</p>
                          <p className="text-[11px] text-ghost">@{a.username}</p>
                        </div>
                      </motion.button>
                      {onToggleAgent && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onToggleAgent(a.uid)}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${isEnabled ? 'bg-tangerine' : 'bg-charcoal'}`}
                        >
                          <motion.div
                            animate={{ x: isEnabled ? 20 : 2 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                          />
                        </motion.button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Explore all description */}
            {agentMode === 'explore' && (
              <div className="bg-slate rounded-[14px] p-4">
                <p className="text-[13px] text-mist">
                  Showing pins from all agents in this area. Content feed includes all agents in the region.
                </p>
              </div>
            )}

            {/* Single mode: just show nearby agents to navigate */}
            {agentMode === 'single' && (
              <div className="space-y-2">
                {nearbyAgents.map((a) => (
                  <motion.button
                    key={a.uid}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onAgentTap?.(a)}
                    className="w-full flex items-center gap-3 bg-slate rounded-[14px] p-3 text-left cursor-pointer"
                  >
                    <Avatar src={a.photoURL} name={a.displayName} size={36} ring="story" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{a.displayName}</p>
                      <p className="text-[11px] text-ghost">@{a.username} · {a.followerCount} followers</p>
                    </div>
                    <MapPin size={14} className="text-ghost" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ResponsiveSheet>
  )
}
