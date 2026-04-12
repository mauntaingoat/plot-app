import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Play, Image, Film, Search, Link2, MapPin, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Pin, ContentItem } from '@/lib/types'

interface ContentLibraryProps {
  pins: Pin[]
  onUploadContent: (files: File[], type: 'reel' | 'photo') => void
  onAssignContent: (contentId: string, pinId: string) => void
  isDesktop: boolean
}

/**
 * Content Library tab — central database of all agent media.
 * Upload photos/videos here, then assign to pins.
 * Shows which pin each content item belongs to.
 */
export function ContentLibrary({ pins, onUploadContent, onAssignContent, isDesktop }: ContentLibraryProps) {
  const [filter, setFilter] = useState<'all' | 'reel' | 'photo' | 'unassigned'>('all')
  const [assigningContent, setAssigningContent] = useState<{ contentId: string; pinId: string } | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  // Flatten all content from all pins with pin reference
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
    return allContent // unassigned would need a separate field — for now show all
  }, [allContent, filter])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) onUploadContent(files, 'photo')
    e.target.value = ''
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) onUploadContent(files.slice(0, 1), 'reel') // single video only
    e.target.value = ''
  }

  return (
    <div className={isDesktop ? 'space-y-5' : 'px-5 py-5 space-y-5'}>
      {/* Upload buttons */}
      <div className="flex items-center gap-3">
        <input ref={photoRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
        <input ref={videoRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />

        <Button variant="secondary" size="sm" icon={<Image size={14} />} onClick={() => photoRef.current?.click()}>
          Upload Photos
        </Button>
        <Button variant="secondary" size="sm" icon={<Film size={14} />} onClick={() => videoRef.current?.click()}>
          Upload Reel
        </Button>

        <div className="ml-auto text-[12px] text-smoke">
          {allContent.length} item{allContent.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {([
          { id: 'all', label: 'All' },
          { id: 'reel', label: 'Reels' },
          { id: 'photo', label: 'Photos' },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
              filter === f.id ? 'bg-ink text-warm-white' : 'bg-cream text-graphite hover:bg-pearl'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content grid */}
      {filtered.length === 0 ? (
        <div className="bg-cream rounded-[20px] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-pearl mx-auto mb-3 flex items-center justify-center">
            <Upload size={22} className="text-smoke" />
          </div>
          <h3 className="text-[16px] font-bold text-ink mb-1">No content yet</h3>
          <p className="text-[13px] text-smoke mb-4">Upload photos and reels to build your content library.</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="primary" size="sm" icon={<Image size={14} />} onClick={() => photoRef.current?.click()}>
              Upload Photos
            </Button>
            <Button variant="secondary" size="sm" icon={<Film size={14} />} onClick={() => videoRef.current?.click()}>
              Upload Reel
            </Button>
          </div>
        </div>
      ) : (
        <div className={`grid ${isDesktop ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
          {filtered.map(({ content, pin }) => {
            const isVideo = content.type === 'reel' || content.type === 'live' || content.type === 'video_note'
            const thumb = content.thumbnailUrl || content.mediaUrl || ''
            return (
              <div key={content.id} className="relative group">
                {/* Thumbnail */}
                <div className="aspect-[3/4] rounded-[12px] overflow-hidden bg-cream border border-border-light">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-pearl">
                      {isVideo ? <Play size={20} className="text-smoke" /> : <Image size={20} className="text-smoke" />}
                    </div>
                  )}

                  {/* Video badge */}
                  {isVideo && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white flex items-center gap-1">
                        <Play size={8} fill="white" /> Reel
                      </span>
                    </div>
                  )}

                  {/* Pin badge — which listing this belongs to */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
                    <div className="flex items-center gap-1">
                      <MapPin size={9} className="text-white/70 shrink-0" />
                      <span className="text-[9px] text-white/80 font-medium truncate">
                        {pin.address.split(',')[0]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Views */}
                <p className="text-[10px] text-smoke mt-1">{content.views.toLocaleString()} views</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
