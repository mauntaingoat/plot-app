import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, MapPin, Search, Check, Upload, Video, Camera, X, DollarSign, Home, BadgeCheck, Compass, Plus, Film, Mic, Clock, Lock, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useGeocoding } from '@/hooks/useGeocoding'
import { useAuthStore } from '@/stores/authStore'
import { createPin, createContent } from '@/lib/firestore'
import { uploadFile, pinMediaPath } from '@/lib/storage'
import { PIN_CONFIG, type PinType, type ContentItem } from '@/lib/types'
import { Timestamp } from 'firebase/firestore'
import { getTierLimits, canUploadVideo, hasFeature, type Tier } from '@/lib/tiers'
import { PaywallPrompt } from '@/components/dashboard/PaywallPrompt'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { generateVideoThumbnail } from '@/lib/videoThumbnail'
import { useThemeStore } from '@/stores/themeStore'
import { EditorStep } from '@/features/content-editor/EditorStep'
import { useEditorStore } from '@/features/content-editor/state/editorStore'
import { renderComposition, type RenderPhase } from '@/features/content-editor/lib/render'
import { CarouselStep } from '@/features/content-create/CarouselStep'
import { publishCarouselPhotos } from '@/features/content-create/lib/publish'
import type { ContentDraft, EditorDraftKind } from '@/features/content-create/types'

const PIN_OPTIONS: { type: PinType; label: string; desc: string; icon: typeof Home; color: string }[] = [
  { type: 'for_sale', label: 'For Sale Listing', desc: 'Active listing with MLS data, photos, and content', icon: Home, color: '#3B82F6' },
  { type: 'sold', label: 'Sold Listing', desc: 'Closed sale — showcase your track record', icon: BadgeCheck, color: '#34C759' },
  { type: 'spotlight', label: 'Spotlight', desc: 'Highlight a neighborhood, building, or local favorite', icon: Compass, color: '#FF6B3D' },
]

type Step = 'type' | 'address' | 'details' | 'content-type' | 'edit' | 'publish' | 'content' | 'publishing'

/**
 * Content kinds the user can choose from on the content-type step.
 * Each maps to a different sub-flow (or a configured editor session).
 */
type ContentKind = 'carousel' | 'reel'

export default function PinCreate() {
  const navigate = useNavigate()
  const { id: existingPinId } = useParams<{ id: string }>()
  const { userDoc } = useAuthStore()
  const { results, search, clear } = useGeocoding()
  const activateTheme = useThemeStore((s) => s.activate)
  const resolvedTheme = useThemeStore((s) => s.resolved)
  const isDark = resolvedTheme === 'dark'
  useEffect(() => activateTheme(), [activateTheme])

  // Check if we're in "add content" mode (skip to content step, no back).
  // existingPinId is set when adding content to an existing pin via
  // /dashboard/pin/:id/edit?tab=content — content attaches to that pin.
  const isAddContentMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'content'

  const [step, _setStep] = useState<Step>(isAddContentMode ? 'content-type' : 'type')
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back
  const STEP_ORDER: Step[] = ['type', 'address', 'details', 'content-type', 'edit', 'publish', 'content', 'publishing']
  const [contentKind, setContentKind] = useState<ContentKind | null>(null)

  /**
   * Accumulated content drafts. Union of the simple create-flow drafts
   * (carousel / reel / multi-reel) and the legacy Studio-tier editor draft.
   * On final publish, each draft maps to one or more ContentItems on the pin.
   */
  const [contentDrafts, setContentDrafts] = useState<ContentDraft[]>([])
  /** The draft currently being built in the step === 'edit' view. */
  const [currentDraft, setCurrentDraft] = useState<ContentDraft | null>(null)
  /** When the user is editing an existing draft, this is its id. */
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  /** True when the user picked "Publish without content" — hides Add more content. */
  const [skippedContent, setSkippedContent] = useState(false)
  const goTo = (next: Step) => {
    setDirection(STEP_ORDER.indexOf(next) >= STEP_ORDER.indexOf(step) ? 1 : -1)
    _setStep(next)
  }
  const setStep = goTo
  const [pinType, setPinType] = useState<PinType | null>(null)
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [paywall, setPaywall] = useState<{ open: boolean; reason: string; upgradeTo?: Tier }>({ open: false, reason: '' })

  const tierLimits = getTierLimits(userDoc)

  // Listing details
  const [price, setPrice] = useState('')
  const [beds, setBeds] = useState(3)
  const [baths, setBaths] = useState(2)
  const [sqft, setSqft] = useState('')
  const [description, setDescription] = useState('')
  const [homeType, setHomeType] = useState('condo')
  const [yearBuilt, setYearBuilt] = useState('')
  const [photos, setPhotos] = useState<File[]>([])

  // Neighborhood details
  const [neighborhoodName, setNeighborhoodName] = useState('')

  // Content items (added during creation)
  const [contentItems, setContentItems] = useState<{ type: string; caption: string; file: File | null; preview: string | null; publishAt: string | null }[]>([])
  const [showAddContent, setShowAddContent] = useState(false)
  const [newContentType, setNewContentType] = useState<'reel' | 'photo'>('reel')
  const [newCaption, setNewCaption] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newPreview, setNewPreview] = useState<string | null>(null)
  // Schedule for later — Pro feature; ISO datetime-local string ('' = publish now)
  const [newPublishAt, setNewPublishAt] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Publish step — per-draft caption editing.
  const [selectedDraftIdx, setSelectedDraftIdx] = useState(0)
  const [showMissingCaptionWarn, setShowMissingCaptionWarn] = useState(false)
  const CAPTION_LIMIT = 300
  // When the user taps "+ Add more content" on the Publish step, we
  // flag the next picker/edit trip as an "add-more" session. In this
  // mode, the normal Back path from those steps is disabled, and an
  // extra button lets them return to the Publish drafts screen if
  // they change their mind.
  const [addingMoreContent, setAddingMoreContent] = useState(false)

  const handleAddressSearch = (val: string) => {
    setAddress(val); setCoords(null)
    search(val, pinType === 'spotlight' ? 'spotlight' : 'address')
  }

  // Scroll-to-top is now triggered by AnimatePresence onExitComplete
  // (see the AnimatePresence below) so the page doesn't jarringly jump
  // BEFORE the fade-out animation runs.

  const selectAddress = (result: { placeName: string; center: [number, number] }) => {
    setAddress(result.placeName); setCoords({ lat: result.center[1], lng: result.center[0] }); clear()
  }

  const handleMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setNewFile(file); setNewPreview(URL.createObjectURL(file))
  }

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotos(Array.from(e.target.files || []))
  }

  const addContent = async () => {
    if (!newCaption.trim() && !newFile) return

    // Gate: max content per pin
    if (contentItems.length >= tierLimits.maxContentPerPin) {
      setPaywall({
        open: true,
        reason: `You've reached ${tierLimits.maxContentPerPin} content items per pin on the ${tierLimits.name} plan.`,
        upgradeTo: tierLimits.id === 'free' ? 'pro' : 'studio',
      })
      return
    }

    // Gate: video length
    if (newFile && newContentType === 'reel') {
      const duration = await getVideoDuration(newFile).catch(() => 0)
      const gate = canUploadVideo(userDoc, duration)
      if (!gate.allowed) {
        setPaywall({ open: true, reason: gate.reason || '', upgradeTo: gate.upgradeTo })
        return
      }
    }

    setContentItems([...contentItems, {
      type: newContentType,
      caption: newCaption,
      file: newFile,
      preview: newPreview,
      publishAt: newPublishAt || null,
    }])
    setNewCaption(''); setNewFile(null); setNewPreview(null); setNewPublishAt(''); setShowAddContent(false)
  }

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => { resolve(video.duration); URL.revokeObjectURL(video.src) }
      video.onerror = () => reject()
      video.src = URL.createObjectURL(file)
    })
  }

  const removeContent = (idx: number) => {
    setContentItems(contentItems.filter((_, i) => i !== idx))
  }

  type LegacyContentDraft = { type: string; caption: string; file: File | null; preview: string | null; publishAt: string | null }
  const handlePublish = async (override?: LegacyContentDraft[]) => {
    if (!pinType || !coords) return
    const items: LegacyContentDraft[] = override ?? contentItems
    // Neighborhood pins must have at least one content item
    if (pinType === 'spotlight' && items.length === 0) {
      alert('Neighborhood pins require at least one piece of content (reel, photo, or video note).')
      return
    }
    const agentId = userDoc?.uid || 'demo-agent'
    setSaving(true); setStep('publishing')

    // Timeout after 15s
    const timeout = setTimeout(() => {
      setSaving(false); setStep('publish')
      alert('Publishing timed out. Please try again.')
    }, 15000)

    try {
      const pinData: Record<string, unknown> = {
        agentId,
        type: pinType,
        coordinates: coords,
        address,
        neighborhoodId: '',
        geohash: '',
        enabled: true,
        content: [],
      }

      if (pinType === 'for_sale') {
        Object.assign(pinData, {
          price: Number(price) || 0, beds, baths, sqft: Number(sqft) || 0,
          pricePerSqft: Number(sqft) ? Math.round((Number(price) || 0) / Number(sqft)) : 0,
          homeType, yearBuilt: yearBuilt ? Number(yearBuilt) : null,
          description, listingStatus: 'active', daysOnMarket: 0,
          heroPhotoUrl: '', photos: [], openHouse: null, isLive: false,
        })
      } else if (pinType === 'sold') {
        Object.assign(pinData, {
          soldPrice: Number(price) || 0, originalPrice: Number(price) || 0,
          soldDate: Timestamp.now(), beds, baths, sqft: Number(sqft) || 0,
          pricePerSqft: Number(sqft) ? Math.round((Number(price) || 0) / Number(sqft)) : 0,
          homeType, yearBuilt: yearBuilt ? Number(yearBuilt) : null,
          description, daysOnMarket: 0, heroPhotoUrl: '', photos: [],
        })
      } else if (pinType === 'spotlight') {
        Object.assign(pinData, {
          name: neighborhoodName || address.split(',')[0],
          description, heroPhotoUrl: '',
        })
      }

      // Create pin doc
      const pinId = await createPin(pinData)

      // Upload listing photos
      if (photos.length > 0 && (pinType === 'for_sale' || pinType === 'sold')) {
        const urls: string[] = []
        for (const photo of photos) {
          const url = await uploadFile({ path: pinMediaPath(pinId, photo.name), file: photo, onProgress: setUploadProgress })
          urls.push(url)
        }
        const { updatePin } = await import('@/lib/firestore')
        await updatePin(pinId, { photos: urls, heroPhotoUrl: urls[0] || '' })
      }

      // Upload content media + build content array
      if (items.length > 0) {
        const contentArray: ContentItem[] = []
        for (const item of items) {
          let mediaUrl = ''
          let thumbnailUrl = ''
          if (item.file) {
            mediaUrl = await uploadFile({ path: pinMediaPath(pinId, `content-${Date.now()}-${item.file.name}`), file: item.file, onProgress: setUploadProgress })
            // For videos, extract a real thumbnail from the first frame
            if (item.file.type.startsWith('video/')) {
              try {
                const thumbBlob = await generateVideoThumbnail(item.file)
                const thumbFile = new File([thumbBlob], `thumb-${Date.now()}.jpg`, { type: 'image/jpeg' })
                thumbnailUrl = await uploadFile({ path: pinMediaPath(pinId, `thumb-${Date.now()}.jpg`), file: thumbFile })
              } catch {
                thumbnailUrl = mediaUrl // fallback if thumbnail generation fails
              }
            } else {
              thumbnailUrl = mediaUrl
            }
          }
          contentArray.push({
            id: `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: item.type as any,
            mediaUrl,
            thumbnailUrl,
            caption: item.caption,
            createdAt: Timestamp.now(),
            views: 0,
            saves: 0,
            publishAt: item.publishAt ? Timestamp.fromDate(new Date(item.publishAt)) : null,
          })
        }

        // Compute earliest future publishAt — used as a hint field
        // for the publishScheduledContent cron Function so it can
        // skip pins with no due content via a simple <= query.
        const now = Date.now()
        const future = contentArray
          .map((c) => c.publishAt?.toMillis?.() ?? null)
          .filter((ms): ms is number => ms != null && ms > now)
        const nextPublishAt = future.length > 0
          ? Timestamp.fromMillis(Math.min(...future))
          : null

        const { updatePin } = await import('@/lib/firestore')
        await updatePin(pinId, { content: contentArray, nextPublishAt })
      }

      clearTimeout(timeout)
      navigate('/dashboard')
    } catch (err) {
      clearTimeout(timeout)
      console.error('Failed to create pin:', err)
      setSaving(false); setStep('publish')
      alert(`Failed to publish: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const editorReset = useEditorStore((s) => s.reset)
  const editorClips = useEditorStore((s) => s.clips)
  // Reel composed duration — used to enforce the 3-minute per-reel cap.
  const editorTotalDuration = useEditorStore((s) => s.totalDuration())
  const REEL_MAX_SECONDS = 180
  const reelOverLimit = contentKind === 'reel' && editorTotalDuration > REEL_MAX_SECONDS
  const editorAspect = useEditorStore((s) => s.aspect)
  const editorOverlays = useEditorStore((s) => s.overlays)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null)

  // Whether the user has any unsaved input — drives the discard confirmation
  // skip on Step 1 with nothing chosen.
  const hasUnsavedWork =
    !!pinType || !!address.trim() || !!price || !!description ||
    editorClips.length > 0 || editorOverlays.length > 0

  const handleHeaderBack = () => {
    if (!hasUnsavedWork) {
      navigate(-1)
      return
    }
    setShowDiscardConfirm(true)
  }
  const confirmDiscard = () => {
    setShowDiscardConfirm(false)
    editorReset()
    navigate(-1)
  }
  const [renderProgress, setRenderProgress] = useState(0)
  const [renderPhase, setRenderPhase] = useState<'idle' | RenderPhase>('idle')

  // Reset editor on unmount so stale clips don't leak across sessions
  useEffect(() => () => { editorReset() }, [editorReset])

  /**
   * Publish standalone content (no pin). Used when the user arrives via
   * the Content tab (+Upload) and hits Publish — there's no pin to create.
   * Each draft is saved either:
   * - To the existing pin's content[] array (if existingPinId is set)
   * - To the standalone `content` Firestore collection (if no pin)
   */
  const handlePublishContent = async () => {
    if (contentDrafts.length === 0) return

    if (!userDoc?.uid || userDoc.uid.startsWith('demo') || userDoc.uid.startsWith('carolina')) {
      alert('You need to sign in with a real account before publishing. Visit /sign-up to create one.')
      return
    }

    setSaving(true)
    setStep('publishing')
    setRenderPhase('upload')
    setRenderProgress(0)

    const agentId = userDoc.uid
    // When adding content to an existing pin, use that pin's ID for
    // Storage paths and to attach the content items to the pin doc.
    const targetPinId = existingPinId || null
    const storagePinId = targetPinId || `unlinked-${Date.now()}`

    try {
      const newContentItems: import('@/lib/types').ContentItem[] = []

      for (let i = 0; i < contentDrafts.length; i++) {
        const draft = contentDrafts[i]
        const contentId = `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        if (draft.kind === 'carousel') {
          const items = await publishCarouselPhotos(
            draft,
            storagePinId,
            (phase, pct) => {
              setRenderPhase(phase as RenderPhase)
              setRenderProgress(Math.round(((i + pct) / contentDrafts.length) * 100))
            },
          )
          for (const item of items) {
            item.caption = draft.caption ?? ''
            newContentItems.push(item)
          }
        } else {
          const draftClips = draft.clipFiles.map((file, idx) => ({
            id: `${draft.id}-${idx}`,
            file,
            sourceUrl: '',
            thumbnailUrl: '',
            frames: [],
            nativeAspect: 9 / 16,
            type: file.type.startsWith('video') ? ('video' as const) : ('photo' as const),
            duration: 0,
            trimIn: draft.clipMeta[idx]?.trimIn ?? 0,
            trimOut: draft.clipMeta[idx]?.trimOut ?? 0,
            speed: (draft.clipMeta[idx]?.speed ?? 1) as 0.5 | 1 | 1.5 | 2,
            adjustments: draft.clipMeta[idx]?.adjustments ?? { brightness: 0, contrast: 0, saturation: 0 },
          }))

          const result = await renderComposition({
            clips: draftClips as any,
            aspect: draft.aspect,
            overlays: draft.overlays,
            pinId: storagePinId,
            contentId,
            caption: draft.caption ?? '',
            onProgress: (phase, pct) => {
              setRenderPhase(phase)
              setRenderProgress(Math.round(((i + pct) / contentDrafts.length) * 100))
            },
          })

          newContentItems.push({
            id: contentId,
            type: 'reel',
            mediaUrl: result.mp4Url,
            thumbnailUrl: `https://image.mux.com/${result.muxPlaybackId}/thumbnail.webp?width=720`,
            caption: draft.caption ?? '',
            createdAt: Timestamp.now(),
            views: 0,
            saves: 0,
            publishAt: null,
          })
        }
      }

      // Attach to existing pin OR save as standalone content docs.
      if (targetPinId && newContentItems.length > 0) {
        const { updatePin } = await import('@/lib/firestore')
        // Fetch current pin content and append
        const { getDoc, doc } = await import('firebase/firestore')
        const { db } = await import('@/config/firebase')
        if (db) {
          const pinSnap = await getDoc(doc(db, 'pins', targetPinId))
          const existing: any[] = pinSnap.exists() ? (pinSnap.data().content || []) : []
          await updatePin(targetPinId, { content: [...existing, ...newContentItems] })
        }
      } else {
        for (const item of newContentItems) {
          await createContent({
            agentId,
            pinId: null,
            type: item.type,
            mediaUrl: item.mediaUrl,
            mediaUrls: item.mediaUrls,
            thumbnailUrl: item.thumbnailUrl,
            caption: item.caption,
            publishAt: item.publishAt ?? null,
          })
        }
      }

      navigate('/dashboard')
    } catch (err) {
      setSaving(false)
      setStep('publish')
      alert(`Failed to publish content — ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Publish: handles three cases.
   *  1. skippedContent === true → publish the pin with no content
   *  2. contentDrafts.length > 0 → render each draft as its own ContentItem
   *  3. legacy fallback → use the live editor session as a single draft
   *
   * Each content draft becomes its own Mux asset (option A from the spec).
   * Drafts render sequentially with progress shown per-draft.
   */
  const handlePublishFromEditor = async (opts?: { skip?: boolean }) => {
    if (!pinType || !coords) return

    // Preflight auth check
    if (!userDoc?.uid || userDoc.uid.startsWith('demo') || userDoc.uid.startsWith('carolina')) {
      alert('You need to sign in with a real account before publishing. Visit /sign-up to create one.')
      return
    }

    // Duplicate check — don't allow two pins at the same address.
    try {
      const { getAgentPins } = await import('@/lib/firestore')
      const existing = await getAgentPins(userDoc.uid)
      const duplicate = existing.find((p) => p.address === address)
      if (duplicate) {
        alert(`You already have a pin at "${address}". Edit the existing pin instead of creating a duplicate.`)
        return
      }
    } catch { /* proceed if check fails */ }

    // Honor an immediate-skip override (from the details step's
    // "Post now, add content later" button) since setState hasn't
    // propagated synchronously when the button fires.
    const skipNow = opts?.skip ?? skippedContent

    if (skipNow) {
      if (pinType === 'spotlight') {
        alert('Spotlight pins require at least one piece of content.')
        return
      }
    } else if (contentDrafts.length === 0) {
      return
    }

    setSaving(true)
    setStep('publishing')
    setRenderPhase('upload')
    setRenderProgress(0)

    const agentId = userDoc?.uid || 'demo-agent'

    // Build type-specific pin data (mirrors handlePublish logic)
    const pinData: Record<string, unknown> = {
      agentId, type: pinType, coordinates: coords, address,
      neighborhoodId: '', geohash: '', enabled: true, content: [],
    }
    if (pinType === 'for_sale') {
      Object.assign(pinData, {
        price: Number(price) || 0, beds, baths, sqft: Number(sqft) || 0,
        pricePerSqft: Number(sqft) ? Math.round((Number(price) || 0) / Number(sqft)) : 0,
        homeType, yearBuilt: yearBuilt ? Number(yearBuilt) : null,
        description, listingStatus: 'active', daysOnMarket: 0,
        heroPhotoUrl: '', photos: [], openHouse: null, isLive: false,
      })
    } else if (pinType === 'sold') {
      Object.assign(pinData, {
        soldPrice: Number(price) || 0, originalPrice: Number(price) || 0,
        soldDate: Timestamp.now(), beds, baths, sqft: Number(sqft) || 0,
        pricePerSqft: Number(sqft) ? Math.round((Number(price) || 0) / Number(sqft)) : 0,
        homeType, yearBuilt: yearBuilt ? Number(yearBuilt) : null,
        description, daysOnMarket: 0, heroPhotoUrl: '', photos: [],
      })
    } else if (pinType === 'spotlight') {
      Object.assign(pinData, {
        name: neighborhoodName || address.split(',')[0],
        description, heroPhotoUrl: '',
      })
    }

    // Pre-generate stable IDs for each draft so the pre-created (empty)
    // placeholder items line up with the final rendered items below.
    const placeholderIds = contentDrafts.map(() => `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

    const runStep = async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn()
      } catch (err) {
        console.error(`[editor] publish failed at step "${label}":`, err)
        throw new Error(`${label}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pinId = await runStep('createPin', () => createPin(pinData))

      if (photos.length > 0 && (pinType === 'for_sale' || pinType === 'sold')) {
        const urls: string[] = []
        for (const photo of photos) {
          const url = await runStep(`uploadListingPhoto(${photo.name})`, () =>
            uploadFile({ path: pinMediaPath(pinId, photo.name), file: photo }),
          )
          urls.push(url)
        }
        await runStep('updatePinWithPhotos', async () => {
          const { updatePin } = await import('@/lib/firestore')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await updatePin(pinId, { photos: urls, heroPhotoUrl: urls[0] || '' })
        })
      }

      // Walk each draft and turn it into one or more ContentItems.
      const contentArray: ContentItem[] = []
      for (let i = 0; i < contentDrafts.length; i++) {
        const draft = contentDrafts[i]
        const contentId = placeholderIds[i]
        const onDraftProgress = (phase: RenderPhase | 'preprocess' | 'upload', pct: number) => {
          setRenderPhase(phase as RenderPhase)
          setRenderProgress(Math.round(((i + pct) / contentDrafts.length) * 100))
        }

        if (draft.kind === 'carousel') {
          const items = await runStep(`publishCarousel(${i + 1}/${contentDrafts.length})`, () =>
            publishCarouselPhotos(draft, pinId, (phase, pct) => onDraftProgress(phase, pct)),
          )
          // Per-draft caption: applied to the FIRST item of the carousel
          // (the one that represents the post in the feed).
          items.forEach((it, idx) => {
            if (idx === 0) it.caption = draft.caption ?? ''
            contentArray.push(it)
          })
        } else {
          // Reel path — uses the existing renderComposition pipeline (Mux).
          // In simple mode the draft has no overlays / adjustments / speed,
          // so renderComposition takes the Mux fast path (concat + trim).
          const draftClips = draft.clipFiles.map((file, idx) => ({
            id: `${draft.id}-${idx}`,
            file,
            sourceUrl: '',
            thumbnailUrl: '',
            frames: [],
            nativeAspect: 9 / 16,
            type: file.type.startsWith('video') ? ('video' as const) : ('photo' as const),
            duration: 0,
            trimIn: draft.clipMeta[idx]?.trimIn ?? 0,
            trimOut: draft.clipMeta[idx]?.trimOut ?? 0,
            speed: (draft.clipMeta[idx]?.speed ?? 1) as 0.5 | 1 | 1.5 | 2,
            adjustments: draft.clipMeta[idx]?.adjustments ?? { brightness: 0, contrast: 0, saturation: 0 },
          }))

          const result = await runStep(`renderDraft(${i + 1}/${contentDrafts.length})`, () =>
            renderComposition({
              clips: draftClips as any,
              aspect: draft.aspect,
              overlays: draft.overlays,
              pinId,
              contentId,
              caption: draft.caption ?? '',
              onProgress: (phase, pct) => {
                setRenderPhase(phase)
                setRenderProgress(Math.round(((i + pct) / contentDrafts.length) * 100))
              },
            }),
          )
          // Add the reel to contentArray immediately with the Mux URLs.
          // The mp4/hls URLs work once Mux finishes processing (~30-60s).
          // The webhook will patch with final URLs later, but the content
          // item is attached to the pin right away so it's not empty.
          contentArray.push({
            id: contentId,
            type: 'reel',
            mediaUrl: result.hlsUrl || result.mp4Url || '',
            mp4Url: result.mp4Url,
            thumbnailUrl: result.muxPlaybackId
              ? `https://image.mux.com/${result.muxPlaybackId}/thumbnail.webp?width=720`
              : (draft.thumbnailUrl || ''),
            caption: draft.caption ?? '',
            muxAssetId: result.muxAssetId,
            muxPlaybackId: result.muxPlaybackId,
            status: 'preparing',
            createdAt: Timestamp.now(),
            views: 0,
            saves: 0,
            publishAt: null,
          })
        }
      }

      // Persist the content array for the non-editor drafts. Editor drafts
      // land via the Mux webhook and don't participate in this write.
      if (contentArray.length > 0) {
        const now = Date.now()
        const future = contentArray
          .map((c) => c.publishAt?.toMillis?.() ?? null)
          .filter((ms): ms is number => ms != null && ms > now)
        const nextPublishAt = future.length > 0
          ? Timestamp.fromMillis(Math.min(...future))
          : null
        await runStep('updatePinWithContent', async () => {
          const { updatePin } = await import('@/lib/firestore')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await updatePin(pinId, { content: contentArray, nextPublishAt })
        })
      }

      navigate('/dashboard')
    } catch (err) {
      setSaving(false)
      setStep('publish')
      alert(`Failed to publish — ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div
      className={`min-h-screen ${isDark ? 'bg-[#0A0E17]' : 'bg-ivory'}`}
      style={{ transition: 'background-color 300ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      {/* Header */}
      <div
        className={`sticky top-0 z-[100] backdrop-blur-xl ${
          isDark
            ? 'bg-[#0A0E17]/92 border-b border-white/[0.06]'
            : 'bg-ivory/95 border-b border-border-light'
        }`}
        style={{ transition: 'background-color 300ms cubic-bezier(0.32, 0.72, 0, 1), border-color 300ms' }}
      >
        <div className="max-w-2xl mx-auto px-5 flex items-center gap-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)', paddingBottom: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleHeaderBack}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 ${
              isDark ? 'bg-white/[0.09] hover:bg-white/[0.14]' : 'bg-cream'
            }`}
          >
            <X size={18} className={isDark ? 'text-white/95' : 'text-ink'} />
          </motion.button>
          <h1
            className={`text-[18px] font-bold tracking-tight transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-ink'
            }`}
          >
            {isAddContentMode
              ? (step === 'edit'
                ? (contentKind === 'carousel' ? 'New carousel' : 'New reel')
                : 'New Content')
              : step === 'edit'
              ? (contentKind === 'carousel' ? 'Create carousel' : 'Craft your reel')
              : 'New Pin'}
          </h1>
          <div className="flex-1" />
          {/* Step indicator */}
          <div className="flex gap-1">
            {(['type', 'address', 'details', 'content-type', 'edit', 'publish'] as const).map((s, i) => {
              const order = ['type','address','details','content-type','edit','publish'] as const
              const currentIdx = order.indexOf(step as typeof order[number])
              const filled = step === s || (currentIdx > -1 && currentIdx > i)
              return (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    filled ? 'bg-tangerine' : isDark ? 'bg-white/12' : 'bg-pearl'
                  }`}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div
        // Wide container so the editor step can center its 672px main
        // column at the viewport midline AND still fit a 180px tools
        // sidebar floated absolutely to its right. Non-editor steps use
        // an inner `max-w-2xl mx-auto` so they still look centered at
        // 672px. Parent width stays stable across all steps to keep
        // AnimatePresence mode="wait" transitions clean.
        className="max-w-6xl mx-auto px-5 py-6"
        style={{ minHeight: 'calc(100dvh - 200px)' }}
      >
        <AnimatePresence
          mode="wait"
          custom={direction}
          onExitComplete={() => {
            if (typeof window !== 'undefined') {
              window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
            }
          }}
        >
          {/* ═══ STEP 1: TYPE ═══ */}
          {step === 'type' && (
            <motion.div key="type" custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: 20 * d }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: -20 * d }) }} initial="enter" animate="center" exit="exit" className="max-w-2xl mx-auto w-full">
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">What are you adding?</h2>
              <p className="text-[14px] text-smoke mb-6">Choose the type of pin for your map.</p>
              <div className="space-y-3">
                {PIN_OPTIONS.map((opt, i) => {
                  const Icon = opt.icon
                  const selected = pinType === opt.type
                  return (
                    <motion.button key={opt.type} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      whileTap={{ scale: 0.97 }} onClick={() => setPinType(opt.type)}
                      className={`w-full flex items-center gap-4 p-4 rounded-[18px] text-left cursor-pointer border-2 transition-all ${selected ? 'border-tangerine bg-tangerine-soft' : 'border-border-light bg-cream'}`}>
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: selected ? opt.color : `${opt.color}15`, color: selected ? 'white' : opt.color }}>
                        <Icon size={22} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-[15px] font-bold ${selected ? 'text-tangerine' : 'text-ink'}`}>{opt.label}</p>
                        <p className="text-[12px] text-smoke mt-0.5">{opt.desc}</p>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
              <div className="mt-6">
                <Button variant="primary" size="xl" fullWidth disabled={!pinType} onClick={() => setStep('address')}>Continue</Button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 2: ADDRESS ═══ */}
          {step === 'address' && (
            <motion.div key="address" custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: 20 * d }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: -20 * d }) }} initial="enter" animate="center" exit="exit" className="max-w-2xl mx-auto w-full">
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">
                {pinType === 'spotlight' ? 'What location?' : 'Where is it?'}
              </h2>
              <p className="text-[14px] text-smoke mb-6">Search for the address or location.</p>

              <div className="relative mb-4">
                <Input
                  placeholder={pinType === 'spotlight' ? 'Search neighborhoods, cities, counties...' : 'Search address...'}
                  value={address}
                  onChange={(e) => handleAddressSearch(e.target.value)}
                  icon={<Search size={16} />}
                />
                <AnimatePresence>
                  {results.length > 0 && !coords && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-warm-white rounded-[14px] border border-border-light shadow-lg overflow-hidden z-10">
                      {results.map((r, i) => (
                        <button key={i} onClick={() => selectAddress(r)}
                          className="w-full text-left px-4 py-3 hover:bg-cream flex items-start gap-2.5 border-b border-border-light last:border-0 cursor-pointer">
                          <MapPin size={16} className="text-tangerine mt-0.5 shrink-0" />
                          <span className="text-[14px] text-ink">{r.placeName}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {coords && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-cream rounded-[14px] p-3 flex items-center gap-2.5 mb-6">
                  <div className="w-8 h-8 rounded-full bg-sold-green/15 flex items-center justify-center"><Check size={16} className="text-sold-green" /></div>
                  <p className="text-[13px] font-medium text-ink truncate flex-1">{address}</p>
                </motion.div>
              )}

              {/* Neighborhood name auto-derived from selected location — no separate input */}

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" size="xl" onClick={() => setStep('type')} className="flex-1">Back</Button>
                <Button variant="primary" size="xl" disabled={!coords} onClick={() => setStep('details')} className="flex-[2]">Continue</Button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: DETAILS ═══ */}
          {step === 'details' && (
            <motion.div key="details" custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: 20 * d }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: -20 * d }) }} initial="enter" animate="center" exit="exit" className="max-w-2xl mx-auto w-full">
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">Add details</h2>
              <p className="text-[14px] text-smoke mb-6">{address}</p>

              <div className="space-y-4 mb-8">
                {(pinType === 'for_sale' || pinType === 'sold') && (
                  <>
                    <Input label={pinType === 'sold' ? 'Sold price' : 'Listing price'} placeholder="500000" type="number" value={price} onChange={(e) => setPrice(e.target.value)} icon={<DollarSign size={16} />} />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-smoke uppercase tracking-wider mb-1 block">Beds</label>
                        <div className="flex items-center bg-cream rounded-[12px] border border-border-light">
                          <button onClick={() => setBeds(Math.max(0, beds - 1))} className="px-3 py-2.5 text-smoke">-</button>
                          <span className="flex-1 text-center font-bold text-ink text-[15px]">{beds}</span>
                          <button onClick={() => setBeds(beds + 1)} className="px-3 py-2.5 text-smoke">+</button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-smoke uppercase tracking-wider mb-1 block">Baths</label>
                        <div className="flex items-center bg-cream rounded-[12px] border border-border-light">
                          <button onClick={() => setBaths(Math.max(0, baths - 1))} className="px-3 py-2.5 text-smoke">-</button>
                          <span className="flex-1 text-center font-bold text-ink text-[15px]">{baths}</span>
                          <button onClick={() => setBaths(baths + 1)} className="px-3 py-2.5 text-smoke">+</button>
                        </div>
                      </div>
                      <Input label="Sqft" placeholder="2000" type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-smoke uppercase tracking-wider mb-1 block">Home type</label>
                        <select value={homeType} onChange={(e) => setHomeType(e.target.value)}
                          className="w-full h-12 rounded-[14px] bg-cream border border-border-light px-3 text-[14px] text-ink">
                          <option value="condo">Condo</option>
                          <option value="single_family">Single Family</option>
                          <option value="townhouse">Townhouse</option>
                          <option value="multi_family">Multi-Family</option>
                          <option value="land">Land</option>
                          <option value="commercial">Commercial</option>
                        </select>
                      </div>
                      <Input label="Year built" placeholder="2020" type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
                    </div>
                    {/* Photos */}
                    <div>
                      <input ref={photosRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
                      <button onClick={() => photosRef.current?.click()}
                        className="w-full py-6 border-2 border-dashed border-pearl rounded-[16px] flex flex-col items-center gap-1.5 text-smoke hover:bg-cream cursor-pointer transition-colors">
                        <Camera size={24} />
                        <span className="text-[13px] font-medium">{photos.length > 0 ? `${photos.length} photos selected` : 'Upload listing photos'}</span>
                      </button>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[11px] font-medium text-smoke uppercase tracking-wider mb-1 block">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={pinType === 'spotlight' ? 'What makes this place special?' : 'Describe this property...'}
                    rows={3} className="w-full rounded-[14px] bg-cream border border-border-light px-4 py-3 text-[14px] text-ink resize-none placeholder:text-ash outline-none focus:border-tangerine/40" />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Button variant="primary" size="xl" onClick={() => setStep('content-type')} fullWidth>Add content</Button>
                {/* Spotlights require content; hide the skip option for them */}
                {pinType !== 'spotlight' && (
                  <Button
                    variant="secondary"
                    size="xl"
                    fullWidth
                    loading={saving}
                    onClick={() => {
                      setSkippedContent(true)
                      handlePublishFromEditor({ skip: true })
                    }}
                  >
                    Post now, add content later
                  </Button>
                )}
                <Button variant="ghost" size="lg" onClick={() => setStep('address')} fullWidth>
                  Back
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3.5: CONTENT TYPE PICKER ═══ */}
          {step === 'content-type' && (
            <motion.div
              key="content-type"
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: 20 * d }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: -20 * d }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              className="max-w-2xl mx-auto w-full"
            >
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">What kind of content?</h2>
              <p className="text-[14px] text-smoke mb-6">Pick how you want to share this listing.</p>

              <div className="space-y-3 mb-6">
                <ContentKindCard
                  kind="carousel"
                  title="Photo carousel"
                  description="A swipeable set of photos. Quick and simple."
                  icon={<Camera size={22} />}
                  onSelect={() => {
                    // Don't clear editingDraftId here — if the user is
                    // bouncing back/forward (editor → picker → editor),
                    // the existing draft ID prevents duplicates on the
                    // next Continue. Only "+ Add more content" clears it
                    // to start a genuinely new draft.
                    setContentKind('carousel')
                    setStep('edit')
                  }}
                />
                <ContentKindCard
                  kind="reel"
                  title="Video reel"
                  description="One or more clips with trim and frame controls."
                  icon={<Film size={22} />}
                  onSelect={() => {
                    setContentKind('reel')
                    setStep('edit')
                  }}
                />
              </div>

              <div className="flex gap-3">
                {/* Priority order:
                    1. If drafts exist → "Back to drafts" (never leave the
                       content-flow once you've committed at least one draft)
                    2. If came from Content tab (+Upload) → "Cancel" (exit)
                    3. Normal flow → "Back" (to details step) */}
                {contentDrafts.length > 0 ? (
                  <Button
                    variant="secondary"
                    size="xl"
                    onClick={() => {
                      setAddingMoreContent(false)
                      setStep('publish')
                    }}
                    fullWidth
                  >
                    Back to drafts
                  </Button>
                ) : isAddContentMode ? (
                  <Button variant="secondary" size="xl" onClick={() => navigate(-1)} fullWidth>
                    Cancel
                  </Button>
                ) : (
                  <Button variant="secondary" size="xl" onClick={() => setStep('details')} fullWidth>Back</Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 4: EDIT (inline content editor — dark surface) ═══ */}
          {step === 'edit' && (
            <motion.div
              key="edit-wrapper"
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: 20 * d }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: -20 * d }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
            >
              {contentKind === 'carousel' && (
                <div className="px-4 lg:px-12">
                  <CarouselStep
                    draft={(currentDraft && currentDraft.kind === 'carousel') ? currentDraft : null}
                    onChange={(d) => setCurrentDraft(d)}
                  />
                </div>
              )}
              {/* Back / Continue row for the reel (editor) flow — passed
                  into EditorStep as `footer` so it renders INSIDE the
                  main column and aligns exactly with the timeline width
                  on desktop. Mobile still stacks it below the editor. */}
              {contentKind === 'reel' && (
                <EditorStep
                  direction={direction}
                  simpleMode
                  footer={
                    <div className="flex flex-col gap-2">
                      {reelOverLimit && (
                        <p className="text-[11px] text-live-red text-center font-medium px-2">
                          Reels must be under 3 minutes — currently{' '}
                          {Math.floor(editorTotalDuration / 60)}m{' '}
                          {Math.round(editorTotalDuration % 60)}s. Trim clips or
                          remove one to continue.
                        </p>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setStep('content-type')}
                          className="flex-1 h-[52px] rounded-[14px] ed-surface-07 hover:ed-surface-11 ed-fg-85 text-[14px] font-semibold cursor-pointer active:scale-[0.99] transition-all"
                        >
                          Back
                        </button>
                        <motion.button
                          whileTap={(editorClips.length > 0 && !reelOverLimit) ? { scale: 0.98 } : undefined}
                          onClick={() => {
                            // Read the LATEST store state at click time so
                            // any thumbnail the user captured seconds before
                            // tapping Continue is guaranteed to be picked up,
                            // regardless of React render/closure timing.
                            const latest = useEditorStore.getState()
                            const latestClips = latest.clips
                            const latestOverlays = latest.overlays
                            const latestAspect = latest.aspect
                            if (latestClips.length === 0 || reelOverLimit) return
                            const draftId = editingDraftId ?? Math.random().toString(36).slice(2, 10)
                            // Prefer any user-chosen custom thumbnail across
                            // all clips (not just clip 0) since the user may
                            // have captured on a later clip. Falls back to the
                            // first clip's auto-probe thumbnail.
                            const clipWithCustom = latestClips.find((c) => c.customThumbnailUrl)
                            const chosenThumbnail =
                              clipWithCustom?.customThumbnailUrl
                              || latestClips[0]?.thumbnailUrl || ''
                            const newDraft: EditorDraftKind = {
                              id: draftId,
                              kind: 'editor',
                              clipFiles: latestClips.map((c) => c.file),
                              clipMeta: latestClips.map((c) => ({
                                trimIn: c.trimIn,
                                trimOut: c.trimOut,
                                speed: c.speed,
                                adjustments: { ...c.adjustments },
                              })),
                              overlays: [...latestOverlays],
                              aspect: latestAspect,
                              thumbnailUrl: chosenThumbnail,
                            }
                            setContentDrafts((prev) => {
                              const idx = prev.findIndex((d) => d.id === draftId)
                              if (idx >= 0) { const next = [...prev]; next[idx] = newDraft; return next }
                              return [...prev, newDraft]
                            })
                            setEditingDraftId(draftId)
                            setSkippedContent(false)
                            setStep('publish')
                          }}
                          disabled={editorClips.length === 0 || reelOverLimit}
                          className={`flex-[2] h-[52px] rounded-[14px] text-[14px] font-bold transition-all ${
                            editorClips.length === 0 || reelOverLimit
                              ? 'ed-surface-06 ed-fg-30 cursor-not-allowed'
                              : 'bg-tangerine text-white cursor-pointer hover:brightness-110'
                          }`}
                        >
                          Continue
                        </motion.button>
                      </div>
                    </div>
                  }
                />
              )}
              {/* Original Back / Continue row — now only used for carousel. */}
              <div className={`flex gap-3 mt-7 px-4 lg:px-12 ${contentKind === 'reel' ? 'hidden' : ''}`}>
                <button
                  onClick={() => setStep('content-type')}
                  className={`flex-1 h-[52px] rounded-[14px] text-[14px] font-semibold cursor-pointer active:scale-[0.99] transition-all ${
                    isDark
                      ? 'bg-white/[0.07] text-white/85 hover:bg-white/[0.11]'
                      : 'bg-cream text-ink hover:bg-pearl'
                  }`}
                >
                  Back
                </button>
                <motion.button
                  whileTap={(() => {
                    if (contentKind === 'reel') return (editorClips.length > 0 && !reelOverLimit) ? { scale: 0.98 } : undefined
                    if (contentKind === 'carousel') return (currentDraft?.kind === 'carousel' && currentDraft.photos.length > 0) ? { scale: 0.98 } : undefined
                    return undefined
                  })()}
                  onClick={() => {
                    // Reel path: snapshot the editor store into an EditorDraftKind.
                    // Critical: keep `editingDraftId` set to the committed id
                    // after this call so back→continue re-updates the SAME
                    // draft rather than appending a duplicate. Cleared only
                    // when the user taps "+ Add more content" or discards.
                    if (contentKind === 'reel') {
                      if (editorClips.length === 0) return
                      const draftId = editingDraftId ?? Math.random().toString(36).slice(2, 10)
                      const newDraft: EditorDraftKind = {
                        id: draftId,
                        kind: 'editor',
                        clipFiles: editorClips.map((c) => c.file),
                        clipMeta: editorClips.map((c) => ({
                          trimIn: c.trimIn,
                          trimOut: c.trimOut,
                          speed: c.speed,
                          adjustments: { ...c.adjustments },
                        })),
                        overlays: [...editorOverlays],
                        aspect: editorAspect,
                        thumbnailUrl: editorClips[0]?.thumbnailUrl ?? '',
                      }
                      setContentDrafts((prev) => {
                        const idx = prev.findIndex((d) => d.id === draftId)
                        if (idx >= 0) { const next = [...prev]; next[idx] = newDraft; return next }
                        return [...prev, newDraft]
                      })
                      setEditingDraftId(draftId)
                      setSkippedContent(false)
                      setAddingMoreContent(false)
                      setStep('publish')
                      return
                    }

                    // Carousel path — same no-duplicate logic.
                    if (!currentDraft || currentDraft.kind !== 'carousel' || currentDraft.photos.length === 0) return
                    setContentDrafts((prev) => {
                      const idx = prev.findIndex((d) => d.id === currentDraft.id)
                      if (idx >= 0) { const next = [...prev]; next[idx] = currentDraft; return next }
                      return [...prev, currentDraft]
                    })
                    setEditingDraftId(currentDraft.id)
                    setSkippedContent(false)
                    setAddingMoreContent(false)
                    setStep('publish')
                  }}
                  disabled={(() => {
                    if (contentKind === 'reel') return editorClips.length === 0 || reelOverLimit
                    if (contentKind === 'carousel') return !(currentDraft?.kind === 'carousel' && currentDraft.photos.length > 0)
                    return true
                  })()}
                  className={`flex-[2] h-[52px] rounded-[14px] text-[14px] font-bold transition-all ${
                    (() => {
                      if (contentKind === 'reel') return editorClips.length === 0 || reelOverLimit
                      if (contentKind === 'carousel') return !(currentDraft?.kind === 'carousel' && currentDraft.photos.length > 0)
                      return true
                    })()
                      ? (isDark ? 'bg-white/[0.06] text-white/30 cursor-not-allowed' : 'bg-pearl text-smoke cursor-not-allowed')
                      : 'bg-tangerine text-white cursor-pointer hover:brightness-110'
                  }`}
                >
                  Continue
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 4a: PUBLISH (per-draft captions, no schedule) ═══ */}
          {step === 'publish' && (() => {
            const safeIdx = Math.min(selectedDraftIdx, Math.max(0, contentDrafts.length - 1))
            const selectedDraft = contentDrafts[safeIdx]
            const selectedCaption = selectedDraft?.caption ?? ''
            const multi = contentDrafts.length > 1
            const updateSelectedCaption = (value: string) => {
              const next = value.slice(0, CAPTION_LIMIT)
              setContentDrafts((prev) => prev.map((d, i) =>
                i === safeIdx ? ({ ...d, caption: next } as ContentDraft) : d
              ))
            }
            const missingCaptions = contentDrafts.some((d) => !(d.caption ?? '').trim())
            const publishNow = () => {
              // Standalone content mode (no pin) — use the dedicated content handler
              if (isAddContentMode && !pinType) {
                handlePublishContent()
                return
              }
              handlePublishFromEditor()
            }
            const onPublishClick = () => {
              if (skippedContent) { publishNow(); return }
              if (missingCaptions) { setShowMissingCaptionWarn(true); return }
              publishNow()
            }

            return (
            <motion.div key="publish" custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: 20 * d }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: -20 * d }) }} initial="enter" animate="center" exit="exit" className="max-w-2xl mx-auto w-full">
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">Almost there</h2>
              <p className="text-[14px] text-smoke mb-6">
                {contentDrafts.length === 0
                  ? 'Review and publish your pin.'
                  : multi
                  ? 'Write a caption for each piece of content before publishing.'
                  : 'Write a caption for your content before publishing.'}
              </p>

              {/* Draft selector — tangerine border on the active tile. */}
              {contentDrafts.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-smoke uppercase tracking-wider mb-2">
                    {multi ? `${contentDrafts.length} pieces of content` : '1 piece of content'}
                  </p>
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none p-1">
                    {contentDrafts.map((d, i) => {
                      const thumb =
                        d.kind === 'carousel'
                          ? d.photos[0]?.previewUrl ?? ''
                          : d.thumbnailUrl
                      const active = i === safeIdx
                      const hasCaption = !!(d.caption ?? '').trim()
                      return (
                        <div key={d.id} className="relative shrink-0">
                          <button
                            onClick={() => setSelectedDraftIdx(i)}
                            className={`w-[58px] h-[78px] rounded-[10px] overflow-hidden bg-pearl transition-all cursor-pointer ${
                              active
                                ? 'ring-2 ring-tangerine ring-offset-2 ring-offset-ivory'
                                : 'border border-border-light hover:border-tangerine/40'
                            }`}
                          >
                            {thumb
                              ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Film size={16} className="text-smoke" /></div>}
                          </button>
                          {/* Tiny dot marker for missing caption */}
                          {!hasCaption && (
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-live-red" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDraftToDelete(d.id)
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-warm-white flex items-center justify-center cursor-pointer hover:brightness-125 transition-all shadow"
                            aria-label="Remove draft"
                          >
                            <X size={11} strokeWidth={2.6} />
                          </button>
                        </div>
                      )
                    })}
                    {/* "Edit" link jumps back into the selected draft's editor */}
                  </div>
                  {selectedDraft && (
                    <button
                      onClick={async () => {
                        setEditingDraftId(selectedDraft.id)
                        if (selectedDraft.kind === 'editor') {
                          // If the editor already holds THIS draft's clips
                          // (same File objects), skip the destructive
                          // reset+re-import so the user's custom thumbnail
                          // and in-flight edits are preserved.
                          const currentClips = useEditorStore.getState().clips
                          const sameDraft =
                            currentClips.length === selectedDraft.clipFiles.length &&
                            currentClips.every((c, i) => c.file === selectedDraft.clipFiles[i])
                          if (!sameDraft) {
                            editorReset()
                            await useEditorStore.getState().importFiles(selectedDraft.clipFiles)
                            // Restore the draft's chosen thumbnail after
                            // re-import. importFiles re-probes and sets
                            // clip.thumbnailUrl from scratch; writing it
                            // into `customThumbnailUrl` preserves the
                            // user's pick without mangling the timeline.
                            if (selectedDraft.thumbnailUrl) {
                              const firstClip = useEditorStore.getState().clips[0]
                              if (firstClip) {
                                useEditorStore.getState().setClipThumbnail(firstClip.id, selectedDraft.thumbnailUrl)
                              }
                            }
                          }
                          setContentKind('reel')
                          setCurrentDraft(null)
                        } else {
                          setContentKind('carousel')
                          setCurrentDraft(selectedDraft)
                        }
                        setStep('edit')
                      }}
                      className="mt-2 text-[11px] font-semibold text-tangerine hover:underline cursor-pointer"
                    >
                      Edit this content →
                    </button>
                  )}
                </div>
              )}

              {/* Per-draft caption field */}
              {selectedDraft && (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-smoke uppercase tracking-wider">
                      {multi ? `Caption for #${safeIdx + 1}` : 'Caption'}
                    </label>
                    <span className={`text-[10px] font-mono tabular-nums ${selectedCaption.length > CAPTION_LIMIT * 0.9 ? 'text-live-red' : 'text-ash'}`}>
                      {selectedCaption.length}/{CAPTION_LIMIT}
                    </span>
                  </div>
                  <textarea
                    value={selectedCaption}
                    onChange={(e) => updateSelectedCaption(e.target.value)}
                    placeholder="Say something about this post…"
                    rows={4}
                    maxLength={CAPTION_LIMIT}
                    className="w-full rounded-[14px] bg-cream border border-border-light px-4 py-3 text-[14px] text-ink resize-none placeholder:text-ash outline-none focus:border-tangerine/40 mb-6"
                  />
                </>
              )}

              <div className="flex flex-col gap-2.5">
                <Button variant="primary" size="xl" onClick={onPublishClick} loading={saving} fullWidth>
                  {isAddContentMode && !pinType
                    ? (multi ? 'Publish Content' : 'Publish Content')
                    : (multi ? 'Publish Pins' : 'Publish Pin')}
                </Button>
                {!skippedContent && contentDrafts.length > 0 && (
                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={() => {
                      // Start fresh — wipe editor store (reel state) and
                      // currentDraft (carousel state), drop the edit cursor,
                      // then route to the picker.
                      editorReset()
                      setCurrentDraft(null)
                      setEditingDraftId(null)
                      setContentKind(null)
                      setAddingMoreContent(true)
                      setStep('content-type')
                    }}
                    icon={<Plus size={16} />}
                  >
                    Add more content
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={async () => {
                    if (skippedContent) { setStep('details'); return }
                    // Re-open the currently selected draft so the user
                    // lands in an editor with content, not an empty one.
                    const draft = contentDrafts[safeIdx]
                    if (draft) {
                      setEditingDraftId(draft.id)
                      if (draft.kind === 'editor') {
                        const currentClips = useEditorStore.getState().clips
                        const sameDraft =
                          currentClips.length === draft.clipFiles.length &&
                          currentClips.every((c, i) => c.file === draft.clipFiles[i])
                        if (!sameDraft) {
                          editorReset()
                          await useEditorStore.getState().importFiles(draft.clipFiles)
                          if (draft.thumbnailUrl) {
                            const first = useEditorStore.getState().clips[0]
                            if (first) useEditorStore.getState().setClipThumbnail(first.id, draft.thumbnailUrl)
                          }
                        }
                        setContentKind('reel')
                      } else {
                        setContentKind('carousel')
                        setCurrentDraft(draft)
                      }
                    }
                    setStep('edit')
                  }}
                >
                  Back
                </Button>
              </div>
            </motion.div>
            )
          })()}

          {/* ═══ STEP 4 (legacy): CONTENT ═══ */}
          {step === 'content' && (
            <motion.div key="content" custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: 20 * d }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: -20 * d }) }} initial="enter" animate="center" exit="exit" className="max-w-2xl mx-auto w-full">
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">
                {isAddContentMode ? 'Add Content' : 'Add content'}
              </h2>
              <p className="text-[14px] text-smoke mb-4">
                {isAddContentMode
                  ? 'Add reels, photos, or video notes to this listing.'
                  : <>Attach reels, photos, or video notes to this {pinType === 'spotlight' ? 'spotlight' : 'listing'}.{pinType !== 'spotlight' && ' You can skip and add later.'}</>
                }
              </p>
              {pinType === 'spotlight' && (
                <div className="bg-tangerine-soft rounded-[12px] px-4 py-3 mb-4">
                  <p className="text-[12px] text-ember font-medium">Spotlight pins require at least one piece of content.</p>
                </div>
              )}

              {/* Existing content items */}
              {contentItems.length > 0 && (
                <div className="space-y-2 mb-6">
                  {contentItems.map((item, i) => (
                    <div key={i} className="bg-cream rounded-[14px] p-3 flex items-center gap-3">
                      {item.preview && (
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-pearl shrink-0">
                          {item.file?.type.startsWith('video') ? (
                            <video src={item.preview} className="w-full h-full object-cover" />
                          ) : (
                            <img src={item.preview} className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-tangerine uppercase">{item.type.replace('_', ' ')}</span>
                          {item.publishAt && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-tangerine bg-tangerine-soft px-1.5 py-0.5 rounded-full">
                              <Clock size={9} /> {new Date(item.publishAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-ink truncate mt-0.5">{item.caption || 'No caption'}</p>
                      </div>
                      <button onClick={() => removeContent(i)} className="w-7 h-7 rounded-full bg-pearl flex items-center justify-center text-smoke shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add content form */}
              {showAddContent ? (
                <div className="bg-cream rounded-[18px] p-4 mb-6 space-y-3">
                  <div className="flex gap-2">
                    {([{ id: 'reel' as const, label: 'Video' }, { id: 'photo' as const, label: 'Photo' }]).map((t) => (
                      <button key={t.id} onClick={() => setNewContentType(t.id)}
                        className={`flex-1 py-2 rounded-[10px] text-[11px] font-semibold transition-all ${newContentType === t.id ? 'bg-tangerine text-white' : 'bg-pearl text-smoke'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <input ref={fileRef} type="file"
                    accept={newContentType === 'photo' ? 'image/*' : 'video/*'}
                    multiple={newContentType === 'photo'}
                    onChange={handleMediaFile} className="hidden" />

                  {newPreview ? (
                    <div className="relative rounded-[12px] overflow-hidden aspect-video">
                      {newFile?.type.startsWith('video') ? (
                        <video src={newPreview} className="w-full h-full object-cover" />
                      ) : (
                        <img src={newPreview} className="w-full h-full object-cover" />
                      )}
                      <button onClick={() => { setNewFile(null); setNewPreview(null) }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full py-8 border-2 border-dashed border-pearl rounded-[12px] flex flex-col items-center gap-1 text-smoke hover:bg-pearl/50 cursor-pointer">
                      <Upload size={22} />
                      <span className="text-[12px] font-medium">
                        {newContentType === 'photo' ? 'Upload photo' : 'Upload video'}
                      </span>
                    </button>
                  )}

                  <textarea value={newCaption} onChange={(e) => setNewCaption(e.target.value)} placeholder="Add a caption..."
                    rows={2} className="w-full rounded-[10px] bg-warm-white border border-border-light px-3 py-2 text-[13px] text-ink resize-none placeholder:text-ash outline-none" />

                  {/* Schedule for later — Pro feature */}
                  <ScheduleField
                    value={newPublishAt}
                    onChange={setNewPublishAt}
                    locked={!hasFeature(userDoc, 'scheduledContent')}
                    onLockedClick={() => setPaywall({
                      open: true,
                      reason: 'Scheduling content for later is a Pro feature.',
                      upgradeTo: 'pro',
                    })}
                  />

                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setShowAddContent(false); setNewCaption(''); setNewFile(null); setNewPreview(null); setNewPublishAt('') }} className="flex-1">Cancel</Button>
                    <Button variant="primary" size="sm" onClick={addContent} className="flex-1">{newPublishAt ? 'Schedule' : 'Add'}</Button>
                  </div>
                </div>
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowAddContent(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-[16px] border-2 border-dashed border-tangerine/30 bg-tangerine-soft/30 cursor-pointer mb-6">
                  <div className="w-10 h-10 rounded-[12px] bg-tangerine/15 flex items-center justify-center">
                    <Plus size={18} className="text-tangerine" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-tangerine">Add content</p>
                    <p className="text-[11px] text-smoke">Reel, photo, or video note</p>
                  </div>
                </motion.button>
              )}

              <div className="flex gap-3">
                {!isAddContentMode && (
                  <Button variant="secondary" size="xl" onClick={() => setStep('details')} className="flex-1">Back</Button>
                )}
                <Button variant="primary" size="xl" onClick={isAddContentMode ? () => navigate(-1) : () => handlePublish()} loading={saving} className={isAddContentMode ? 'flex-1' : 'flex-[2]'}>
                  {isAddContentMode ? 'Done' : contentItems.length > 0 ? 'Publish Pin' : 'Publish without content'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ PUBLISHING ═══ */}
          {step === 'publishing' && (
            <motion.div key="publishing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 max-w-2xl mx-auto w-full">
              <div className="max-w-[320px] mx-auto">
                <div className="relative h-[120px] mb-6 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="absolute w-[88px] h-[88px] rounded-full border-[3px] border-tangerine/20 border-t-tangerine"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-14 h-14 rounded-full bg-tangerine/15 border border-tangerine/30 flex items-center justify-center"
                  >
                    <div className="w-6 h-6 rounded-full bg-tangerine shadow-[0_0_24px_rgba(255,107,61,0.6)]" />
                  </motion.div>
                </div>
                <p className="text-[16px] font-bold text-ink text-center">
                  {renderPhase === 'preprocess' ? 'Preparing your content…'
                    : renderPhase === 'upload' ? 'Uploading…'
                    : renderPhase === 'queue' ? 'Almost there…'
                    : 'Publishing…'}
                </p>
                <p className="text-[12px] text-smoke text-center mt-1">
                  {renderPhase === 'preprocess'
                    ? 'Getting your content ready.'
                    : renderPhase === 'upload'
                    ? 'Uploading your content.'
                    : renderPhase === 'queue'
                    ? 'Processing your video. Your pin will update shortly.'
                    : 'Adding to your Reelst.'}
                </p>
                {((renderPhase !== 'idle' ? renderProgress : uploadProgress) > 0) && (
                  <div className="mt-5">
                    <div className="h-[3px] bg-pearl rounded-full overflow-hidden">
                      <motion.div className="h-full bg-tangerine rounded-full" style={{ width: `${renderPhase !== 'idle' ? renderProgress : uploadProgress}%` }} />
                    </div>
                    <p className="font-mono text-[11px] text-smoke mt-2 tabular-nums text-center">
                      {Math.round(renderPhase !== 'idle' ? renderProgress : uploadProgress)}%
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PaywallPrompt
        isOpen={paywall.open}
        onClose={() => setPaywall({ open: false, reason: '' })}
        reason={paywall.reason}
        upgradeTo={paywall.upgradeTo}
      />

      {/* Discard pin? — uses the shared ConfirmDialog (scroll lock + swipe to dismiss + no blur) */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={confirmDiscard}
        title="Discard pin?"
        message="Your progress will be lost. This can't be undone."
        confirmLabel="Discard"
        confirmVariant="danger"
      />

      {/* Delete content draft? — also via ConfirmDialog */}
      <ConfirmDialog
        isOpen={draftToDelete !== null}
        onClose={() => setDraftToDelete(null)}
        onConfirm={() => {
          if (!draftToDelete) return
          const remaining = contentDrafts.filter((x) => x.id !== draftToDelete)
          setContentDrafts(remaining)
          if (editingDraftId === draftToDelete) {
            setEditingDraftId(null)
            editorReset()
          }
          setDraftToDelete(null)
          // If the user removed the only remaining draft, there's
          // nothing to publish — jump back to the editor so they can
          // import new content. An empty "Almost there" screen makes
          // no sense.
          if (remaining.length === 0) {
            setAddingMoreContent(false)
            setStep('edit')
          }
        }}
        title="Remove this content?"
        message="This piece of content will be removed from the pin. You can add new content anytime."
        confirmLabel="Remove"
        confirmVariant="danger"
      />

      {/* Missing caption warning — shown when user taps Publish but one
          or more drafts have blank captions. Can skip or cancel. */}
      <ConfirmDialog
        isOpen={showMissingCaptionWarn}
        onClose={() => setShowMissingCaptionWarn(false)}
        onConfirm={() => {
          setShowMissingCaptionWarn(false)
          if (isAddContentMode && !pinType) {
            handlePublishContent()
          } else {
            handlePublishFromEditor()
          }
        }}
        title="Some captions are blank"
        message={
          contentDrafts.length > 1
            ? "One or more of your content drafts doesn't have a caption. Publish anyway, or cancel to add them?"
            : "Your content doesn't have a caption. Publish anyway, or cancel to add one?"
        }
        confirmLabel="Publish anyway"
      />
    </div>
  )
}

// ── Content kind picker card ──

interface ContentKindCardProps {
  kind: ContentKind
  title: string
  description: string
  icon: React.ReactNode
  onSelect: () => void
  locked?: boolean
}

function ContentKindCard({ title, description, icon, onSelect, locked }: ContentKindCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="w-full flex items-center gap-4 p-4 rounded-[18px] bg-cream border border-border-light hover:border-tangerine/40 cursor-pointer transition-colors text-left"
    >
      <div className="w-12 h-12 rounded-[14px] bg-tangerine/12 flex items-center justify-center text-tangerine shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-bold text-ink">{title}</p>
          {locked && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-tangerine bg-tangerine-soft px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              <Lock size={9} /> Studio
            </span>
          )}
        </div>
        <p className="text-[12px] text-smoke leading-snug mt-0.5">{description}</p>
      </div>
      <ChevronRight size={18} className="text-ash shrink-0" />
    </motion.button>
  )
}

// ── Schedule field for content publishing ──

function ScheduleField({
  value,
  onChange,
  locked,
  onLockedClick,
}: {
  value: string
  onChange: (v: string) => void
  locked: boolean
  onLockedClick: () => void
}) {
  const [open, setOpen] = useState(false)

  if (locked) {
    return (
      <button
        type="button"
        onClick={onLockedClick}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-warm-white border border-border-light text-left cursor-pointer hover:border-tangerine transition-colors"
      >
        <Lock size={13} className="text-ash" />
        <span className="text-[12px] text-smoke flex-1">Schedule for later</span>
        <span className="text-[10px] font-bold text-tangerine bg-tangerine-soft px-2 py-0.5 rounded-full">PRO</span>
      </button>
    )
  }

  if (!open && !value) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-warm-white border border-border-light text-left cursor-pointer hover:border-tangerine transition-colors"
      >
        <Clock size={13} className="text-tangerine" />
        <span className="text-[12px] text-graphite flex-1">Schedule for later</span>
        <Plus size={13} className="text-ash" />
      </button>
    )
  }

  return (
    <div className="bg-warm-white border border-tangerine/30 rounded-[10px] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-tangerine" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-tangerine">Publishes at</span>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className="text-[11px] text-smoke hover:text-ink cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
      <input
        type="datetime-local"
        value={value}
        min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-cream rounded-[8px] px-2.5 py-2 text-[12px] font-medium text-ink border border-border-light outline-none focus:border-tangerine"
      />
      <p className="text-[10px] text-smoke leading-snug">
        Hidden from your profile until this time. You can edit before then.
      </p>
    </div>
  )
}
