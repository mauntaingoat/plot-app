import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Link as LinkIcon,
  Envelope as Mail,
  ChatCenteredText as MessageSquare,
  FacebookLogo,
  XLogo,
  WhatsappLogo,
  LinkedinLogo,
  Check,
} from '@phosphor-icons/react'
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss'
import { useSheetLifecycle } from '@/hooks/useSheetLifecycle'

/* ════════════════════════════════════════════════════════════════
   SHARE MODAL — universal share sheet
   ────────────────────────────────────────────────────────────────
   Replaces every legacy share button (agent profile, listing
   sheets, map pins, content cards). Layout mirrors SaveAgentModal /
   WaveModal so all engagement primitives feel like one family.

   Quick row: Copy link · Text · Email
   Social row: Facebook · X · WhatsApp · LinkedIn
   (Instagram Story removed — there's no clean web path to auto-launch
   IG Story composer without a registered Meta App ID, and a system-
   share-sheet detour added more friction than value.)

   Mobile: each social button attempts the app's URL scheme first
   (fb://, twitter://, wa.me/, linkedin://) so the user lands directly
   in the target app. If the scheme doesn't resolve (app not installed)
   the click silently falls back to the web sharer URL via a
   visibilitychange race. No iOS system share sheet detour.
   ──────────────────────────────────────────────────────────────── */

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  /** The URL to share. Defaults to current page. */
  url?: string
  /** What's being shared — used as the share title and copy preview. */
  title: string
  /** Optional one-line description used in tweets / SMS / email body. */
  message?: string
}

export function ShareModal({
  isOpen,
  onClose,
  url,
  title,
  message,
}: ShareModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const { mounted, visible } = useSheetLifecycle(isOpen, 320)
  useSwipeToDismiss(sheetRef, null, mounted && visible, () => onClose())

  const [copied, setCopied] = useState(false)

  // Mobile = coarse pointer OR narrow viewport. Used to decide whether
  // a social tap should route through the URL-scheme deep-link path
  // (mobile) vs the web sharer URL (desktop).
  const isMobile =
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768)

  // Theming: rely entirely on the inherited CSS tokens
  // (--page-canvas, --text-primary, --text-secondary, --text-muted,
  // --surface-2, --accent, --accent-ink, --font-mono) set by the
  // agent profile's route wrapper. Matches the SaveAgentModal /
  // WaveModal pattern so all three sheets pick up the agent's
  // palette + font automatically. The dashboard sets its own dark
  // versions of the same tokens via the `.dark-dashboard` class so
  // Share looks right there too without a special-case override.

  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '')
  const shareText = message ?? title

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  const enc = encodeURIComponent

  const open = (href: string) => {
    if (typeof window === 'undefined') return
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
    } catch {
      // Older browsers — fall back to a temporary input.
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy'); setCopied(true) } catch {}
      document.body.removeChild(ta)
    }
  }

  const onSms = () => open(`sms:?&body=${enc(`${shareText} ${shareUrl}`)}`)
  const onEmail = () =>
    open(`mailto:?subject=${enc(title)}&body=${enc(`${shareText}\n\n${shareUrl}`)}`)

  // Mobile: try the app's URL scheme first. iOS treats unknown
  // schemes as no-ops (no error, no app prompt) so we set a timer to
  // fall back to the web URL if the page is still visible after a
  // short window (i.e. the scheme didn't open an app). Cleared if
  // visibility changes (= user got into the app). Desktop: skip the
  // scheme attempt and open the web sharer directly.
  //
  // Why URL schemes vs navigator.share: navigator.share on mobile
  // surfaces the iOS system share sheet, which is one extra tap the
  // user has to make. URL schemes go directly to the target app.
  const openInApp = (scheme: string, webUrl: string) => {
    if (!isMobile) {
      open(webUrl)
      return
    }
    const fallbackId = window.setTimeout(() => {
      window.removeEventListener('visibilitychange', onHide)
      open(webUrl)
    }, 700)
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        window.clearTimeout(fallbackId)
        window.removeEventListener('visibilitychange', onHide)
      }
    }
    window.addEventListener('visibilitychange', onHide)
    window.location.href = scheme
  }

  // FB and LinkedIn no longer accept prefilled-text params via the web
  // sharer (FB removed `quote=` after 2017, LinkedIn deprecated
  // `summary=` in 2021); the destination URL's OG tags are what the
  // preview pulls from — handled by functions/src/og.ts.
  const onFacebook = () =>
    openInApp(
      `fb://share?link=${enc(shareUrl)}`,
      `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
    )
  const onTwitter = () =>
    openInApp(
      `twitter://post?message=${enc(`${shareText} ${shareUrl}`)}`,
      `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(shareText)}`,
    )
  const onWhatsapp = () =>
    // wa.me is itself a universal link — opens WhatsApp app directly
    // on mobile, no scheme detour needed. Web URL handles desktop.
    open(`https://wa.me/?text=${enc(`${shareText} ${shareUrl}`)}`)
  const onLinkedIn = () =>
    openInApp(
      `linkedin://shareArticle?mini=true&url=${enc(shareUrl)}&title=${enc(title)}`,
      `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
    )

  if (!mounted) return null

  return (
    <div
      data-visible={visible}
      className="sheet-stack fixed inset-0 z-[170] flex items-end md:items-center justify-center px-0 md:px-4"
    >
      <div data-visible={visible} onClick={onClose} className="sheet-scrim absolute inset-0" />

      <div
        ref={sheetRef}
        data-visible={visible}
        onClick={(e) => e.stopPropagation()}
        className="capture-sheet relative w-full md:max-w-[440px] rounded-t-[28px] md:rounded-[28px] overflow-hidden"
        style={{
          background: 'var(--page-canvas)',
          color: 'var(--text-primary)',
          boxShadow: '0 -20px 60px -16px rgba(10,14,23,0.35), 0 30px 80px -30px rgba(10,14,23,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          touchAction: 'pan-y',
        }}
      >
        <div className="md:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-black/15" />
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream flex items-center justify-center text-ink hover:bg-pearl transition-colors cursor-pointer z-10"
        >
          <X size={15} />
        </button>

        <div className="px-6 md:px-8 pt-6 md:pt-8 pb-6 md:pb-8">
          <div className="mb-5">
            <p
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Share
            </p>
            <h2
              style={{
                color: 'var(--text-primary)',
                fontSize: '22px',
                fontWeight: 600,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
              }}
            >
              {title}
            </h2>
          </div>

          {/* Link preview row */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-[14px] mb-5"
            style={{ background: 'var(--surface-2, rgba(0,0,0,0.04))' }}
          >
            <LinkIcon size={14} style={{ color: 'var(--text-muted)' }} />
            <span
              className="flex-1 truncate text-[12.5px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {prettyUrl(shareUrl)}
            </span>
            {/* Copy uses the canonical `.brand-btn-flat` (always
                tangerine, white text) so it stays palette-invariant —
                same rule as Subscribe / Send Wave / Add Pin. Earlier
                we tried palette-driven tokens here and they collided
                on pastel themes. */}
            <button
              onClick={onCopy}
              className="brand-btn-flat px-3 py-1 text-[11.5px] font-bold cursor-pointer"
            >
              {copied ? (
                <span className="inline-flex items-center gap-1"><Check size={11} weight="bold" /> Copied</span>
              ) : 'Copy'}
            </button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <QuickAction icon={<LinkIcon size={18} />} label="Copy link" onClick={onCopy} active={copied} />
            <QuickAction icon={<MessageSquare size={18} />} label="Text" onClick={onSms} />
            <QuickAction icon={<Mail size={18} />} label="Email" onClick={onEmail} />
          </div>

          {/* Socials grid — 4 buttons fit one row, mobile taps route
              through the native share sheet (tryNativeShare) so the
              user lands directly in the FB / X / WhatsApp app. */}
          <div className="grid grid-cols-4 gap-2">
            <SocialAction
              icon={<FacebookLogo size={20} weight="bold" />}
              label="Facebook"
              onClick={onFacebook}
              tint="#1877F2"
            />
            <SocialAction
              icon={<XLogo size={18} weight="bold" />}
              label="X"
              onClick={onTwitter}
              tint="#0F1419"
            />
            <SocialAction
              icon={<WhatsappLogo size={20} weight="bold" />}
              label="WhatsApp"
              onClick={onWhatsapp}
              tint="#25D366"
            />
            <SocialAction
              icon={<LinkedinLogo size={20} weight="bold" />}
              label="LinkedIn"
              onClick={onLinkedIn}
              tint="#0A66C2"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-[14px] cursor-pointer transition-colors"
      style={{
        background: active ? 'var(--accent)' : 'var(--surface-2, rgba(0,0,0,0.05))',
        color: active ? 'var(--accent-ink, #fff)' : 'var(--text-primary)',
      }}
    >
      {icon}
      <span className="text-[11.5px] font-semibold">{label}</span>
    </motion.button>
  )
}

function SocialAction({ icon, label, onClick, tint, hint }: { icon: React.ReactNode; label: string; onClick: () => void; tint: string; hint?: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 cursor-pointer"
    >
      <span
        className="relative w-12 h-12 rounded-full flex items-center justify-center text-white"
        style={{ background: tint }}
      >
        {icon}
        {hint && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: 'var(--page-canvas)', color: 'var(--text-primary)' }}
          >
            {hint}
          </span>
        )}
      </span>
      <span className="text-[10.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </motion.button>
  )
}

/* ─────────────── Helpers ─────────────── */

function prettyUrl(u: string) {
  try {
    const parsed = new URL(u)
    return `${parsed.host}${parsed.pathname}`.replace(/\/$/, '') || parsed.host
  } catch {
    return u
  }
}

