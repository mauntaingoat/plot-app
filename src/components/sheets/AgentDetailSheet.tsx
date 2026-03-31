import { motion } from 'framer-motion'
import { ExternalLink, MapPin, Award, UserPlus, UserCheck } from 'lucide-react'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PLATFORM_LOGOS, PLATFORM_LIST } from '@/components/icons/PlatformLogos'
import type { UserDoc } from '@/lib/types'

interface AgentDetailSheetProps {
  isOpen: boolean
  onClose: () => void
  agent: UserDoc
  isFollowing: boolean
  onFollow: () => void
  nearbyAgents?: UserDoc[]
  onAgentTap?: (agent: UserDoc) => void
}

export function AgentDetailSheet({ isOpen, onClose, agent, isFollowing, onFollow, nearbyAgents = [], onAgentTap }: AgentDetailSheetProps) {
  return (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose}>
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

        {/* Bio */}
        {agent.bio && (
          <p className="text-[14px] text-mist leading-relaxed">{agent.bio}</p>
        )}

        {/* Follow button */}
        <Button
          variant={isFollowing ? 'glass' : 'primary'}
          size="lg"
          fullWidth
          icon={isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
          onClick={onFollow}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Button>

        {/* Connected platforms */}
        {agent.platforms.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-ghost uppercase tracking-wider mb-3">Links</h3>
            <div className="flex flex-wrap gap-2">
              {agent.platforms.map((p) => {
                const Logo = PLATFORM_LOGOS[p.id]
                const name = PLATFORM_LIST.find((pl) => pl.id === p.id)?.name || p.id
                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 bg-slate rounded-full px-3.5 py-2 cursor-pointer"
                  >
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

        {/* Nearby agents */}
        {nearbyAgents.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-ghost uppercase tracking-wider mb-3">Agents nearby</h3>
            <div className="space-y-2">
              {nearbyAgents.map((a) => (
                <motion.button
                  key={a.uid}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onAgentTap?.(a)}
                  className="w-full flex items-center gap-3 bg-slate rounded-[14px] p-3 text-left cursor-pointer"
                >
                  <Avatar src={a.photoURL} name={a.displayName} size={40} ring="story" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white truncate">{a.displayName}</p>
                    <p className="text-[12px] text-ghost">@{a.username} · {a.followerCount} followers</p>
                  </div>
                  <MapPin size={14} className="text-ghost" />
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </DarkBottomSheet>
  )
}
