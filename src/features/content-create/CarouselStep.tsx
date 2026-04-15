import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react'
import { AspectChips } from './components/AspectChips'
import { PhotoStrip } from './components/PhotoStrip'
import { probePhoto } from './lib/probe'
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
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5,
  original: null,
}

export function CarouselStep({ draft, onChange }: CarouselStepProps) {
  const current = draft ?? emptyDraft()
  const [activeIdx, setActiveIdx] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const prev = () => setActiveIdx((i) => (i > 0 ? i - 1 : current.photos.length - 1))
  const next = () => setActiveIdx((i) => (i < current.photos.length - 1 ? i + 1 : 0))

  const aspectRatio = ASPECT_RATIO[current.aspect]
  const active = current.photos[activeIdx]

  return (
    <div className="flex flex-col gap-5">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Preview */}
      <div
        className="relative w-full mx-auto rounded-[18px] overflow-hidden bg-white/[0.04] border border-white/[0.06]"
        style={{
          aspectRatio: aspectRatio ?? (active ? active.aspect : 4 / 5),
          maxWidth: 520,
        }}
      >
        {current.photos.length === 0 ? (
          <button
            type="button"
            onClick={openPicker}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70 hover:text-white cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-white/[0.08] flex items-center justify-center">
              <Camera size={22} />
            </div>
            <p className="text-[14px] font-semibold">Add photos</p>
            <p className="text-[11px] text-white/40">Up to {MAX_PHOTOS} images</p>
          </button>
        ) : (
          <>
            <AnimatePresence mode="wait" initial={false}>
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
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
          </>
        )}
      </div>

      {/* Aspect chips */}
      {current.photos.length > 0 && (
        <AspectChips value={current.aspect} onChange={(a) => update({ aspect: a })} />
      )}

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
    </div>
  )
}
