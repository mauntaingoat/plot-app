import { useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Upload, Play, Image, Film, MapPin, Plus, Eye, Bookmark, MoreHorizontal, Edit3, Trash2, Images, ChevronDown, Edit } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import type { Pin, ContentItem } from '@/lib/types'

interface ContentLibraryProps {
  pins: Pin[]
  onUploadContent: (files: File[], type: 'reel' | 'photo') => void
  onAssignContent: (contentId: string, fromPinId: string, toPinId: string) => void
  onArchiveContent: (contentId: string, pinId: string) => void
  isDesktop: boolean
}

export function ContentLibrary({ pins, onUploadContent, onAssignContent, onArchiveContent, isDesktop }: ContentLibraryProps) {
  const [filter, setFilter] = useState<'all' | 'reel' | 'photo'>('all')
  const [archiveTarget, setArchiveTarget] = useState<{ contentId: string; pinId: string } | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [mobileMenuContent, setMobileMenuContent] = useState<{ content: ContentItem; pin: Pin } | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const allContent = useMemo(() => {
    const items: { content: ContentItem; pin: Pin }[] = []
    for (const pin of pins) {
      for (const c of pin.content || []) {
        items.push({ content: c, pin })
      }
    }
    items.sort((a, b) => b.content.createdAt.toMillis() - a.content.createdAt.toMillis())
    return items
  }, [pins])

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

      {/* Grid — 1-col mobile, 2-col desktop */}
      {filtered.length === 0 ? (
        <div className="bg-cream rounded-[18px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-pearl mx-auto mb-3 flex items-center justify-center">
            <Upload size={18} className="text-smoke" />
          </div>
          <h3 className="text-[15px] font-bold text-ink mb-1">No content yet</h3>
          <p className="text-[12px] text-smoke mb-4">Upload photos and videos to your library.</p>
        </div>
      ) : (
        <div className={isDesktop ? 'grid grid-cols-2 gap-4' : 'space-y-3'}>
          {filtered.map(({ content, pin }) => {
            const isVideo = content.type === 'reel' || content.type === 'live' || content.type === 'video_note'
            const thumb = content.thumbnailUrl || content.mediaUrl || ''
            const isLinked = true
            const menuOpen = activeMenu === content.id

            return (
              <div key={content.id} className="relative">
                <div className={`rounded-[18px] overflow-hidden bg-warm-white shadow-sm ${isLinked ? 'border-2 border-tangerine/25' : 'border border-border-light'}`}>
                  {/* Image — taller aspect for portrait content */}
                  <div className="relative aspect-[9/11] overflow-hidden bg-pearl">
                    {thumb ? (
                      <>
                        {/* Blurred bg for non-portrait */}
                        <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-105 opacity-30" />
                        <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-contain"
                          onLoad={(e) => { const img = e.currentTarget; if (img.naturalHeight > img.naturalWidth * 1.2) img.style.objectFit = 'cover' }} />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isVideo ? <Play size={28} className="text-smoke" /> : <Image size={28} className="text-smoke" />}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Type pill */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-bold text-ink shadow-sm">
                        {isVideo ? <><Play size={9} fill="currentColor" /> Video</> : <><Image size={9} /> Photo</>}
                      </span>
                    </div>
                  </div>

                  {/* Info section — matches PinCard */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Listing assignment — styled as a tappable row */}
                        <div className="relative">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-tangerine shrink-0" />
                            <select
                              value={pin.id}
                              onChange={(e) => {
                                const val = e.target.value
                                if (val === '__unlink__') return // TODO: handle unlink
                                onAssignContent(content.id, pin.id, val)
                              }}
                              className="text-[13px] font-medium text-graphite bg-transparent border-none outline-none cursor-pointer p-0 pr-4 truncate appearance-none flex-1 min-w-0"
                            >
                              <option value="__unlink__">Unlinked</option>
                              {pins.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.address.split(',')[0]}{!p.enabled ? ' (hidden)' : ''}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={11} className="text-ash shrink-0 -ml-2" />
                          </div>
                        </div>

                        {content.caption && (
                          <p className="text-[12px] text-smoke line-clamp-2 mt-1">{content.caption}</p>
                        )}
                      </div>

                      {/* Three-dot menu */}
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isDesktop) {
                            setActiveMenu(menuOpen ? null : content.id)
                          } else {
                            setMobileMenuContent({ content, pin })
                          }
                        }}
                        className="p-1.5 rounded-lg text-ash hover:text-smoke hover:bg-cream cursor-pointer shrink-0"
                      >
                        <MoreHorizontal size={18} />
                      </motion.button>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-smoke">
                        <Eye size={12} /> {content.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-smoke">
                        <Bookmark size={12} /> {content.saves.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop popover — anchored to 3-dot */}
                {isDesktop && menuOpen && (
                  <>
                    <div className="fixed inset-0 z-[49]" onClick={() => setActiveMenu(null)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.12 }}
                      className="absolute top-2 right-2 z-[50] w-[190px] bg-obsidian rounded-[14px] shadow-2xl border border-border-dark overflow-hidden"
                    >
                      <div className="py-1.5">
                        <MenuButton icon={<Edit size={14} className="text-mist" />} label="Edit" onClick={() => setActiveMenu(null)} />
                        <MenuButton icon={<Edit3 size={14} className="text-mist" />} label="Edit Caption" onClick={() => setActiveMenu(null)} />
                        {content.type === 'photo' && (
                          <MenuButton icon={<Images size={14} className="text-tangerine" />} label="Add to Carousel" onClick={() => setActiveMenu(null)} />
                        )}
                        <MenuButton icon={<Trash2 size={14} className="text-live-red" />} label="Archive" danger onClick={() => { setArchiveTarget({ contentId: content.id, pinId: pin.id }); setActiveMenu(null) }} />
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Mobile bottom sheet menu */}
      <DarkBottomSheet
        isOpen={!!mobileMenuContent}
        onClose={() => setMobileMenuContent(null)}
        title={mobileMenuContent?.content.caption || 'Content'}
      >
        <div className="px-5 pb-8 space-y-2">
          <MobileMenuButton icon={<Edit size={18} className="text-mist" />} label="Edit" onClick={() => setMobileMenuContent(null)} />
          <MobileMenuButton icon={<Edit3 size={18} className="text-mist" />} label="Edit Caption" onClick={() => setMobileMenuContent(null)} />
          {mobileMenuContent?.content.type === 'photo' && (
            <MobileMenuButton icon={<Images size={18} className="text-tangerine" />} label="Add to Carousel" onClick={() => setMobileMenuContent(null)} />
          )}
          <MobileMenuButton
            icon={<Trash2 size={18} className="text-live-red" />}
            label="Archive"
            danger
            onClick={() => {
              if (mobileMenuContent) {
                setArchiveTarget({ contentId: mobileMenuContent.content.id, pinId: mobileMenuContent.pin.id })
                setMobileMenuContent(null)
              }
            }}
          />
        </div>
      </DarkBottomSheet>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) {
            onArchiveContent(archiveTarget.contentId, archiveTarget.pinId)
            setArchiveTarget(null)
          }
        }}
        title="Archive this content?"
        message="This will remove the content from the listing. The file is kept and can be restored later."
        confirmLabel="Archive"
      />
    </div>
  )
}

// ── Shared components ──

function MenuButton({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium cursor-pointer transition-colors ${
        danger ? 'text-live-red hover:bg-live-red/5' : 'text-white hover:bg-white/5'
      }`}>
      {icon} {label}
    </button>
  )
}

function MobileMenuButton({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
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
