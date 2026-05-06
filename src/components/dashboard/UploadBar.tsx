import { AnimatePresence, motion } from 'framer-motion'
import { ArrowsClockwise as RefreshCw, X, CircleNotch as Loader2, Check, Warning as AlertTriangle } from '@phosphor-icons/react'
import { useUploadStore, type UploadJob } from '@/stores/uploadStore'

/**
 * Sticky bar above the dashboard tab header. Shows one row per active
 * background upload job (createPin → photos → content → activate).
 * Sequential queue: at most one row is `running`; the rest are
 * queued/failed/finished. Successful rows auto-dismiss after a beat.
 */
export function UploadBar() {
  const jobs = useUploadStore((s) => s.jobs)
  const retry = useUploadStore((s) => s.retry)
  const dismiss = useUploadStore((s) => s.dismiss)

  if (jobs.length === 0) return null

  return (
    <div className="space-y-1.5">
      <AnimatePresence initial={false}>
        {jobs.map((job) => (
          <UploadRow key={job.id} job={job} onRetry={() => retry(job.id)} onDismiss={() => dismiss(job.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function UploadRow({ job, onRetry, onDismiss }: { job: UploadJob; onRetry: () => void; onDismiss: () => void }) {
  const isFailed = job.status === 'failed'
  const isSuccess = job.status === 'success'
  const isRunning = job.status === 'running'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
      className="relative w-full overflow-hidden rounded-[14px] border bg-warm-white border-border-light shadow-[0_2px_8px_-4px_rgba(10,14,23,0.08)]"
    >
      {/* Progress fill — subtle tangerine tint behind the row */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 bg-tangerine/[0.08] transition-[width] duration-300 ease-out"
        style={{ width: `${Math.max(2, Math.round(job.progress * 100))}%` }}
      />

      <div className="relative flex items-center gap-3 px-3.5 py-2.5">
        {/* Status icon */}
        <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: isFailed ? 'rgba(220,38,38,0.10)' : isSuccess ? 'rgba(34,197,94,0.12)' : 'rgba(255,107,61,0.12)',
          }}
        >
          {isRunning && <Loader2 size={14} className="text-tangerine animate-spin" />}
          {isSuccess && <Check size={14} weight="bold" className="text-sold-green" />}
          {isFailed && <AlertTriangle size={14} weight="bold" className="text-live-red" />}
          {job.status === 'queued' && <Loader2 size={14} className="text-smoke" />}
        </div>

        {/* Label + progress text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-ink truncate">{job.pinLabel || 'New pin'}</p>
          </div>
          <p className="text-[11.5px] text-smoke truncate">
            {isFailed ? (job.error || 'Upload failed') : job.phaseLabel}
          </p>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1">
          {isFailed && (
            <button
              onClick={onRetry}
              className="h-7 px-2.5 rounded-full bg-tangerine text-white text-[11.5px] font-bold cursor-pointer flex items-center gap-1 hover:brightness-110 transition-all"
              aria-label="Retry upload"
            >
              <RefreshCw size={11} weight="bold" /> Retry
            </button>
          )}
          {(isFailed || isSuccess) && (
            <button
              onClick={onDismiss}
              className="w-7 h-7 rounded-full flex items-center justify-center text-ash hover:text-smoke hover:bg-cream cursor-pointer"
              aria-label="Dismiss"
            >
              <X size={12} weight="bold" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
