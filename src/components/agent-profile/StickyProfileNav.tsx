/**
 * StickyProfileNav — compact identity bar that fades in once the
 * full header (avatar + name) has scrolled past, and fades out the
 * moment the user scrolls back to the top. Mirrors the IG / Spotify
 * profile pattern so the agent's identity always stays anchored at
 * the top of the surface even when the user is deep in the listings
 * or links stack.
 *
 * Contents: compact avatar (32px) + name + verified tick on the
 * left, heart (save) + share on the right. No bio, no ticker —
 * those belong to the full header.
 *
 * Positioning: `position: fixed` top-center, width-matched to the
 * agent-profile-card (720px max, narrower on landscape phone), so
 * on desktop it floats centered over the card and on mobile it
 * spans the full viewport width.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { SealCheck as BadgeCheck, HandWaving, Heart, Check, ShareNetwork as Share2 } from '@phosphor-icons/react'
import { Avatar } from '@/components/ui/Avatar'
import type { Palette } from '@/lib/style/palettes'
import type { FontPairing } from '@/lib/style/fonts'
import type { UserDoc } from '@/lib/types'

interface Props {
  visible: boolean
  agent: UserDoc
  agentPhotoUrl?: string | null
  palette: Palette
  font: FontPairing
  saved: boolean
  onSaveClick: () => void
  onWaveClick: () => void
  onShareClick: () => void
  /** Card max-width — matches the agent-profile-card container so
   *  the sticky bar floats centered over the card on desktop and
   *  spans the viewport on mobile. */
  maxWidth: number
}

export function StickyProfileNav({
  visible,
  agent,
  agentPhotoUrl,
  palette,
  font,
  saved,
  onSaveClick,
  onWaveClick,
  onShareClick,
  maxWidth,
}: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sticky-profile-nav"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed top-0 left-0 right-0 z-[60] mx-auto pointer-events-none"
          style={{ maxWidth }}
        >
          <div
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 md:px-5 border-b"
            style={{
              // Tint the bar with the palette's card background and
              // a soft blur so the content scrolling beneath reads
              // as muted, not blocked. Border picks up the palette's
              // own border token for cohesion.
              background: `color-mix(in srgb, ${palette.cardBg} 88%, transparent)`,
              backdropFilter: 'saturate(180%) blur(14px)',
              WebkitBackdropFilter: 'saturate(180%) blur(14px)',
              borderColor: palette.border,
              paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
              paddingBottom: 8,
              fontFamily: font.body,
            }}
          >
            {/* Left: avatar + name + verified tick */}
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                src={agentPhotoUrl ?? agent.photoURL}
                name={agent.displayName}
                size={32}
                ring="none"
              />
              <div className="flex items-center gap-1 min-w-0">
                <span
                  className="truncate"
                  style={{
                    fontFamily: font.display,
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    color: palette.textPrimary,
                    lineHeight: 1.15,
                  }}
                >
                  {agent.displayName || agent.username || 'Agent'}
                </span>
                {agent.verificationStatus === 'verified' && (
                  <BadgeCheck
                    weight="fill"
                    size={15}
                    className="shrink-0"
                    style={{ color: palette.accent }}
                    aria-label="Verified agent"
                  />
                )}
              </div>
            </div>

            {/* Right: heart + share. Tight pair, same sizing as the
                expanded-map chrome so the visual language stays
                consistent across the two top-anchored bars. */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onSaveClick}
                aria-label={saved ? 'Subscribed' : 'Subscribe'}
                className="rounded-full w-8 h-8 flex items-center justify-center cursor-pointer border border-black/5"
                style={{
                  background: saved ? '#34C759' : 'rgba(255,255,255,0.96)',
                  color: saved ? '#fff' : '#1A1A1A',
                }}
              >
                {saved ? <Check weight="bold" size={13} /> : <Heart weight="bold" size={13} />}
              </button>
              <button
                onClick={onWaveClick}
                aria-label="Wave"
                className="rounded-full w-8 h-8 flex items-center justify-center cursor-pointer border border-black/5"
                style={{ background: 'rgba(255,255,255,0.96)', color: '#1A1A1A' }}
              >
                <HandWaving weight="bold" size={13} />
              </button>
              <button
                onClick={onShareClick}
                aria-label="Share"
                className="rounded-full w-8 h-8 flex items-center justify-center cursor-pointer border border-black/5"
                style={{ background: 'rgba(255,255,255,0.96)', color: '#1A1A1A' }}
              >
                <Share2 size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
