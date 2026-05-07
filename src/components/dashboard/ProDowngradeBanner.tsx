import { Warning, Lock, ArrowRight } from '@phosphor-icons/react'
import type { ProAuditResult, ProAuditItem } from '@/lib/proAudit'

/* ════════════════════════════════════════════════════════════════
   PRO DOWNGRADE BANNER
   ────────────────────────────────────────────────────────────────
   Renders at the top of /dashboard when a Free agent still has Pro
   features in use (palette/font/shape, custom colors, custom
   ticker, open houses, active pin overage). Lists each item with a
   "Fix" link that jumps to the relevant tab so the agent can clear
   it inline.

   Pairs with the AgentProfile lockout — both use the same audit so
   the banner items match what's keeping the public profile hidden.
   ──────────────────────────────────────────────────────────────── */

interface Props {
  audit: ProAuditResult
  /** Jump to a dashboard tab — the banner uses this for the per-row
   *  "Fix" buttons and (optionally) the "Settings → Plan" upgrade
   *  CTA on the header. */
  onJumpToTab: (tab: 'reelst' | 'style' | 'settings') => void
}

export function ProDowngradeBanner({ audit, onJumpToTab }: Props) {
  if (!audit.blocked) return null
  const n = audit.items.length

  return (
    <div className="bg-live-red/8 border-b border-live-red/20">
      <div className="max-w-[760px] mx-auto px-5 sm:px-8 py-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-live-red/15 flex items-center justify-center shrink-0">
            <Warning weight="fill" size={16} className="text-live-red" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-ink flex items-center gap-1.5">
              <Lock weight="fill" size={12} className="text-live-red" />
              Profile paused — {n} Pro feature{n === 1 ? '' : 's'} still in use
            </p>
            <p className="text-[12.5px] text-graphite mt-0.5">
              Your public Reelst is hidden until you either downgrade these picks or upgrade back to Pro.
            </p>
          </div>
          <button
            onClick={() => onJumpToTab('settings')}
            className="brand-btn-flat px-3 py-1.5 text-[12px] font-bold cursor-pointer flex items-center gap-1 shrink-0"
          >
            Upgrade <ArrowRight size={11} weight="bold" />
          </button>
        </div>

        <ul className="space-y-1.5 pl-12">
          {audit.items.map((item) => (
            <Item key={item.kind} item={item} onJumpToTab={onJumpToTab} />
          ))}
        </ul>
      </div>
    </div>
  )
}

function Item({ item, onJumpToTab }: { item: ProAuditItem; onJumpToTab: Props['onJumpToTab'] }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-1 h-1 rounded-full bg-live-red mt-[9px] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-ink">
          <span className="font-semibold">{item.label}</span>
          <span className="text-graphite"> — {item.detail}</span>
        </p>
      </div>
      <button
        onClick={() => onJumpToTab(item.fixTab)}
        className="text-[11.5px] font-semibold text-tangerine hover:underline cursor-pointer shrink-0"
      >
        Fix →
      </button>
    </li>
  )
}
