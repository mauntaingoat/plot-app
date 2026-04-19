import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useThemeStore } from '@/stores/themeStore'
import { EditorStep } from '@/features/content-editor/EditorStep'
import { useEditorStore } from '@/features/content-editor/state/editorStore'
import { renderComposition } from '@/features/content-editor/lib/render'
import { CarouselStep } from '@/features/content-create/CarouselStep'
import { publishCarouselPhotos } from '@/features/content-create/lib/publish'
import { probePhoto } from '@/features/content-create/lib/probe'
import { uploadFile, pinMediaPath } from '@/lib/storage'
import { generateVideoThumbnail } from '@/lib/videoThumbnail'
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
  const [saveProgress, setSaveProgress] = useState('')
  const [carouselDraft, setCarouselDraft] = useState<CarouselDraft | null>(null)

  // On mount: fetch the media from its URL and load into the editor.
  useEffect(() => {
    if (!content) { setLoading(false); return }

    const load = async () => {
      try {
        if (isReel) {
          // Use sourceUrl (the original Firebase Storage URL) for editing.
          const editUrl = content.sourceUrl
          if (!editUrl) {
            alert('This content can\'t be edited — the original source is no longer available.')
            setLoading(false)
            return
          }
          editorReset()
          try {
            const res = await fetch(editUrl)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const blob = await res.blob()
            const file = new File([blob], `edit-${content.id}.mp4`, {
              type: blob.type || 'video/mp4',
            })
            await useEditorStore.getState().importFiles([file])
          } catch {
            console.warn(`[ContentEdit] failed to fetch from sourceUrl`)
            alert('This content can\'t be edited — the original source is no longer available.')
          }
        } else if (isPhoto) {
          // Load ALL carousel photos from mediaUrls (or single from mediaUrl)
          const urls = content.mediaUrls && content.mediaUrls.length > 0
            ? content.mediaUrls
            : [content.mediaUrl || content.thumbnailUrl || ''].filter(Boolean)
          if (urls.length === 0) { setLoading(false); return }
          const photos: CarouselPhoto[] = []
          for (let i = 0; i < urls.length; i++) {
            try {
              const res = await fetch(urls[i])
              const blob = await res.blob()
              const file = new File([blob], `edit-${content.id}-${i}.jpg`, {
                type: blob.type || 'image/jpeg',
              })
              const probe = await probePhoto(file)
              photos.push({
                id: `${content.id}-${i}`,
                file,
                previewUrl: probe.previewUrl,
                width: probe.width,
                height: probe.height,
                aspect: probe.aspect,
              })
            } catch {
              console.warn(`[ContentEdit] failed to load photo ${i}`)
            }
          }
          if (photos.length > 0) {
            setCarouselDraft({
              id: content.id,
              kind: 'carousel',
              photos,
              aspect: '4:5',
            })
          }
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
    if (!content) return
    setSaving(true)
    setSaveProgress('Preparing…')

    try {
      const pinId = pin?.id || `unlinked-${content.id}`
      const contentId = content.id

      if (isReel) {
        // Render via the same pipeline as pin creation — uploads clips
        // to Firebase Storage, then hands URLs to Mux for transcoding.
        const latestClips = useEditorStore.getState().clips
        if (latestClips.length === 0) { setSaving(false); return }

        setSaveProgress('Rendering…')
        const result = await renderComposition({
          clips: latestClips,
          aspect: useEditorStore.getState().aspect,
          overlays: useEditorStore.getState().overlays,
          pinId,
          contentId,
          caption: content.caption || '',
          onProgress: (phase, pct) => {
            if (phase === 'upload') setSaveProgress(`Uploading… ${Math.round(pct * 100)}%`)
            else if (phase === 'queue') setSaveProgress('Almost there…')
            else setSaveProgress('Preparing…')
          },
        })

        // Update the content doc: clear mediaUrl (Mux webhook will set it),
        // store sourceUrl for future editing, set status to preparing.
        setSaveProgress('Saving…')
        const { updateContent } = await import('@/lib/firestore')
        const editorAspect = useEditorStore.getState().aspect
        const reelPatch = {
          status: 'ready' as const,
          mediaUrl: result.storageUrl || '',
          sourceUrl: result.storageUrl || '',
          aspect: editorAspect,
        }
        await updateContent(contentId, reelPatch as any)

        // If linked to a pin, also update the pin's content array
        if (pin?.id) {
          const { updatePin } = await import('@/lib/firestore')
          const updatedContent = (pin.content || []).map((c) =>
            c.id === contentId ? { ...c, ...reelPatch } : c,
          )
          await updatePin(pin.id, { content: updatedContent } as any)
        }
      } else if (isPhoto && carouselDraft) {
        // Photo carousel — re-upload photos to Storage and update URLs.
        setSaveProgress('Uploading photos…')
        const urls: string[] = []
        for (let i = 0; i < carouselDraft.photos.length; i++) {
          const photo = carouselDraft.photos[i]
          const filename = `content-${contentId}-photo-${i}-${Date.now()}.jpg`
          const url = await uploadFile({
            path: pinMediaPath(pinId, filename),
            file: photo.file,
          })
          urls.push(url)
        }

        setSaveProgress('Saving…')
        const patch: Partial<ContentItem> = {
          mediaUrl: urls[0] || content.mediaUrl,
          thumbnailUrl: urls[0] || content.thumbnailUrl,
          status: 'ready',  // Photos don't need Mux transcoding
          ...(urls.length > 1 ? { mediaUrls: urls } : {}),
          ...(carouselDraft.aspect ? { aspect: carouselDraft.aspect } : {}),
        }
        const { updateContent } = await import('@/lib/firestore')
        await updateContent(contentId, patch as any)

        if (pin?.id) {
          const { updatePin } = await import('@/lib/firestore')
          const updatedContent = (pin.content || []).map((c) =>
            c.id === contentId ? { ...c, ...patch } : c,
          )
          await updatePin(pin.id, { content: updatedContent } as any)
        }
      }

      navigate(-1)
    } catch (err) {
      console.error('[ContentEdit] save failed', err)
      alert(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
      setSaveProgress('')
    }
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
            <div className="flex flex-col gap-2 mt-4">
              <Button
                variant="primary"
                size="xl"
                fullWidth
                loading={saving}
                disabled={editorClips.length === 0}
                onClick={handleSave}
              >
                {saving ? (saveProgress || 'Saving…') : 'Save'}
              </Button>
            </div>
          } />
        ) : (
          <div className="max-w-2xl mx-auto w-full">
            <CarouselStep draft={carouselDraft} onChange={setCarouselDraft} />
            <div className="flex flex-col gap-2 mt-6">
              <Button
                variant="primary"
                size="xl"
                fullWidth
                loading={saving}
                disabled={!carouselDraft || carouselDraft.photos.length === 0}
                onClick={handleSave}
              >
                {saving ? (saveProgress || 'Saving…') : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
