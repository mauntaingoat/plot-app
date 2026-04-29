import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { X, Check, ArrowRight, BadgeCheck, Home, TrendingUp, TrendingDown } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { approvePendingChange, rejectPendingChange } from '@/lib/firestore'
import type { PendingPinChange, Pin } from '@/lib/types'

/* ════════════════════════════════════════════════════════════════
   PENDING CHANGES MODAL — Rentcast property-sync review
   ────────────────────────────────────────────────────────────────
   Surfaces meaningful diffs (price + for_sale ↔ sold transitions)
   that the daily syncPropertyData Cloud Function detected. Each
   change becomes a card with current vs proposed + Approve / Dismiss
   actions. Closes when all pending changes have been actioned, or
   when the user dismisses the whole sheet. Per-session dismiss is
   tracked in sessionStorage so the modal doesn't reappear if the
   user explicitly closes it.
   ──────────────────────────────────────────────────────────────── */

interface PendingChangesModalProps {
  isOpen: boolean
  onClose: () => void
  changes: PendingPinChange[]
  pins: Pin[]
  isDesktop: boolean
}

export function PendingChangesModal({
  isOpen,
  onClose,
  changes,
  pins,
  isDesktop,
}: PendingChangesModalProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  // Local "actioned" set so a card disappears immediately on click —
  // the underlying subscription will catch up shortly after.
  const [actioned, setActioned] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) setActioned(new Set())
  }, [isOpen])

  const visible = changes.filter((c) => !actioned.has(c.pinId))

  const handleApprove = async (change: PendingPinChange) => {
    setBusyId(change.pinId)
    try {
      await approvePendingChange(change)
      setActioned((prev) => new Set(prev).add(change.pinId))
    } catch (err) {
      console.error('[PendingChangesModal] approve failed:', err)
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (change: PendingPinChange) => {
    setBusyId(change.pinId)
    try {
      await rejectPendingChange(change)
      setActioned((prev) => new Set(prev).add(change.pinId))
    } catch (err) {
      console.error('[PendingChangesModal] reject failed:', err)
    } finally {
      setBusyId(null)
    }
  }

  // Auto-close when nothing left to review.
  useEffect(() => {
    if (isOpen && visible.length === 0 && actioned.size > 0) {
      const t = window.setTimeout(onClose, 600)
      return () => window.clearTimeout(t)
    }
  }, [visible.length, actioned.size, isOpen, onClose])

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[150] flex items-center justify-center px-4"
            style={{ background: 'rgba(10,14,23,0.55)' }}
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[640px] max-h-[85vh] flex flex-col rounded-[24px] bg-warm-white border border-border-light shadow-2xl overflow-hidden"
              style={{ fontFamily: 'var(--font-humanist)' }}
            >
              <PendingChangesHeader count={visible.length} onClose={onClose} />
              <PendingChangesBody
                changes={visible}
                pins={pins}
                busyId={busyId}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Property updates" fullHeight>
      <div style={{ fontFamily: 'var(--font-humanist)' }} className="px-1 pb-1">
        <PendingChangesBody
          changes={visible}
          pins={pins}
          busyId={busyId}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </BottomSheet>
  )
}

function PendingChangesHeader({ count, onClose }: { count: number; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border-light">
      <div>
        <p
          className="text-tangerine"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Property updates
        </p>
        <h2
          className="text-ink mt-1"
          style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.025em' }}
        >
          {count} listing{count !== 1 ? 's' : ''} changed since you last checked
        </h2>
        <p className="text-smoke mt-2" style={{ fontSize: '13.5px', fontWeight: 400, lineHeight: 1.5 }}>
          MLS data updates daily. Review each listing and apply the new info, or dismiss to keep your existing pin.
        </p>
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-ink hover:bg-pearl transition-colors cursor-pointer shrink-0 ml-3"
      >
        <X size={15} />
      </button>
    </div>
  )
}

function PendingChangesBody({
  changes,
  pins,
  busyId,
  onApprove,
  onReject,
}: {
  changes: PendingPinChange[]
  pins: Pin[]
  busyId: string | null
  onApprove: (c: PendingPinChange) => void
  onReject: (c: PendingPinChange) => void
}) {
  if (changes.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-tangerine/10 flex items-center justify-center mx-auto mb-3">
          <Check size={22} className="text-tangerine" />
        </div>
        <p className="text-ink" style={{ fontSize: '15px', fontWeight: 600 }}>
          You're all caught up.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto px-3 md:px-4 py-3 space-y-2.5">
      {changes.map((change) => {
        const pin = pins.find((p) => p.id === change.pinId)
        return (
          <PendingChangeCard
            key={change.pinId}
            change={change}
            pin={pin}
            busy={busyId === change.pinId}
            onApprove={() => onApprove(change)}
            onReject={() => onReject(change)}
          />
        )
      })}
    </div>
  )
}

export function PendingChangeCard({
  change,
  pin,
  busy,
  onApprove,
  onReject,
}: {
  change: PendingPinChange
  pin: Pin | undefined
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const address = pin?.address?.split(',')[0] || 'Unknown listing'
  const heroUrl = pin && 'heroPhotoUrl' in pin ? (pin as any).heroPhotoUrl : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-[18px] bg-white border border-border-light p-4 md:p-5"
      style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset, 0 6px 18px -10px rgba(10,14,23,0.06)' }}
    >
      <div className="flex items-start gap-3.5 mb-3.5">
        {heroUrl ? (
          <img src={heroUrl} alt="" className="w-12 h-12 rounded-[12px] object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-[12px] bg-cream flex items-center justify-center shrink-0">
            <Home size={18} className="text-smoke" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-ink truncate" style={{ fontSize: '14.5px', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {address}
          </p>
          <p className="text-smoke text-[12px] mt-0.5">
            {pin?.address || ''}
          </p>
        </div>
      </div>

      {/* Diffs */}
      <div className="space-y-2 mb-4">
        {change.typeChange && <TypeChangeRow change={change} />}
        {change.priceChange && <PriceChangeRow from={change.priceChange.from} to={change.priceChange.to} />}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onReject}
          disabled={busy}
          className="flex-1 h-10 px-4 rounded-full text-[13px] cursor-pointer transition-colors disabled:opacity-50"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontWeight: 500,
            color: 'var(--color-graphite)',
            background: 'rgba(10,14,23,0.05)',
          }}
        >
          Keep my version
        </button>
        <button
          onClick={onApprove}
          disabled={busy}
          className="brand-btn-flat flex-1 h-10 px-4 rounded-full text-[13px] cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontWeight: 600,
            boxShadow: '0 6px 16px -6px rgba(217,74,31,0.42), inset 0 1px 0 rgba(255,255,255,0.24)',
          }}
        >
          {busy ? '…' : (
            <>
              Apply update
              <ArrowRight size={13} strokeWidth={2.5} />
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

function TypeChangeRow({ change }: { change: PendingPinChange }) {
  const isSold = change.typeChange?.to === 'sold'
  const label = isSold ? 'Marked as sold' : 'Relisted as for sale'
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px]"
      style={{
        background: isSold ? 'rgba(52,199,89,0.10)' : 'rgba(59,130,246,0.10)',
        border: `1px solid ${isSold ? 'rgba(52,199,89,0.25)' : 'rgba(59,130,246,0.25)'}`,
      }}
    >
      <BadgeCheck size={15} className={isSold ? 'text-sold-green' : 'text-listing-blue'} />
      <span
        className="text-ink"
        style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '-0.005em' }}
      >
        {label}
      </span>
      {change.soldDate && (
        <span className="text-smoke ml-auto" style={{ fontSize: '12px', fontWeight: 400 }}>
          {formatDate(change.soldDate)}
        </span>
      )}
    </div>
  )
}

function PriceChangeRow({ from, to }: { from: number; to: number }) {
  const up = to > from
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px]"
      style={{
        background: 'rgba(255,133,82,0.08)',
        border: '1px solid rgba(255,133,82,0.22)',
      }}
    >
      <Icon size={15} className="text-tangerine" />
      <span className="text-smoke line-through" style={{ fontSize: '12.5px', fontWeight: 500 }}>
        {formatPriceCompact(from)}
      </span>
      <ArrowRight size={12} className="text-smoke" />
      <span className="text-ink" style={{ fontSize: '14.5px', fontWeight: 700, letterSpacing: '-0.005em' }}>
        {formatPriceCompact(to)}
      </span>
    </div>
  )
}

function formatPriceCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n.toLocaleString()}`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}
