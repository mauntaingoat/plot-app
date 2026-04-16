import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ChevronLeft, ChevronRight, Crop, Trash2, RefreshCw } from 'lucide-react'
import { AspectChips } from './components/AspectChips'
import { PhotoStrip } from './components/PhotoStrip'
import { probePhoto } from './lib/probe'
import { useThemeStore } from '@/stores/themeStore'
import type { CarouselDraft, CarouselPhoto, CreateAspect } from './types'

const MAX_PHOTOS = 10

interface CarouselStepProps {
  draft: CarouselDraft | null
  onChange: (d: CarouselDraft) => void
}

function newId() {
  return Math.random().toString(36).slice(2, 10)
}

function emptyDraft(): CarouselDraft {
  return { id: newId(), kind: 'carousel', photos: [], aspect: '4:5' }
}

const ASPECT_RATIO: Record<CreateAspect, number | null> = {
  'original': null,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '4:5': 4 / 5,
}

export function CarouselStep({ draft, onChange }: CarouselStepProps) {
  const current = draft ?? emptyDraft()
  const [activeIdx, setActiveIdx] = useState(0)
  const [showFrame, setShowFrame] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const isDark = useThemeStore((s) => s.resolved) === 'dark'

  useEffect(() => {
    if (activeIdx >= current.photos.length) setActiveIdx(Math.max(0, current.photos.length - 1))
  }, [current.photos.length, activeIdx])

  const update = (next: Partial<CarouselDraft>) => {
    onChange({ ...current, ...next })
  }

  const openPicker = () => fileRef.current?.click()

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const remaining = MAX_PHOTOS - current.photos.length
    const selected = Array.from(files).slice(0, Math.max(0, remaining))
    const added: CarouselPhoto[] = []
    for (const file of selected) {
      try {
        const probe = await probePhoto(file)
        added.push({
          id: newId(),
          file,
          previewUrl: probe.previewUrl,
          width: probe.width,
          height: probe.height,
          aspect: probe.aspect,
        })
      } catch {
        // skip bad file
      }
    }
    if (added.length > 0) {
      const next: CarouselDraft = { ...current, photos: [...current.photos, ...added] }
      onChange(next)
      if (current.photos.length === 0) setActiveIdx(0)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const reorder = (ids: string[]) => {
    const byId = new Map(current.photos.map((p) => [p.id, p]))
    const next = ids.map((id) => byId.get(id)).filter((x): x is CarouselPhoto => !!x)
    update({ photos: next })
  }

  const remove = (id: string) => {
    const next = current.photos.filter((p) => p.id !== id)
    update({ photos: next })
  }

  const deleteActive = () => {
    if (!active) return
    remove(active.id)
  }

  const replaceActive = async (files: FileList | null) => {
    if (!files || files.length === 0 || !active) return
    try {
      const probe = await probePhoto(files[0])
      const replaced: CarouselPhoto = {
        id: active.id,
        file: files[0],
        previewUrl: probe.previewUrl,
        width: probe.width,
        height: probe.height,
        aspect: probe.aspect,
      }
      const next = current.photos.map((p) => (p.id === active.id ? replaced : p))
      update({ photos: next })
    } catch { /* skip bad file */ }
    if (replaceRef.current) replaceRef.current.value = ''
  }

  const prev = () => setActiveIdx((i) => (i > 0 ? i - 1 : current.photos.length - 1))
  const next = () => setActiveIdx((i) => (i < current.photos.length - 1 ? i + 1 : 0))

  const aspectRatio = ASPECT_RATIO[current.aspect]
  const active = current.photos[activeIdx]

  return (
    <div className="relative flex flex-col gap-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        onChange={(e) => replaceActive(e.target.files)}
        className="hidden"
      />

      {/* Main column — centered on desktop like the reel editor. */}
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-4">

      {/* Preview — height-capped, smooth aspect transitions matching
          the reel editor. Frame overlay button on top-right. */}
      <div className="relative w-full flex items-center justify-center">
        <div
          className={`relative rounded-[18px] overflow-hidden ${
            isDark
              ? 'bg-white/[0.04] border border-white/[0.06]'
              : 'bg-black/[0.03] border border-black/[0.06]'
          }`}
          style={{
            aspectRatio: String(aspectRatio ?? (active ? active.aspect : 4 / 5)),
            height: 'min(50vh, 500px)',
            width: 'auto',
            maxWidth: '100%',
            minHeight: 200,
            transition: 'aspect-ratio 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {current.photos.length === 0 ? (
            <button
              type="button"
              onClick={openPicker}
              className={`absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer ${
                isDark ? 'text-white/70 hover:text-white' : 'text-ink/60 hover:text-ink'
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                isDark ? 'bg-white/[0.08]' : 'bg-black/[0.05]'
              }`}>
                <Camera size={22} />
              </div>
              <p className="text-[14px] font-semibold">Add photos</p>
              <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-smoke'}`}>Up to {MAX_PHOTOS} images</p>
            </button>
          ) : (
            <>
              <AnimatePresence initial={false}>
                <motion.img
                  key={active?.id}
                  src={active?.previewUrl}
                  alt=""
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.25}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) next()
                    else if (info.offset.x > 60) prev()
                  }}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute inset-0 w-full h-full object-cover cursor-grab active:cursor-grabbing"
                  draggable={false}
                />
              </AnimatePresence>

              {current.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer hover:bg-black/75"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer hover:bg-black/75"
                    aria-label="Next"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/60 text-[11px] font-mono text-white tabular-nums">
                    {activeIdx + 1} / {current.photos.length}
                  </div>
                </>
              )}

              {/* Frame overlay — same position/style as reel editor */}
              <button
                type="button"
                onClick={() => setShowFrame((v) => !v)}
                className={`absolute top-3 right-3 z-30 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                  showFrame
                    ? 'bg-tangerine text-white shadow-[0_4px_16px_rgba(255,107,61,0.55)]'
                    : 'bg-black/55 text-white/90 backdrop-blur-sm hover:bg-black/70'
                }`}
                aria-label="Frame"
              >
                <Crop size={16} strokeWidth={2.3} />
              </button>

              {/* Delete + Replace — top-left, matching reel editor sub-tools */}
              <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => replaceRef.current?.click()}
                  className="w-9 h-9 rounded-full bg-black/55 text-white/90 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  aria-label="Replace"
                >
                  <RefreshCw size={14} strokeWidth={2.3} />
                </button>
                <button
                  type="button"
                  onClick={deleteActive}
                  className="w-9 h-9 rounded-full bg-black/55 text-live-red backdrop-blur-sm hover:bg-black/70 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  aria-label="Delete"
                >
                  <Trash2 size={14} strokeWidth={2.3} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Photo strip */}
      {current.photos.length > 0 && (
        <PhotoStrip
          items={current.photos.map((p) => ({ id: p.id, previewUrl: p.previewUrl }))}
          onReorder={reorder}
          onRemove={remove}
          onAdd={openPicker}
          maxItems={MAX_PHOTOS}
          activeId={active?.id}
          onSelect={(id) => {
            const idx = current.photos.findIndex((p) => p.id === id)
            if (idx >= 0) setActiveIdx(idx)
          }}
        />
      )}

      {/* Mobile: aspect chips below photo strip */}
      {showFrame && current.photos.length > 0 && (
        <div className="lg:hidden">
          <AspectChips value={current.aspect} onChange={(a) => update({ aspect: a })} />
        </div>
      )}

      </div>{/* end main column */}

      {/* Desktop: aspect chips in absolute sidebar to the right,
          matching the reel editor's sidebar position. */}
      {showFrame && current.photos.length > 0 && (
        <div
          className="hidden lg:block lg:absolute lg:top-0 lg:w-[180px]"
          style={{ left: 'calc(50% + 336px + 24px)' }}
        >
          <AspectChips value={current.aspect} onChange={(a) => update({ aspect: a })} />
        </div>
      )}
    </div>
  )
}
