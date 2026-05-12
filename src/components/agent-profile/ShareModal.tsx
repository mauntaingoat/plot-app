import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Link as LinkIcon,
  Envelope as Mail,
  ChatCenteredText as MessageSquare,
  InstagramLogo,
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
   Social row: Instagram (story image) · Facebook · X · WhatsApp ·
                Messenger · LinkedIn · Threads
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
  /** Optional hero image URL (listing photo / content thumbnail) used
   *  to compose the downloadable Instagram-story image. When omitted
   *  the IG button still works but generates a logo-only card. */
  heroImageUrl?: string | null
  /** Agent display name — surfaced on the IG-story canvas card. */
  agentName?: string
}

export function ShareModal({
  isOpen,
  onClose,
  url,
  title,
  message,
  heroImageUrl,
  agentName,
}: ShareModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const { mounted, visible } = useSheetLifecycle(isOpen, 320)
  useSwipeToDismiss(sheetRef, null, mounted && visible, () => onClose())

  const [copied, setCopied] = useState(false)
  const [igGenerating, setIgGenerating] = useState(false)

  // Desktop = no touch input + wider screen. On desktop we hide the
  // Instagram story button entirely (IG has no public web intent for
  // posting stories — only the mobile app does), so the "share" there
  // would mean "download an image and figure it out yourself," which
  // we don't want to ship.
  const isDesktop =
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: fine)').matches &&
    window.innerWidth >= 768

  // The CSS tokens we use (--page-canvas, --text-primary, etc.) are
  // set by AgentProfile's route wrapper for the public-profile case.
  // When opened from Dashboard (which sits in its own dark-themed
  // surface), those tokens aren't defined for the modal's portal-like
  // mount point, so we fall back to a light palette and look wrong on
  // a dark dashboard. Detect the dashboard's dark class and apply the
  // matching palette inline. The shared brand accent stays the same.
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark-dashboard')
  const palette = isDark
    ? {
        pageCanvas: '#141826',
        textPrimary: '#F4F5F8',
        textSecondary: '#C9CDDA',
        textMuted: '#8A91A3',
        surface2: 'rgba(255,255,255,0.06)',
        accent: '#D94A1F',
        accentInk: '#FFFFFF',
      }
    : {
        pageCanvas: '#FAFAF8',
        textPrimary: '#0A0E1A',
        textSecondary: '#475569',
        textMuted: '#94A3B8',
        surface2: 'rgba(0,0,0,0.05)',
        accent: '#D94A1F',
        accentInk: '#FFFFFF',
      }

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

  // FB and LinkedIn no longer accept prefilled-text params (FB removed
  // `quote=` after 2017, LinkedIn deprecated `summary=`/`title=` in
  // 2021). Both scrape OG tags from the destination URL — so a "good
  // premade post" means good `og:title` / `og:description` / `og:image`
  // on the public profile page, not URL params here.
  const onFacebook = () => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`)
  const onTwitter = () => open(`https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(shareText)}`)
  const onWhatsapp = () => open(`https://wa.me/?text=${enc(`${shareText} ${shareUrl}`)}`)
  const onLinkedIn = () => open(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`)

  // Instagram has no public web-stories share intent. On mobile (iOS
  // Safari especially) we can hand the rendered story image to
  // `navigator.share({ files })` — the native share sheet surfaces
  // Instagram with a one-tap "Add to Story" path. If that's not
  // available (older mobile browsers, Android quirks), we fall back
  // to download + open instagram.com. The button is hidden on desktop
  // entirely since there's no good story-posting path there.
  const onInstagram = async () => {
    setIgGenerating(true)
    try {
      const blob = await renderStoryImage({ heroImageUrl: heroImageUrl ?? null, title, agentName })
      const filename = `reelst-${slugify(title)}.png`
      const file = new File([blob], filename, { type: 'image/png' })

      const navAny = navigator as any
      const canShareFile = typeof navAny.canShare === 'function' && navAny.canShare({ files: [file] })

      if (canShareFile && typeof navAny.share === 'function') {
        try {
          await navAny.share({ files: [file], title })
          return
        } catch {
          // User canceled or share failed — fall through to download.
        }
      }

      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000)
      open('https://www.instagram.com/')
    } catch (err) {
      console.warn('[ShareModal] story image render failed', err)
    } finally {
      setIgGenerating(false)
    }
  }

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
          ['--page-canvas' as any]: palette.pageCanvas,
          ['--text-primary' as any]: palette.textPrimary,
          ['--text-secondary' as any]: palette.textSecondary,
          ['--text-muted' as any]: palette.textMuted,
          ['--surface-2' as any]: palette.surface2,
          ['--accent' as any]: palette.accent,
          ['--accent-ink' as any]: palette.accentInk,
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
                color: 'var(--accent)',
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
            <button
              onClick={onCopy}
              className="px-3 py-1 rounded-full text-[11.5px] font-bold cursor-pointer transition-colors"
              style={{
                background: copied ? 'var(--accent)' : 'var(--text-primary)',
                color: copied ? 'var(--accent-ink, #fff)' : 'var(--page-canvas)',
              }}
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

          {/* Socials grid — IG hidden on desktop (no story-post path on
              web); Messenger + Threads removed entirely. */}
          <div className="grid grid-cols-4 gap-2">
            {!isDesktop && (
              <SocialAction
                icon={<InstagramLogo size={20} weight="bold" />}
                label={igGenerating ? 'Saving…' : 'Story'}
                onClick={onInstagram}
                tint="linear-gradient(135deg,#FFD089,#FF6B3D 50%,#A855F7 100%)"
              />
            )}
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

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'share'
}

/**
 * Renders a 1080×1920 PNG formatted for an Instagram story. Centered
 * hero image (when available) on a Reelst-branded gradient with the
 * title and Reelst URL pinned to the bottom. Returns the raw PNG
 * Blob; the caller chooses whether to hand it to `navigator.share`
 * (mobile native share sheet) or fall back to a download anchor.
 */
async function renderStoryImage({
  heroImageUrl,
  title,
  agentName,
}: {
  heroImageUrl: string | null
  title: string
  agentName?: string
}): Promise<Blob> {
  const W = 1080
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Brand gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#1A1A1A')
  grad.addColorStop(1, '#0A0E17')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Tangerine wash from top
  const wash = ctx.createRadialGradient(W / 2, -200, 100, W / 2, H / 2, H)
  wash.addColorStop(0, 'rgba(217,74,31,0.55)')
  wash.addColorStop(1, 'rgba(217,74,31,0)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, W, H)

  // Hero image (rounded square, centered)
  if (heroImageUrl) {
    try {
      const img = await loadImage(heroImageUrl)
      const size = 800
      const x = (W - size) / 2
      const y = 360
      const r = 48
      ctx.save()
      roundedPath(ctx, x, y, size, size, r)
      ctx.clip()
      const ratio = Math.max(size / img.width, size / img.height)
      const drawW = img.width * ratio
      const drawH = img.height * ratio
      ctx.drawImage(img, x + (size - drawW) / 2, y + (size - drawH) / 2, drawW, drawH)
      ctx.restore()
    } catch {
      /* If the image is CORS-tainted or fails to load, skip it. */
    }
  }

  // Reelst eyebrow
  ctx.fillStyle = '#FF8552'
  ctx.font = '600 32px "Outfit", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('REELST', W / 2, 220)

  // Title
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '600 68px "Outfit", sans-serif'
  ctx.textAlign = 'center'
  wrapText(ctx, title, W / 2, 1320, W - 160, 80)

  // Subtitle (agent or call to action)
  if (agentName) {
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.font = '500 36px "Outfit", sans-serif'
    ctx.fillText(`with ${agentName}`, W / 2, 1500)
  }

  // Footer URL chip
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  roundedPath(ctx, (W - 480) / 2, 1700, 480, 96, 48)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '600 36px "Outfit", sans-serif'
  ctx.fillText('reel.st', W / 2, 1762)

  return new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/png'),
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  // Cap at 3 lines so the layout stays clean.
  const capped = lines.slice(0, 3)
  if (lines.length > 3) capped[2] = capped[2].replace(/\s*\S+$/, '…')
  const startY = y - ((capped.length - 1) * lineHeight) / 2
  capped.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight))
}
