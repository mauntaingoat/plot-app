import { useState, useRef, useMemo } from 'react'
import { Upload, Play, Image, Film, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Pin, ContentItem } from '@/lib/types'

interface ContentLibraryProps {
  pins: Pin[]
  onUploadContent: (files: File[], type: 'reel' | 'photo') => void
  onAssignContent: (contentId: string, fromPinId: string, toPinId: string) => void
  isDesktop: boolean
}

export function ContentLibrary({ pins, onUploadContent, onAssignContent, isDesktop }: ContentLibraryProps) {
  const [filter, setFilter] = useState<'all' | 'reel' | 'photo'>('all')
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) onUploadContent(files, 'photo')
    e.target.value = ''
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) onUploadContent(files.slice(0, 1), 'reel')
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
          Upload Video
        </Button>

        <div className="ml-auto text-[12px] text-smoke">
          {allContent.length} item{allContent.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {([
          { id: 'all' as const, label: 'All' },
          { id: 'reel' as const, label: 'Videos' },
          { id: 'photo' as const, label: 'Photos' },
        ]).map((f) => (
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
          <p className="text-[13px] text-smoke mb-4">Upload photos and videos to build your content library.</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="primary" size="sm" icon={<Image size={14} />} onClick={() => photoRef.current?.click()}>
              Upload Photos
            </Button>
            <Button variant="secondary" size="sm" icon={<Film size={14} />} onClick={() => videoRef.current?.click()}>
              Upload Video
            </Button>
          </div>
        </div>
      ) : (
        <div className={`grid ${isDesktop ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'} gap-4`}>
          {filtered.map(({ content, pin }) => {
            const isVideo = content.type === 'reel' || content.type === 'live' || content.type === 'video_note'
            const thumb = content.thumbnailUrl || content.mediaUrl || ''
            return (
              <div key={content.id}>
                {/* Thumbnail */}
                <div className="aspect-[3/4] rounded-[14px] overflow-hidden bg-cream border border-border-light relative">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-pearl">
                      {isVideo ? <Play size={24} className="text-smoke" /> : <Image size={24} className="text-smoke" />}
                    </div>
                  )}

                  {/* Video badge */}
                  {isVideo && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white flex items-center gap-1">
                        <Play size={8} fill="white" /> Video
                      </span>
                    </div>
                  )}
                </div>

                {/* Info below thumbnail */}
                <div className="mt-2 space-y-1.5">
                  {/* Linked listing */}
                  <div className="flex items-center gap-1.5">
                    <MapPin size={10} className="text-tangerine shrink-0" />
                    <span className="text-[11px] font-medium text-graphite truncate">
                      {pin.address.split(',')[0]}
                    </span>
                  </div>

                  {/* Views */}
                  <p className="text-[10px] text-smoke">{content.views.toLocaleString()} views</p>

                  {/* Assign to pin dropdown */}
                  <select
                    value={pin.id}
                    onChange={(e) => onAssignContent(content.id, pin.id, e.target.value)}
                    className="w-full text-[11px] font-medium text-ink bg-cream border border-border-light rounded-[8px] px-2 py-1.5 outline-none focus:border-tangerine cursor-pointer"
                  >
                    {pins.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.address.split(',')[0]}{!p.enabled ? ' (hidden)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
