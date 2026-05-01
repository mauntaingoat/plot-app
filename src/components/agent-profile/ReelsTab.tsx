import { useMemo } from 'react'
import { Play, Images, Eye } from '@phosphor-icons/react'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import type { Pin, ContentItem, UserDoc } from '@/lib/types'
import { isContentPublished } from '@/lib/contentVisibility'
import { formatCompact } from '@/lib/format'

/* ════════════════════════════════════════════════════════════════
   REELS TAB — Instagram-Reels-style 9:16 grid → tap to immerse
   ────────────────────────────────────────────────────────────────
   Compact 2-column grid (3 on tablet+) of 9:16 thumbnails. Tap a
   thumbnail → animates to fullscreen ContentFeed in 'immersive'
   viewer mode (rail trimmed to listing + share, X dismiss). Save
   Maya pill stays visible in grid mode and is hidden by the parent
   while immersive.
   ──────────────────────────────────────────────────────────────── */

interface ReelsTabProps {
  pins: Pin[]
  agent: UserDoc
  /** Tap a thumbnail → parent opens the shared immersive viewer
   *  (lifted to AgentProfile so listing cards + reel thumbnails
   *  surface the same TikTok-style flow). */
  onOpenImmersive: (contentId: string) => void
}

interface ReelEntry {
  pin: Pin
  content: ContentItem
}

export function ReelsTab({ pins, agent: _agent, onOpenImmersive }: ReelsTabProps) {
  const reels = useMemo<ReelEntry[]>(() => {
    const entries: ReelEntry[] = []
    for (const pin of pins) {
      if (!pin.enabled) continue
      for (const content of pin.content || []) {
        if (!isContentPublished(content)) continue
        entries.push({ pin, content })
      }
    }
    return entries
  }, [pins])

  if (reels.length === 0) {
    return (
      <div className="px-5 md:px-7 pt-2 pb-32" style={{ fontFamily: 'var(--font-humanist)' }}>
        <EmptyReels />
      </div>
    )
  }

  return (
    <div className="px-5 md:px-7 pt-2 pb-32" style={{ fontFamily: 'var(--font-humanist)' }}>
      <div className="grid grid-cols-3 gap-[2px]">
        {reels.map(({ pin, content }) => (
          <ReelThumbnail
            key={content.id}
            content={content}
            pin={pin}
            onClick={() => onOpenImmersive(content.id)}
          />
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Reel thumbnail ─────────────── */

function ReelThumbnail({
  content,
  pin,
  onClick,
}: {
  content: ContentItem
  pin: Pin
  onClick: () => void
}) {
  const thumb = content.thumbnailUrl
    || (content.type === 'reel' ? content.mediaUrl : (content.mediaUrls?.[0] || content.mediaUrl))
  const isCarousel = content.type === 'carousel'
  const heroFromPin = pin.type !== 'spotlight' && 'heroPhotoUrl' in pin && pin.heroPhotoUrl

  return (
    <button
      onClick={onClick}
      className="group relative block aspect-[4/5] overflow-hidden cursor-pointer bg-cream"
    >
      {thumb ? (
        <ProgressiveImage
          src={thumb}
          alt=""
          className="absolute inset-0 w-full h-full"
          fallback={<ReelTypeFallback isCarousel={isCarousel} />}
        />
      ) : heroFromPin ? (
        <ProgressiveImage src={heroFromPin} alt="" className="absolute inset-0 w-full h-full" fallback={<ReelTypeFallback isCarousel={isCarousel} />} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-tangerine/40 to-ember/60">
          <Play weight="fill" size={20} className="text-white" />
        </div>
      )}

      {/* Bottom gradient for legibility of stats */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Top-left: type icon (carousel vs reel) */}
      <div className="absolute top-2 left-2">
        <div className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
          {isCarousel ? <Images weight="bold" size={12} /> : <Play weight="fill" size={11} />}
        </div>
      </div>

      {/* Bottom-left: views (very subtle, IG-style) */}
      {(content.views || 0) > 0 && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white/95">
          <Eye weight="bold" size={11} />
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '-0.005em' }}>
            {formatCompact(content.views || 0)}
          </span>
        </div>
      )}
    </button>
  )
}

/* ─────────────── Empty state ─────────────── */

function EmptyReels() {
  return (
    <div
      className="rounded-[20px] py-12 px-6 text-center"
      style={{
        background: 'linear-gradient(135deg, rgba(255,133,82,0.06) 0%, rgba(217,74,31,0.04) 100%)',
        border: '1px solid rgba(255,133,82,0.18)',
        fontFamily: 'var(--font-humanist)',
      }}
    >
      <div
        className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
        style={{ background: 'var(--brand-grad)' }}
      >
        <Play weight="fill" size={18} className="text-white" />
      </div>
      <p
        className="text-ink"
        style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em' }}
      >
        No reels yet
      </p>
      <p
        className="text-graphite mt-1.5"
        style={{ fontSize: '13.5px', fontWeight: 400, lineHeight: 1.5 }}
      >
        Walkthroughs and stories will appear here.
      </p>
    </div>
  )
}

/**
 * Type-icon fallback for reel/carousel thumbnails when the image
 * fails to load. Mirrors the listing card's TypeIconFallback — keeps
 * the grid on-brand instead of showing the browser's broken-image
 * glyph during connectivity issues.
 */
function ReelTypeFallback({ isCarousel }: { isCarousel: boolean }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)',
      }}
    >
      {isCarousel
        ? <Images weight="light" size={24} className="text-white/85" />
        : <Play weight="fill" size={22} className="text-white/85" />}
    </div>
  )
}
