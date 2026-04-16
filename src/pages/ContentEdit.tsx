import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useThemeStore } from '@/stores/themeStore'
import { EditorStep } from '@/features/content-editor/EditorStep'
import { useEditorStore } from '@/features/content-editor/state/editorStore'
import { CarouselStep } from '@/features/content-create/CarouselStep'
import { probePhoto } from '@/features/content-create/lib/probe'
import type { CarouselDraft, CarouselPhoto } from '@/features/content-create/types'
import type { ContentItem, Pin } from '@/lib/types'

/**
 * Standalone content editor — reached from the Content tab's "Edit Reel"
 * or "Edit Carousel" menu option. Renders JUST the editor + a Save
 * button with a simple X-to-close header. No pin-creation steps.
 *
 * Content data arrives via React Router `state`: { content, pin }.
 */
export default function ContentEdit() {
  const navigate = useNavigate()
  const location = useLocation()
  const { content, pin } = (location.state ?? {}) as {
    content?: ContentItem
    pin?: Pin | null
  }

  const activateTheme = useThemeStore((s) => s.activate)
  const isDark = useThemeStore((s) => s.resolved) === 'dark'
  useEffect(() => activateTheme(), [activateTheme])

  const editorReset = useEditorStore((s) => s.reset)
  const editorClips = useEditorStore((s) => s.clips)

  const isReel = content?.type === 'reel' || content?.type === 'video_note' || content?.type === 'live'
  const isPhoto = content?.type === 'photo'
  const title = isReel ? 'Edit Reel' : 'Edit Carousel'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [carouselDraft, setCarouselDraft] = useState<CarouselDraft | null>(null)

  // On mount: fetch the media from its URL and load into the editor.
  useEffect(() => {
    if (!content) { setLoading(false); return }

    const load = async () => {
      try {
        if (isReel && content.mediaUrl) {
          editorReset()
          const res = await fetch(content.mediaUrl)
          const blob = await res.blob()
          const ext = content.mediaUrl.split('.').pop()?.split('?')[0] || 'mp4'
          const file = new File([blob], `edit-${content.id}.${ext}`, {
            type: blob.type || 'video/mp4',
          })
          await useEditorStore.getState().importFiles([file])
        } else if (isPhoto) {
          // Load the photo into a carousel draft
          const photoUrl = content.mediaUrl || content.thumbnailUrl || ''
          if (!photoUrl) { setLoading(false); return }
          const res = await fetch(photoUrl)
          const blob = await res.blob()
          const file = new File([blob], `edit-${content.id}.jpg`, {
            type: blob.type || 'image/jpeg',
          })
          const probe = await probePhoto(file)
          const photo: CarouselPhoto = {
            id: content.id,
            file,
            previewUrl: probe.previewUrl,
            width: probe.width,
            height: probe.height,
            aspect: probe.aspect,
          }
          setCarouselDraft({
            id: content.id,
            kind: 'carousel',
            photos: [photo],
            aspect: '4:5',
          })
        }
      } catch (err) {
        console.warn('[ContentEdit] failed to load media', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { editorReset() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setSaving(true)
    // TODO: re-render via Mux/ffmpeg + update Firestore content item.
    // For now, navigate back after a short delay to indicate "saved".
    setTimeout(() => {
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  if (!content) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0A0E17] text-white' : 'bg-ivory text-ink'}`}>
        <p className="text-[14px]">No content to edit.</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0A0E17]' : 'bg-ivory'}`}>
      {/* Header */}
      <div
        className={`sticky top-0 z-[100] backdrop-blur-xl ${
          isDark
            ? 'bg-[#0A0E17]/92 border-b border-white/[0.06]'
            : 'bg-ivory/95 border-b border-border-light'
        }`}
      >
        <div
          className="max-w-2xl mx-auto px-5 flex items-center gap-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)', paddingBottom: '12px' }}
        >
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'bg-white/[0.09] hover:bg-white/[0.14]' : 'bg-cream'
            }`}
          >
            <X size={18} className={isDark ? 'text-white/95' : 'text-ink'} />
          </motion.button>
          <h1 className={`text-[18px] font-bold tracking-tight ${isDark ? 'text-white' : 'text-ink'}`}>
            {title}
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-5 py-6" style={{ minHeight: 'calc(100dvh - 200px)' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 size={32} className="text-tangerine animate-spin" />
            <p className={`text-[13px] ${isDark ? 'text-white/65' : 'text-smoke'}`}>Loading media…</p>
          </div>
        ) : isReel ? (
          <EditorStep direction={1} simpleMode footer={
            <div className="flex gap-3 mt-4">
              <Button
                variant="primary"
                size="xl"
                fullWidth
                loading={saving}
                disabled={editorClips.length === 0}
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          } />
        ) : (
          <div className="max-w-2xl mx-auto w-full">
            <CarouselStep draft={carouselDraft} onChange={setCarouselDraft} />
            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                size="xl"
                fullWidth
                loading={saving}
                disabled={!carouselDraft || carouselDraft.photos.length === 0}
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
