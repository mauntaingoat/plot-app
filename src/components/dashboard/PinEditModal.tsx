import { useState, useRef } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useScrollLock } from '@/hooks/useScrollLock'
import { X, Trash2, GripVertical, Play, Image, Radio, MapPin, ChevronUp, ChevronDown, Camera, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { formatPrice, updatePin } from '@/lib/firestore'
import { uploadFile, pinMediaPath } from '@/lib/storage'
import { PIN_CONFIG, type Pin, type ForSalePin, type SoldPin, type ContentItem } from '@/lib/types'

interface PinEditModalProps {
  isOpen: boolean
  onClose: () => void
  pin: Pin | null
  isDesktop: boolean
  onAddContent?: () => void
  onArchiveContent?: (contentId: string) => void
  onReorderContent?: (contentIds: string[]) => void
  onPinUpdated?: (pin: Pin) => void
}

const CONTENT_ICONS: Record<string, typeof Play> = {
  reel: Play,
  story: Image,
  live: Radio,
  photo: Image,
}

function PinEditContent({ pin, onAddContent, onArchiveContent, onReorderContent, onClose, isDesktop, onPinUpdated }: {
  pin: Pin
  onAddContent?: () => void
  onArchiveContent?: (contentId: string) => void
  onReorderContent?: (contentIds: string[]) => void
  onClose: () => void
  isDesktop?: boolean
  onPinUpdated?: (pin: Pin) => void
}) {
  const config = PIN_CONFIG[pin.type]
  const fp = pin.type !== 'spotlight' ? (pin as ForSalePin) : null
  const content = pin.content || []
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null)
  const [editingListing, setEditingListing] = useState(false)
  const [editPrice, setEditPrice] = useState(String('price' in pin ? (pin as any).price : (pin as any).soldPrice || ''))
  const [editDesc, setEditDesc] = useState('description' in pin ? (pin as any).description : '')
  const [editType, setEditType] = useState<'for_sale' | 'sold'>(pin.type === 'sold' ? 'sold' : 'for_sale')
  const [savingListing, setSavingListing] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const handleSaveListing = async () => {
    setSavingListing(true)
    try {
      const priceNum = Number(editPrice) || 0
      const updates: any = { description: editDesc }
      if (editType !== pin.type) updates.type = editType
      if (editType === 'for_sale') {
        updates.price = priceNum
        updates.listingStatus = 'active'
      } else {
        updates.soldPrice = priceNum
        updates.originalPrice = (pin as any).price || priceNum
      }
      await updatePin(pin.id, updates)
      onPinUpdated?.({ ...pin, ...updates } as Pin)
      setEditingListing(false)
    } catch (err) {
      console.error('Save listing failed:', err)
    } finally { setSavingListing(false) }
  }

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploadingPhotos(true)
    try {
      const urls: string[] = [...((pin as any).photos || [])]
      for (const file of files) {
        const url = await uploadFile({
          path: pinMediaPath(pin.id, `photo-${Date.now()}-${file.name}`),
          file,
        })
        urls.push(url)
      }
      const heroPhotoUrl = urls[0] || (pin as any).heroPhotoUrl || ''
      await updatePin(pin.id, { photos: urls, heroPhotoUrl } as any)
      onPinUpdated?.({ ...pin, photos: urls, heroPhotoUrl } as any)
    } catch (err) {
      console.error('Upload photos failed:', err)
    } finally { setUploadingPhotos(false) }
  }

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= content.length) return
    const ids = content.map((c) => c.id)
    ;[ids[idx], ids[target]] = [ids[target], ids[idx]]
    onReorderContent?.(ids)
  }

  return (
    <div className="space-y-5">
      {/* Listing summary header */}
      <div className="flex items-start gap-3">
        {'heroPhotoUrl' in pin && pin.heroPhotoUrl ? (
          <img src={pin.heroPhotoUrl} alt="" className="w-16 h-16 rounded-[12px] object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: `${config.color}20` }}>
            <MapPin size={20} style={{ color: config.color }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: config.color }}>{config.label}</span>
          <p className="text-[14px] font-bold text-white truncate mt-0.5">{pin.address.split(',')[0]}</p>
          {fp && 'price' in fp && (
            <p className="text-[16px] font-extrabold text-white font-mono mt-0.5">{formatPrice(fp.price)}</p>
          )}
          {fp && 'beds' in fp && (
            <p className="text-[11px] text-ghost mt-0.5">{fp.beds} bd · {fp.baths} ba · {fp.sqft.toLocaleString()} sqft</p>
          )}
        </div>
      </div>

      {/* Content section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-white">Content ({content.length})</h3>
          <Button variant="primary" size="sm" onClick={onAddContent}>
            Add Content
          </Button>
        </div>

        {content.length === 0 ? (
          <div className="bg-slate rounded-[14px] p-6 text-center">
            <p className="text-[13px] text-ghost">No content yet. Add videos or photos.</p>
          </div>
        ) : isDesktop ? (
          /* Desktop: Framer Reorder drag */
          <Reorder.Group
            axis="y"
            values={content}
            onReorder={(reordered) => onReorderContent?.(reordered.map((c) => c.id))}
            className="space-y-2"
          >
            {content.map((item) => (
              <DraggableItem key={item.id} item={item} onArchive={() => setArchiveTarget(item.id)} />
            ))}
          </Reorder.Group>
        ) : (
          /* Mobile: up/down buttons (no drag — conflicts with bottom sheet swipe) */
          <div className="space-y-2">
            {content.map((item, idx) => {
              const Icon = CONTENT_ICONS[item.type] || Image
              return (
                <div key={item.id} className="flex items-center gap-2 bg-slate rounded-[14px] p-3">
                  {/* Up/Down buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${idx === 0 ? 'text-charcoal' : 'text-ghost hover:text-white hover:bg-white/10 cursor-pointer'}`}>
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => moveItem(idx, 1)} disabled={idx === content.length - 1}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${idx === content.length - 1 ? 'text-charcoal' : 'text-ghost hover:text-white hover:bg-white/10 cursor-pointer'}`}>
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="" className="w-14 h-14 rounded-[10px] object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-[10px] bg-charcoal flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-ghost" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-tangerine uppercase">{item.type.replace('_', ' ')}</span>
                      <span className="text-[10px] text-ghost">· {item.views} views</span>
                    </div>
                    <p className="text-[13px] text-mist truncate mt-0.5">{item.caption || 'No caption'}</p>
                  </div>

                  <button onClick={() => setArchiveTarget(item.id)}
                    className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-ghost hover:text-live-red hover:bg-live-red/10 cursor-pointer transition-colors shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Listing Details Section */}
      {pin.type !== 'spotlight' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-white">Listing Details</h3>
            <button onClick={() => setEditingListing(!editingListing)}
              className="text-[12px] font-semibold text-tangerine cursor-pointer hover:underline">
              {editingListing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editingListing ? (
            <div className="space-y-3">
              <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadPhotos} />

              <div className="flex gap-2">
                <button onClick={() => setEditType('for_sale')}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-colors ${editType === 'for_sale' ? 'bg-tangerine text-white' : 'bg-slate text-ghost'} cursor-pointer`}>
                  For Sale
                </button>
                <button onClick={() => setEditType('sold')}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-colors ${editType === 'sold' ? 'bg-sold-green text-white' : 'bg-slate text-ghost'} cursor-pointer`}>
                  Sold
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-ghost uppercase tracking-wider block mb-1">
                  {editType === 'sold' ? 'Sold Price' : 'Listing Price'}
                </label>
                <div className="flex items-center gap-1 bg-slate rounded-xl px-3 py-2.5">
                  <DollarSign size={16} className="text-ghost" />
                  <input type="number" min="1" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                    className="flex-1 bg-transparent text-white text-[16px] font-bold outline-none" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-ghost uppercase tracking-wider block mb-1">Description</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                  className="w-full bg-slate rounded-xl px-3 py-2.5 text-[13px] text-mist outline-none resize-none" />
              </div>

              <button onClick={() => photoRef.current?.click()} disabled={uploadingPhotos}
                className="w-full py-3 border border-dashed border-ghost/20 rounded-xl text-[12px] text-ghost flex items-center justify-center gap-2 cursor-pointer hover:border-ghost/40 transition-colors">
                <Camera size={14} />
                {uploadingPhotos ? 'Uploading...' : `${(pin as any).photos?.length || 0} listing photos · Add more`}
              </button>

              <Button variant="primary" size="md" fullWidth loading={savingListing} onClick={handleSaveListing}>
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="bg-slate rounded-[14px] p-3.5 space-y-1.5">
              <p className="text-[13px] text-mist">{(pin as any).description || 'No description'}</p>
              {(pin as any).photos?.length > 0 && (
                <p className="text-[11px] text-ghost">{(pin as any).photos.length} listing photos</p>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => { if (archiveTarget) { onArchiveContent?.(archiveTarget); setArchiveTarget(null) } }}
        title="Remove this content?"
        message="This will remove the content from this listing."
        confirmLabel="Remove"
      />
    </div>
  )
}

function DraggableItem({ item, onArchive }: { item: ContentItem; onArchive: () => void }) {
  const controls = useDragControls()
  const Icon = CONTENT_ICONS[item.type] || Image
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-2 bg-slate rounded-[14px] p-3 list-none"
      whileDrag={{ scale: 1.03, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', zIndex: 50 }}
      transition={{ duration: 0.2 }}
    >
      {/* Drag handle — only this initiates drag */}
      <div
        className="flex flex-col items-center gap-1 shrink-0 cursor-grab active:cursor-grabbing px-0.5 py-2 -my-1 rounded-lg hover:bg-white/5 transition-colors touch-none"
        onPointerDown={(e) => controls.start(e)}
      >
        <GripVertical size={14} className="text-ghost" />
      </div>

      {/* Thumbnail */}
      {item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} alt="" className="w-14 h-14 rounded-[10px] object-cover shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-[10px] bg-charcoal flex items-center justify-center shrink-0">
          <Icon size={18} className="text-ghost" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-tangerine uppercase">{item.type.replace('_', ' ')}</span>
          <span className="text-[10px] text-ghost">· {item.views} views</span>
        </div>
        <p className="text-[13px] text-mist truncate mt-0.5">{item.caption || 'No caption'}</p>
      </div>

      {/* Archive button */}
      <button
        onClick={onArchive}
        className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-ghost hover:text-live-red hover:bg-live-red/10 cursor-pointer transition-colors shrink-0"
        title="Remove content"
      >
        <Trash2 size={13} />
      </button>
    </Reorder.Item>
  )
}

export function PinEditModal({ isOpen, onClose, pin, isDesktop, onAddContent, onArchiveContent, onReorderContent, onPinUpdated }: PinEditModalProps) {
  useScrollLock(isOpen)
  if (!pin) return null

  // Desktop: centered modal
  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/50" onClick={(e) => { e.stopPropagation(); onClose() }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-48px)] max-w-[480px] max-h-[85vh] bg-obsidian rounded-[22px] shadow-2xl overflow-hidden flex flex-col border border-border-dark"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark shrink-0">
                <h2 className="text-[16px] font-extrabold text-white tracking-tight">Edit Pin</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center cursor-pointer hover:bg-slate transition-colors">
                  <X size={15} className="text-ghost" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <PinEditContent
                  pin={pin}
                  onAddContent={onAddContent}
                  onArchiveContent={onArchiveContent}
                  onReorderContent={onReorderContent}
                  onPinUpdated={onPinUpdated}
                  onClose={onClose}
                  isDesktop
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  // Mobile: bottom sheet
  return (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} title="Edit Pin">
      <div className="px-5 pb-8">
        <PinEditContent
          pin={pin}
          onAddContent={onAddContent}
          onArchiveContent={onArchiveContent}
          onReorderContent={onReorderContent}
          onPinUpdated={onPinUpdated}
          onClose={onClose}
        />
      </div>
    </DarkBottomSheet>
  )
}
