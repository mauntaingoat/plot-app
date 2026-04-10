import { motion } from 'framer-motion'
import { ChevronDown, UserPlus, UserCheck, Share2, Locate, Users, Globe, Bookmark } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { UserDoc } from '@/lib/types'
import type { AgentMode } from '@/components/sheets/AgentDetailSheet'

interface AgentPillProps {
  agent: UserDoc
  agentMode: AgentMode
  totalPins: number
  enabledAgentCount: number
  isFollowing: boolean
  isPreview: boolean
  onProfileClick: () => void
  onFollow: () => void
  onShare: () => void
  onFitToPins: () => void
}

export function AgentPill({
  agent,
  agentMode,
  totalPins,
  enabledAgentCount,
  isFollowing,
  isPreview,
  onProfileClick,
  onFollow,
  onShare,
  onFitToPins,
}: AgentPillProps) {
  const renderPillContent = () => {
    if (agentMode === 'following') {
      return (
        <>
          <div className="w-10 h-10 rounded-full bg-tangerine/10 flex items-center justify-center">
            <Users size={18} className="text-tangerine" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[15px] font-bold text-ink">Following</p>
            <p className="text-[11px] font-medium text-smoke">
              {enabledAgentCount} agent{enabledAgentCount !== 1 ? 's' : ''} · {totalPins} pins
            </p>
          </div>
        </>
      )
    }
    if (agentMode === 'explore') {
      return (
        <>
          <div className="w-10 h-10 rounded-full bg-tangerine/10 flex items-center justify-center">
            <Globe size={18} className="text-tangerine" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[15px] font-bold text-ink">Explore All</p>
            <p className="text-[11px] font-medium text-smoke">All agents · {totalPins} pins</p>
          </div>
        </>
      )
    }
    if (agentMode === 'saved') {
      return (
        <>
          <div className="w-10 h-10 rounded-full bg-tangerine/10 flex items-center justify-center">
            <Bookmark size={18} className="text-tangerine" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[15px] font-bold text-ink">My Saved Map</p>
            <p className="text-[11px] font-medium text-smoke">{totalPins} saved pins</p>
          </div>
        </>
      )
    }
    return (
      <>
        <Avatar src={agent.photoURL} name={agent.displayName} size={44} ring="story" />
        <div className="min-w-0 text-left">
          <p className="text-[15px] font-bold text-ink truncate">{agent.displayName}</p>
          <p className="text-[11px] font-medium text-smoke">
            {totalPins} pins · {agent.followerCount.toLocaleString()} followers
          </p>
        </div>
      </>
    )
  }

  return (
    <div className="absolute top-4 left-0 right-0 z-[40] flex items-center justify-center pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        <motion.button
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
          whileTap={{ scale: 0.97 }}
          onClick={onProfileClick}
          className="bg-white/95 backdrop-blur-md rounded-full flex items-center gap-3 pl-2 pr-4 py-2 border border-black/5 cursor-pointer"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
        >
          {renderPillContent()}
          <ChevronDown size={14} className="text-smoke ml-1" />
        </motion.button>
        {agentMode === 'single' && (
          <motion.button whileTap={!isPreview ? { scale: 0.88 } : undefined} onClick={!isPreview ? onFollow : undefined}
            className={`bg-white/90 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center cursor-pointer border border-black/5 ${isFollowing ? 'text-tangerine' : 'text-ink'} ${isPreview ? 'opacity-40' : ''}`}
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
            {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
          </motion.button>
        )}
        <motion.button whileTap={!isPreview ? { scale: 0.88 } : undefined} onClick={!isPreview ? onShare : undefined}
          className={`bg-white/90 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center text-ink cursor-pointer border border-black/5 ${isPreview ? 'opacity-40' : ''}`}
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          <Share2 size={15} />
        </motion.button>
        {agentMode !== 'explore' && (
          <motion.button whileTap={{ scale: 0.88 }} onClick={onFitToPins}
            className="bg-white/90 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center text-ink cursor-pointer border border-black/5"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
            <Locate size={15} />
          </motion.button>
        )}
      </div>
    </div>
  )
}
