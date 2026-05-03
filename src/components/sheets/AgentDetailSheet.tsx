import { motion } from 'framer-motion'
import { ArrowSquareOut as ExternalLink, Medal as Award } from '@phosphor-icons/react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Avatar } from '@/components/ui/Avatar'
import { PLATFORM_LOGOS, PLATFORM_LIST, platformUrl } from '@/components/icons/PlatformLogos'
import type { UserDoc } from '@/lib/types'

interface AgentDetailSheetProps {
  isOpen: boolean
  onClose: () => void
  agent: UserDoc
  isPreview?: boolean
  mapBounds?: { left: number; right: number }
  currentUser?: UserDoc | null
  onAccountTap?: () => void
  onSignIn?: () => void
}

export function AgentDetailSheet({
  isOpen, onClose, agent,
  mapBounds,
  currentUser, onAccountTap, onSignIn,
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
              {agent.brokerage && (
                <span className="text-[12px] text-ghost flex items-center gap-1">
                  <Award size={10} /> {agent.brokerage}
                </span>
              )}
            </div>
          </div>
        </div>

        {agent.bio && <p className="text-[14px] text-mist leading-relaxed">{agent.bio}</p>}

        {/* Platforms */}
        {agent.platforms.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-ghost uppercase tracking-wider mb-3">Links</h3>
            <div className="flex flex-wrap gap-2">
              {agent.platforms.map((p) => {
                const Logo = PLATFORM_LOGOS[p.id]
                const name = PLATFORM_LIST.find((pl) => pl.id === p.id)?.name || p.id
                return (
                  <motion.a key={p.id} href={platformUrl(p)} target="_blank" rel="noopener noreferrer" whileTap={{ scale: 0.95 }} className="flex items-center gap-2 bg-slate rounded-full px-3.5 py-2 cursor-pointer hover:bg-charcoal transition-colors">
                    {Logo && <Logo size={18} />}
                    <span className="text-[13px] font-medium text-white">{name}</span>
                    <ExternalLink size={11} className="text-ghost" />
                  </motion.a>
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

        {/* Your account section */}
        <div className="border-t border-white/6 pt-4 mt-4">
          {currentUser ? (
            <button onClick={onAccountTap}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 cursor-pointer hover:bg-white/8 transition-colors text-left">
              <Avatar src={currentUser.photoURL} name={currentUser.displayName || 'You'} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white truncate">{currentUser.displayName}</p>
                <p className="text-[11px] text-ghost truncate">@{currentUser.username}</p>
              </div>
            </button>
          ) : (
            <button onClick={onSignIn}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-tangerine/10 text-tangerine text-[13px] font-semibold cursor-pointer hover:bg-tangerine/15 transition-colors">
              Sign in
            </button>
          )}
        </div>
      </div>
    </ResponsiveSheet>
  )
}
