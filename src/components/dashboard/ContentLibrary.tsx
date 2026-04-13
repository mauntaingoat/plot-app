import { useState, useRef, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, Play, Image, Film, MapPin, Plus, Eye, Bookmark, MoreHorizontal, Edit3, Trash2, Images, ChevronDown, Edit, ChevronLeft, ChevronRight, Pause } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { getAgentContent, linkContentToPin, archiveContent as archiveContentDoc } from '@/lib/firestore'
import type { Pin, ContentItem, ContentDoc } from '@/lib/types'

interface ContentLibraryProps {
  pins: Pin[]
  agentId: string
  onUploadContent: (files: File[], type: 'reel' | 'photo') => void
  onAssignContent: (contentId: string, fromPinId: string, toPinId: string) => void
  onArchiveContent: (contentId: string, pinId: string) => void
  isDesktop: boolean
}

export function ContentLibrary({ pins, agentId, onUploadContent, onAssignContent, onArchiveContent, isDesktop }: ContentLibraryProps) {
  const [filter, setFilter] = useState<'all' | 'reel' | 'photo'>('all')
  const [archiveTarget, setArchiveTarget] = useState<{ contentId: string; pinId: string } | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [mobileMenuContent, setMobileMenuContent] = useState<{ content: ContentItem; pin: Pin | null } | null>(null)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)
  const [unlinkedContent, setUnlinkedContent] = useState<ContentItem[]>([])
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  // Merge content from pins + unlinked — keyed by content ID for stable order
  const allContent = useMemo(() => {
    const items: { content: ContentItem; pin: Pin | null }[] = []
    // Build a map of content ID → pin for quick lookup
    const seen = new Set<string>()
    for (const pin of pins) {
      for (const c of pin.content || []) {
        if (!seen.has(c.id)) {
          items.push({ content: c, pin })
          seen.add(c.id)
        }
      }
    }
    for (const c of unlinkedContent) {
      if (!seen.has(c.id)) {
        items.push({ content: c, pin: null })
        seen.add(c.id)
      }
    }
    items.sort((a, b) => b.content.createdAt.toMillis() - a.content.createdAt.toMillis())
    return items
  }, [pins, unlinkedContent])

  const filtered = useMemo(() => {
    if (filter === 'all') return allContent
    if (filter === 'reel') return allContent.filter((i) => i.content.type === 'reel' || i.content.type === 'live' || i.content.type === 'video_note')
    if (filter === 'photo') return allContent.filter((i) => i.content.type === 'photo')
    return allContent
  }, [allContent, filter])

  return (
    <div className={isDesktop ? 'space-y-4' : 'px-5 py-5 space-y-4'}>
      <input ref={photoRef} type="file" accept="image/*" multiple onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) onUploadContent(f, 'photo'); e.target.value = '' }} className="hidden" />
      <input ref={videoRef} type="file" accept="video/*" onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) onUploadContent(f.slice(0, 1), 'reel'); e.target.value = '' }} className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { id: 'all' as const, label: 'All' },
          { id: 'reel' as const, label: 'Videos' },
          { id: 'photo' as const, label: 'Photos' },
        ]).map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
              filter === f.id ? 'bg-ink text-warm-white' : 'bg-cream text-smoke hover:bg-pearl'
            }`}>
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        <UploadButton onPhoto={() => photoRef.current?.click()} onVideo={() => videoRef.current?.click()} />
      </div>

      <p className="text-[11px] text-ash">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-cream rounded-[18px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-pearl mx-auto mb-3 flex items-center justify-center">
            <Upload size={18} className="text-smoke" />
          </div>
          <h3 className="text-[15px] font-bold text-ink mb-1">No content yet</h3>
          <p className="text-[12px] text-smoke mb-4">Upload photos and videos to your library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(({ content, pin }) => (
            <ContentCard
              key={content.id}
              content={content}
              pin={pin}
              pins={pins}
              isDesktop={isDesktop}
              isPlaying={playingVideo === content.id}
              onPlay={() => setPlayingVideo(playingVideo === content.id ? null : content.id)}
              menuOpen={activeMenu === content.id}
              onMenuToggle={() => {
                if (isDesktop) setActiveMenu(activeMenu === content.id ? null : content.id)
                else setMobileMenuContent({ content, pin })
              }}
              onMenuClose={() => setActiveMenu(null)}
              onAssign={(toPinId) => {
                if (toPinId === '__none__') {
                  // Unlink — move to local unlinked state + remove from pin
                  setUnlinkedContent((prev) => [...prev, content])
                  if (pin) onArchiveContent(content.id, pin.id)
                  // Also save to standalone collection
                  import('@/lib/firestore').then(({ createContent }) => {
                    createContent({
                      agentId: agentId,
                      pinId: null,
                      type: content.type,
                      mediaUrl: content.mediaUrl,
                      mediaUrls: content.mediaUrls,
                      thumbnailUrl: content.thumbnailUrl,
                      caption: content.caption,
                      duration: content.duration,
                      publishAt: content.publishAt,
                    })
                  }).catch(() => {})
                  return
                } else if (pin) {
                  onAssignContent(content.id, pin.id, toPinId)
                }
              }}
              onArchive={() => {
                if (pin) setArchiveTarget({ contentId: content.id, pinId: pin.id })
              }}
            />
          ))}
        </div>
      )}

      {/* Mobile bottom sheet menu */}
      <DarkBottomSheet
        isOpen={!!mobileMenuContent}
        onClose={() => setMobileMenuContent(null)}
        title={
          mobileMenuContent?.content.caption
            ? (mobileMenuContent.content.caption.length > 40
                ? mobileMenuContent.content.caption.slice(0, 40) + '…'
                : mobileMenuContent.content.caption)
            : (mobileMenuContent?.content.type === 'reel' ? 'Video' : 'Photo')
        }
      >
        <div className="px-5 pb-8 space-y-2">
          <MobileMenuBtn icon={<Edit size={18} className="text-mist" />} label="Edit" onClick={() => setMobileMenuContent(null)} />
          <MobileMenuBtn icon={<Edit3 size={18} className="text-mist" />} label="Edit Caption" onClick={() => setMobileMenuContent(null)} />
          {mobileMenuContent?.content.type === 'photo' && (
            <MobileMenuBtn icon={<Images size={18} className="text-tangerine" />} label="Add to Carousel" onClick={() => setMobileMenuContent(null)} />
          )}
          <MobileMenuBtn
            icon={<Trash2 size={18} className="text-live-red" />} label="Archive" danger
            onClick={() => {
              if (mobileMenuContent?.pin) {
                setArchiveTarget({ contentId: mobileMenuContent.content.id, pinId: mobileMenuContent.pin.id })
              }
              setMobileMenuContent(null)
            }}
          />
        </div>
      </DarkBottomSheet>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => { if (archiveTarget) { onArchiveContent(archiveTarget.contentId, archiveTarget.pinId); setArchiveTarget(null) } }}
        title="Archive this content?"
        message="This will remove the content from the listing."
        confirmLabel="Archive"
      />
    </div>
  )
}

// ── Content Card ──

function ContentCard({ content, pin, pins, isDesktop, isPlaying, onPlay, menuOpen, onMenuToggle, onMenuClose, onAssign, onArchive }: {
  content: ContentItem; pin: Pin | null; pins: Pin[]; isDesktop: boolean
  isPlaying: boolean; onPlay: () => void
  menuOpen: boolean; onMenuToggle: () => void; onMenuClose: () => void
  onAssign: (toPinId: string) => void; onArchive: () => void
}) {
  const isVideo = content.type === 'reel' || content.type === 'live' || content.type === 'video_note'
  const thumb = content.thumbnailUrl || content.mediaUrl || ''
  const mediaUrls = content.mediaUrls || (thumb ? [thumb] : [])
  const isCarousel = !isVideo && mediaUrls.length > 1
  const [carouselIdx, setCarouselIdx] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isLinked = !!pin

  useEffect(() => {
    if (isPlaying && videoRef.current) videoRef.current.play().catch(() => {})
    if (!isPlaying && videoRef.current) videoRef.current.pause()
  }, [isPlaying])

  return (
    <div className="relative">
      <div className={`rounded-[18px] overflow-hidden bg-warm-white shadow-sm ${isLinked ? 'border-2 border-tangerine/25' : 'border border-border-light'}`}>
        {/* Media area */}
        <div className="relative aspect-[9/11] overflow-hidden bg-pearl cursor-pointer" onClick={isVideo ? onPlay : undefined}>
          {isVideo && content.mediaUrl ? (
            <>
              <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-25" />
              {isPlaying ? (
                <video ref={videoRef} src={content.mediaUrl} className="absolute inset-0 w-full h-full object-contain" loop playsInline muted autoPlay />
              ) : (
                <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-contain"
                  onLoad={(e) => { const img = e.currentTarget; if (img.naturalHeight > img.naturalWidth * 1.2) img.style.objectFit = 'cover' }} />
              )}
              {/* Play/Pause overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                  {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
                </div>
              </div>
            </>
          ) : thumb ? (
            <>
              <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-25" />
              <img src={isCarousel ? mediaUrls[carouselIdx] : thumb} alt="" className="absolute inset-0 w-full h-full object-contain"
                onLoad={(e) => { const img = e.currentTarget; if (img.naturalHeight > img.naturalWidth * 1.2) img.style.objectFit = 'cover' }} />
              {/* Carousel arrows */}
              {isCarousel && (
                <>
                  {carouselIdx > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setCarouselIdx((i) => i - 1) }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer">
                      <ChevronLeft size={14} />
                    </button>
                  )}
                  {carouselIdx < mediaUrls.length - 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setCarouselIdx((i) => i + 1) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer">
                      <ChevronRight size={14} />
                    </button>
                  )}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {mediaUrls.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === carouselIdx ? 'bg-white w-3' : 'bg-white/40'}`} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {isVideo ? <Play size={28} className="text-smoke" /> : <Image size={28} className="text-smoke" />}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Type pill */}
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-bold text-ink shadow-sm">
              {isVideo ? <><Play size={9} fill="currentColor" /> Video</> : <><Image size={9} /> Photo</>}
            </span>
          </div>
        </div>

        {/* Info section */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Listing assignment */}
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className={isLinked ? 'text-tangerine' : 'text-ash'} shrink-0 />
                <select
                  value={pin?.id || '__none__'}
                  onChange={(e) => onAssign(e.target.value)}
                  className="text-[13px] font-medium text-graphite bg-transparent border-none outline-none cursor-pointer p-0 pr-4 truncate appearance-none flex-1 min-w-0"
                >
                  <option value="__none__">No listing</option>
                  {pins.map((p) => (
                    <option key={p.id} value={p.id}>{p.address.split(',')[0]}{!p.enabled ? ' (hidden)' : ''}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="text-ash shrink-0 -ml-2" />
              </div>
              {content.caption && (
                <p className="text-[12px] text-smoke line-clamp-2 mt-1">{content.caption}</p>
              )}
            </div>

            <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onMenuToggle() }}
              className="p-1.5 rounded-lg text-ash hover:text-smoke hover:bg-cream cursor-pointer shrink-0">
              <MoreHorizontal size={18} />
            </motion.button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 pt-1">
            <span className="flex items-center gap-1 text-[11px] font-medium text-smoke"><Eye size={12} /> {content.views.toLocaleString()}</span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-smoke"><Bookmark size={12} /> {content.saves.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Desktop popover */}
      {isDesktop && menuOpen && (
        <>
          <div className="fixed inset-0 z-[49]" onClick={onMenuClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.12 }}
            className="absolute top-2 right-2 z-[50] w-[190px] bg-obsidian rounded-[14px] shadow-2xl border border-border-dark overflow-hidden">
            <div className="py-1.5">
              <PopoverBtn icon={<Edit size={14} className="text-mist" />} label="Edit" onClick={onMenuClose} />
              <PopoverBtn icon={<Edit3 size={14} className="text-mist" />} label="Edit Caption" onClick={onMenuClose} />
              {content.type === 'photo' && (
                <PopoverBtn icon={<Images size={14} className="text-tangerine" />} label="Add to Carousel" onClick={onMenuClose} />
              )}
              <PopoverBtn icon={<Trash2 size={14} className="text-live-red" />} label="Archive" danger onClick={() => { onArchive(); onMenuClose() }} />
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}

// ── Helpers ──

function PopoverBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium cursor-pointer transition-colors ${danger ? 'text-live-red hover:bg-live-red/5' : 'text-white hover:bg-white/5'}`}>
      {icon} {label}
    </button>
  )
}

function MobileMenuBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-[14px] text-left ${danger ? 'bg-live-red/10' : 'bg-slate'}`}>
      {icon}
      <span className={`text-[15px] font-medium ${danger ? 'text-live-red' : 'text-white'}`}>{label}</span>
    </motion.button>
  )
}

function UploadButton({ onPhoto, onVideo }: { onPhoto: () => void; onVideo: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tangerine text-[11px] font-bold text-white hover:brightness-110 cursor-pointer transition-all">
        <Plus size={12} /> Upload
      </motion.button>
      {open && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 z-[50] bg-white rounded-[12px] shadow-xl border border-border-light overflow-hidden min-w-[140px]">
            <button onClick={() => { onPhoto(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-medium text-ink hover:bg-cream cursor-pointer transition-colors">
              <Image size={14} className="text-smoke" /> Photos
            </button>
            <button onClick={() => { onVideo(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-medium text-ink hover:bg-cream cursor-pointer transition-colors">
              <Film size={14} className="text-tangerine" /> Video
            </button>
          </motion.div>
        </>
      )}
    </div>
  )
}
