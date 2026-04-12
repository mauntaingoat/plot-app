import { useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Upload, Play, Image, Film, MapPin, Plus, Eye, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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

      {/* Header row — filters + upload + count */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter pills — compact */}
        {([
          { id: 'all' as const, label: 'All' },
          { id: 'reel' as const, label: 'Videos' },
          { id: 'photo' as const, label: 'Photos' },
        ]).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
              filter === f.id ? 'bg-ink text-warm-white' : 'bg-cream text-smoke hover:bg-pearl'
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* Upload — single pill with dropdown */}
        <UploadButton onPhoto={() => photoRef.current?.click()} onVideo={() => videoRef.current?.click()} />
      </div>

      {/* Item count */}
      <p className="text-[11px] text-ash">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-cream rounded-[18px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-pearl mx-auto mb-3 flex items-center justify-center">
            <Upload size={18} className="text-smoke" />
          </div>
          <h3 className="text-[15px] font-bold text-ink mb-1">No content yet</h3>
          <p className="text-[12px] text-smoke mb-4">Upload photos and videos to your library.</p>
          <div className="flex items-center justify-center gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => photoRef.current?.click()}
              className="px-4 py-2 rounded-[10px] bg-cream border border-border-light text-[12px] font-semibold text-ink cursor-pointer hover:bg-pearl transition-colors">
              Upload Photos
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => videoRef.current?.click()}
              className="px-4 py-2 rounded-[10px] bg-gradient-to-r from-tangerine to-ember text-white text-[12px] font-bold cursor-pointer hover:brightness-110 transition-all">
              Upload Video
            </motion.button>
          </div>
        </div>
      ) : (
        <div className={`grid gap-3 ${isDesktop ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'}`}>
          {filtered.map(({ content, pin }) => {
            const isVideo = content.type === 'reel' || content.type === 'live' || content.type === 'video_note'
            const thumb = content.thumbnailUrl || content.mediaUrl || ''
            return (
              <motion.div key={content.id} whileTap={{ scale: 0.98 }} className="group">
                {/* Thumbnail */}
                <div className="aspect-[4/5] rounded-[14px] overflow-hidden bg-pearl relative">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isVideo ? <Play size={22} className="text-smoke" /> : <Image size={22} className="text-smoke" />}
                    </div>
                  )}

                  {isVideo && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[9px] font-bold text-white flex items-center gap-1">
                        <Play size={7} fill="white" /> Video
                      </span>
                    </div>
                  )}
                </div>

                {/* Info below */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1">
                    <MapPin size={9} className="text-tangerine shrink-0" />
                    <span className="text-[11px] font-medium text-ink truncate">{pin.address.split(',')[0]}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-smoke">
                    <Eye size={9} /> {content.views.toLocaleString()}
                  </div>

                  {/* Pin assign + archive */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={pin.id}
                      onChange={(e) => onAssignContent(content.id, pin.id, e.target.value)}
                      className="flex-1 text-[10px] font-medium text-graphite bg-cream rounded-[6px] px-2 py-1 border-none outline-none focus:ring-1 focus:ring-tangerine cursor-pointer appearance-none min-w-0"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '20px' }}
                    >
                      {pins.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.address.split(',')[0]}{!p.enabled ? ' (hidden)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setArchiveTarget({ contentId: content.id, pinId: pin.id })}
                      className="w-6 h-6 rounded-[5px] bg-cream flex items-center justify-center text-ash hover:text-live-red hover:bg-live-red/10 cursor-pointer transition-colors shrink-0"
                      title="Archive"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
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

function UploadButton({ onPhoto, onVideo }: { onPhoto: () => void; onVideo: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tangerine text-[11px] font-bold text-white hover:brightness-110 cursor-pointer transition-all"
      >
        <Plus size={12} /> Upload
      </motion.button>
      {open && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 z-[50] bg-white rounded-[12px] shadow-xl border border-border-light overflow-hidden min-w-[140px]"
          >
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
