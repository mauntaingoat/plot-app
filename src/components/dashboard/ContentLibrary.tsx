import { useState, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Play, Image, Film, MapPin, Plus, Eye, Bookmark, MoreHorizontal, Edit3, Trash2, Images, ChevronDown, ChevronLeft, ChevronRight, Pause } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { getAgentContent, createContent, updateContent, linkContentToPin, archiveContent as archiveContentDoc } from '@/lib/firestore'
import type { Pin, ContentItem, ContentDoc } from '@/lib/types'

interface ContentLibraryProps {
  pins: Pin[]
  agentId: string
  onUploadContent: (files: File[], type: 'reel' | 'photo') => void
  onAssignContent: (contentId: string, fromPinId: string, toPinId: string, contentItem?: ContentItem) => void
  onArchiveContent: (contentId: string, pinId: string) => void
  isDesktop: boolean
  onNavigateUpload?: () => void
  /** Called after a caption is saved so the parent can update local state. */
  onCaptionSaved?: (pinId: string, contentId: string, caption: string) => void
  /** Navigate to the content editor for a specific content item. */
  onEditContent?: (content: ContentItem, pin: Pin | null) => void
}

export function ContentLibrary({ pins, agentId, onUploadContent, onAssignContent, onArchiveContent, isDesktop, onNavigateUpload, onCaptionSaved, onEditContent }: ContentLibraryProps) {
  const [filter, setFilter] = useState<'all' | 'reel' | 'photo' | 'no_listing'>('all')
  const [archiveTarget, setArchiveTarget] = useState<{ contentId: string; pinId: string | null } | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [mobileMenuContent, setMobileMenuContent] = useState<{ content: ContentItem; pin: Pin | null } | null>(null)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)
  const [editingCaption, setEditingCaption] = useState<{ contentId: string; pinId: string | null; caption: string } | null>(null)
  const storageKey = `reelst_unlinked_${agentId}`
  const [unlinkedContent, setUnlinkedContent] = useState<ContentItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]')
    } catch { return [] }
  })
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  // Fetch standalone content from Firestore (the `content` collection).
  // This picks up content published via the standalone upload flow.
  useEffect(() => {
    if (!agentId) return
    import('@/lib/firestore').then(({ getAgentContent }) => {
      getAgentContent(agentId).then((docs) => {
        if (docs.length > 0) {
          setUnlinkedContent((prev) => {
            const existingIds = new Set(prev.map((c) => c.id))
            const newItems = docs.filter((d) => !existingIds.has(d.id))
            return newItems.length > 0 ? [...prev, ...newItems] : prev
          })
        }
      }).catch(() => {})
    })
  }, [agentId])

  // Sync unlinked content to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(unlinkedContent))
  }, [unlinkedContent, storageKey])

  // Build content→pin lookup (updates when pins change, but doesn't affect order)
  const contentPinMap = useMemo(() => {
    const map = new Map<string, Pin | null>()
    for (const pin of pins) {
      for (const c of pin.content || []) {
        map.set(c.id, pin)
      }
    }
    for (const c of unlinkedContent) {
      if (!map.has(c.id)) map.set(c.id, null)
    }
    return map
  }, [pins, unlinkedContent])

  // Stable ordered list — only adds new items, never re-sorts existing ones
  const orderRef = useRef<string[]>([])
  const allContent = useMemo(() => {
    // Collect all content items
    const allItems: ContentItem[] = []
    const seen = new Set<string>()
    for (const pin of pins) {
      for (const c of pin.content || []) {
        if (!seen.has(c.id)) { allItems.push(c); seen.add(c.id) }
      }
    }
    for (const c of unlinkedContent) {
      if (!seen.has(c.id)) { allItems.push(c); seen.add(c.id) }
    }

    // Add any new IDs to the stable order (at the top)
    const existingIds = new Set(orderRef.current)
    const newIds = allItems.filter((c) => !existingIds.has(c.id)).map((c) => c.id)
    if (newIds.length > 0) {
      orderRef.current = [...newIds, ...orderRef.current]
    }
    // Remove deleted IDs
    orderRef.current = orderRef.current.filter((id) => seen.has(id))

    // Build final list in stable order
    const itemMap = new Map(allItems.map((c) => [c.id, c]))
    return orderRef.current
      .map((id) => {
        const content = itemMap.get(id)
        if (!content) return null
        return { content, pin: contentPinMap.get(id) ?? null }
      })
      .filter(Boolean) as { content: ContentItem; pin: Pin | null }[]
  }, [pins, unlinkedContent, contentPinMap])

  const filtered = useMemo(() => {
    if (filter === 'all') return allContent
    if (filter === 'reel') return allContent.filter((i) => i.content.type === 'reel' || i.content.type === 'live' || i.content.type === 'video_note')
    if (filter === 'photo') return allContent.filter((i) => i.content.type === 'photo')
    if (filter === 'no_listing') return allContent.filter((i) => i.pin === null)
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
          { id: 'no_listing' as const, label: 'No Listing' },
        ]).map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
              filter === f.id ? 'bg-ink text-warm-white' : 'bg-cream text-smoke hover:bg-pearl'
            }`}>
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        {onNavigateUpload ? (
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={onNavigateUpload}>Upload</Button>
        ) : (
          <UploadButton onPhoto={() => photoRef.current?.click()} onVideo={() => videoRef.current?.click()} />
        )}
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
                  // Unlink — move to unlinked state + remove from pin
                  if (pin) onArchiveContent(content.id, pin.id)
                  // Check if content doc already exists in content collection, else create
                  getAgentContent(agentId).then((docs) => {
                    const existing = docs.find((d) => d.id === content.id)
                    if (existing) {
                      updateContent(content.id, { pinId: null })
                    } else {
                      createContent({
                        agentId,
                        pinId: null,
                        type: content.type,
                        mediaUrl: content.mediaUrl,
                        ...(content.mediaUrls ? { mediaUrls: content.mediaUrls } : {}),
                        thumbnailUrl: content.thumbnailUrl,
                        caption: content.caption,
                        ...(content.duration != null ? { duration: content.duration } : {}),
                        ...(content.publishAt !== undefined ? { publishAt: content.publishAt } : {}),
                        ...(content.aspect ? { aspect: content.aspect } : {}),
                      })
                    }
                  }).catch(() => {})
                  setUnlinkedContent((prev) => {
                    if (prev.some((c) => c.id === content.id)) return prev
                    return [...prev, content]
                  })
                  return
                } else if (pin) {
                  // Move from one pin to another
                  onAssignContent(content.id, pin.id, toPinId)
                } else {
                  // Re-link unlinked content to a pin
                  const targetPin = pins.find((p) => p.id === toPinId)
                  if (targetPin) {
                    const updatedPinContent = [...(targetPin.content || []), content]
                    import('@/lib/firestore').then(({ updatePin }) => {
                      updatePin(toPinId, { content: updatedPinContent }).catch(() => {})
                    })
                    // Update content doc pinId
                    updateContent(content.id, { pinId: toPinId }).catch(() => {})
                    setUnlinkedContent((prev) => prev.filter((c) => c.id !== content.id))
                    onAssignContent(content.id, '', toPinId, content)
                  }
                }
              }}
              onArchive={() => {
                setArchiveTarget({ contentId: content.id, pinId: pin?.id ?? null })
              }}
              onEditCaption={() => setEditingCaption({ contentId: content.id, pinId: pin?.id || null, caption: content.caption || '' })}
              onEditContent={() => onEditContent?.(content, pin)}
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
          <MobileMenuBtn icon={<Edit3 size={18} className="text-mist" />} label="Edit Caption" onClick={() => {
            if (mobileMenuContent) setEditingCaption({ contentId: mobileMenuContent.content.id, pinId: mobileMenuContent.pin?.id || null, caption: mobileMenuContent.content.caption || '' })
            setMobileMenuContent(null)
          }} />
          {mobileMenuContent?.content.type === 'photo' && (
            <MobileMenuBtn icon={<Images size={18} className="text-tangerine" />} label="Edit Carousel" onClick={() => {
              if (mobileMenuContent) onEditContent?.(mobileMenuContent.content, mobileMenuContent.pin)
              setMobileMenuContent(null)
            }} />
          )}
          {(mobileMenuContent?.content.type === 'reel' || mobileMenuContent?.content.type === 'video_note') && (
            <MobileMenuBtn icon={<Film size={18} className="text-tangerine" />} label="Edit Reel" onClick={() => {
              if (mobileMenuContent) onEditContent?.(mobileMenuContent.content, mobileMenuContent.pin)
              setMobileMenuContent(null)
            }} />
          )}
          <MobileMenuBtn
            icon={<Trash2 size={18} className="text-live-red" />} label="Archive" danger
            onClick={() => {
              if (mobileMenuContent) {
                setArchiveTarget({ contentId: mobileMenuContent.content.id, pinId: mobileMenuContent.pin?.id ?? null })
              }
              setMobileMenuContent(null)
            }}
          />
        </div>
      </DarkBottomSheet>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (!archiveTarget) return
          if (archiveTarget.pinId) {
            // Remove from the pin's content array AND archive the content doc
            onArchiveContent(archiveTarget.contentId, archiveTarget.pinId)
          }
          // Always remove from local unlinked state + archive in Firestore
          setUnlinkedContent((prev) => prev.filter((c) => c.id !== archiveTarget.contentId))
          archiveContentDoc(archiveTarget.contentId).catch(() => {})
          setArchiveTarget(null)
        }}
        title="Archive this content?"
        message="This will permanently remove this content."
        confirmLabel="Archive"
      />

      {/* Caption edit — desktop modal */}
      {isDesktop && (
        <AnimatePresence>
          {editingCaption && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/50" onClick={() => setEditingCaption(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-48px)] max-w-[400px] bg-warm-white rounded-[22px] shadow-2xl border border-border-light p-6 space-y-4"
              >
                <h2 className="text-[16px] font-extrabold text-ink tracking-tight">Edit Caption</h2>
                <CaptionEditFields editingCaption={editingCaption} setEditingCaption={setEditingCaption} pins={pins} setUnlinkedContent={setUnlinkedContent} updateContent={updateContent} variant="light" onCaptionSaved={onCaptionSaved} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Caption edit — mobile bottom sheet */}
      {!isDesktop && (
        <DarkBottomSheet isOpen={!!editingCaption} onClose={() => setEditingCaption(null)} title="Edit Caption">
          <div className="px-5 pb-8">
            {editingCaption && (
              <CaptionEditFields editingCaption={editingCaption} setEditingCaption={setEditingCaption} pins={pins} setUnlinkedContent={setUnlinkedContent} updateContent={updateContent} variant="dark" onCaptionSaved={onCaptionSaved} />
            )}
          </div>
        </DarkBottomSheet>
      )}
    </div>
  )
}

// ── Content Card ──

function ContentCard({ content, pin, pins, isDesktop, isPlaying, onPlay, menuOpen, onMenuToggle, onMenuClose, onAssign, onArchive, onEditCaption, onEditContent }: {
  content: ContentItem; pin: Pin | null; pins: Pin[]; isDesktop: boolean
  isPlaying: boolean; onPlay: () => void
  menuOpen: boolean; onMenuToggle: () => void; onMenuClose: () => void
  onAssign: (toPinId: string) => void; onArchive: () => void; onEditCaption: () => void; onEditContent?: () => void
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
          {isVideo && (content.mp4Url || (content.mediaUrl && !content.mediaUrl.includes('.m3u8'))) ? (
            <>
              <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-25" />
              {isPlaying ? (
                <video ref={videoRef} src={content.mp4Url || content.mediaUrl} className="absolute inset-0 w-full h-full object-contain" loop playsInline muted autoPlay />
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
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-bold text-[#1A1A1A] shadow-sm">
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
                  style={{ fontFamily: 'inherit', fontSize: '13px', lineHeight: 'normal' }}
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

            <div className="relative shrink-0">
              <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onMenuToggle() }}
                className="p-1.5 rounded-lg text-ash hover:text-smoke hover:bg-cream cursor-pointer">
                <MoreHorizontal size={18} />
              </motion.button>

              {/* Desktop popover — anchored to three-dot button */}
              {isDesktop && menuOpen && (
                <>
                  <div className="fixed inset-0 z-[49]" onClick={onMenuClose} />
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute bottom-full right-0 mb-1 z-[50] w-[220px] bg-obsidian rounded-[16px] shadow-2xl border border-border-dark overflow-hidden">
                    <div className="py-1.5">
                      <PopoverBtn icon={<Edit3 size={15} className="text-mist" />} label="Edit Caption" onClick={() => { onEditCaption(); onMenuClose() }} />
                      {content.type === 'photo' && (
                        <PopoverBtn icon={<Images size={15} className="text-tangerine" />} label="Edit Carousel" onClick={() => { onEditContent?.(); onMenuClose() }} />
                      )}
                      {(content.type === 'reel' || content.type === 'video_note') && (
                        <PopoverBtn icon={<Film size={15} className="text-tangerine" />} label="Edit Reel" onClick={() => { onEditContent?.(); onMenuClose() }} />
                      )}
                      <PopoverBtn icon={<Trash2 size={15} className="text-live-red" />} label="Archive" danger onClick={() => { onArchive(); onMenuClose() }} />
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 pt-1">
            <span className="flex items-center gap-1 text-[11px] font-medium text-smoke"><Eye size={12} /> {content.views.toLocaleString()}</span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-smoke"><Bookmark size={12} /> {content.saves.toLocaleString()}</span>
          </div>
        </div>
      </div>

    </div>
  )
}

// ── Helpers ──

function CaptionEditFields({ editingCaption, setEditingCaption, pins, setUnlinkedContent, updateContent, variant, onCaptionSaved }: {
  editingCaption: { contentId: string; pinId: string | null; caption: string }
  setEditingCaption: (v: { contentId: string; pinId: string | null; caption: string } | null) => void
  pins: Pin[]
  setUnlinkedContent: React.Dispatch<React.SetStateAction<ContentItem[]>>
  updateContent: (id: string, data: any) => Promise<any>
  variant: 'light' | 'dark'
  onCaptionSaved?: (pinId: string, contentId: string, caption: string) => void
}) {
  const isDark = variant === 'dark'
  return (
    <div className="space-y-4">
      <textarea
        value={editingCaption.caption}
        onChange={(e) => setEditingCaption({ ...editingCaption, caption: e.target.value })}
        rows={3}
        maxLength={300}
        placeholder="Add a caption..."
        className={`w-full px-4 py-3 rounded-[14px] text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-tangerine/30 ${
          isDark
            ? 'bg-slate border border-border-dark text-white placeholder:text-ghost'
            : 'bg-cream border border-border-light text-ink placeholder:text-ash'
        }`}
      />
      <div className="flex items-center justify-between">
        <span className={`text-[11px] ${isDark ? 'text-ghost' : 'text-ash'}`}>{editingCaption.caption.length}/300</span>
        <div className="flex gap-2">
          <button onClick={() => setEditingCaption(null)}
            className={`px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-colors ${isDark ? 'text-ghost hover:bg-white/5' : 'text-smoke hover:bg-cream'}`}>Cancel</button>
          <button onClick={() => {
            const { contentId, pinId, caption } = editingCaption
            if (pinId) {
              const pin = pins.find((p) => p.id === pinId)
              if (pin) {
                const updatedContent = pin.content.map((c) => c.id === contentId ? { ...c, caption } : c)
                import('@/lib/firestore').then(({ updatePin }) => updatePin(pinId, { content: updatedContent })).catch(() => {})
              }
              onCaptionSaved?.(pinId, contentId, caption)
            }
            setUnlinkedContent((prev) => prev.map((c) => c.id === contentId ? { ...c, caption } : c))
            updateContent(contentId, { caption }).catch(() => {})
            setEditingCaption(null)
          }}
            className="px-4 py-2 rounded-full bg-tangerine text-white text-[13px] font-bold cursor-pointer hover:brightness-110 transition-all">Save</button>
        </div>
      </div>
    </div>
  )
}

function PopoverBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left cursor-pointer hover:bg-white/5 transition-colors`}>
      {icon}
      <span className={`text-[13px] font-medium ${danger ? 'text-live-red' : 'text-white'}`}>{label}</span>
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
            className="absolute right-0 top-full mt-1.5 z-[50] bg-warm-white rounded-[12px] shadow-xl border border-border-light overflow-hidden min-w-[140px]">
            <button onClick={() => { onPhoto() }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-medium text-ink hover:bg-cream cursor-pointer transition-colors">
              <Image size={14} className="text-smoke" /> Photos
            </button>
            <button onClick={() => { onVideo() }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-medium text-ink hover:bg-cream cursor-pointer transition-colors">
              <Film size={14} className="text-tangerine" /> Video
            </button>
          </motion.div>
        </>
      )}
    </div>
  )
}
