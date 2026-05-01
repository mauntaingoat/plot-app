import { motion } from 'framer-motion'
import { Heart, Check } from '@phosphor-icons/react'/* ════════════════════════════════════════════════════════════════
   SAVE AGENT PILL — fixed-bottom CTA on the agent profile.
   Hidden during fullscreen-map and immersive-reel viewer states.
   Shows a checked / "Saved" state when the local session has
   already submitted an email for this agent.
   ──────────────────────────────────────────────────────────────── */

interface SaveAgentPillProps {
  agentName: string
  saved: boolean
  onClick: () => void
  /** Hide the pill entirely (when user is in a fullscreen subview). */
  hidden?: boolean
  /** Optional accent override for premium customization. */
  accent?: string
}

export function SaveAgentPill({
  agentName,
  saved,
  onClick,
  hidden,
  accent,
}: SaveAgentPillProps) {
  return (
    <>
      {/* Footer nav-bar — solid surface behind the pill so scrolled
          card content terminates at the top edge of the bar instead
          of bleeding past the pill. Tight: just enough room to host
          the pill plus safe-area inset, no extra padding. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed bottom-0 left-0 right-0 z-[55] pointer-events-none"
        style={{
          height: 'calc(max(env(safe-area-inset-bottom, 12px), 12px) + 72px)',
        }}
      >
        <div
          className="mx-auto h-full w-full"
          style={{
            maxWidth: '720px',
            background: 'var(--color-ivory)',
          }}
        />
      </motion.div>

      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: hidden ? 80 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed bottom-0 left-0 right-0 z-[60] pb-3 pt-2 pointer-events-none"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)',
        }}
      >
        {/* Button matches the width of the map peek and listing grid:
            same 720px card max-width, same `px-5 md:px-7` content
            padding, then `w-full` button — so it lines up edge-to-edge
            with the cards above it. */}
        <div className="mx-auto pointer-events-none px-5 md:px-7" style={{ maxWidth: '720px' }}>
          <button
            onClick={onClick}
            disabled={saved}
            className="brand-btn-flat w-full h-14 rounded-full inline-flex items-center justify-center gap-2.5 cursor-pointer pointer-events-auto"
            style={{
              fontFamily: 'var(--font-humanist)',
              fontSize: '15.5px',
              fontWeight: 600,
              letterSpacing: '-0.005em',
              background: accent || 'var(--brand-grad)',
              boxShadow: saved
                ? '0 8px 22px -6px rgba(52,199,89,0.4), inset 0 1px 0 rgba(255,255,255,0.24)'
                : '0 10px 28px -6px rgba(217,74,31,0.5), inset 0 1px 0 rgba(255,255,255,0.24)',
              opacity: hidden ? 0 : 1,
            }}
          >
            {saved ? (
              <>
                <Check weight="bold" size={18} />
                Saved {agentName}
              </>
            ) : (
              <>
                <Heart weight="fill" size={17} />
                Save {agentName}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </>
  )
}
