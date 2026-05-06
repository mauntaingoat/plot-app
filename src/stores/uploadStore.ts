import { create } from 'zustand'
import { publishPinAssets, overallProgress, type PublishInput, type PublishPhase } from '@/lib/publishContent'

/** A single pin's worth of background work. One job per createPin call.
 *  The processor below runs jobs FIFO, one at a time. State lives only
 *  in memory — closing the tab kills any in-flight + queued work. */
export interface UploadJob {
  id: string
  pinId: string
  pinLabel: string                // e.g. "1612 West Lake Drive" — what the bar shows
  input: PublishInput             // serializable inputs for retry
  status: 'queued' | 'running' | 'success' | 'failed'
  progress: number                // 0–1, single bar across all sub-steps
  phaseLabel: string              // human-readable, e.g. "Rendering reel 2 of 3"
  error?: string
  /** Set when setPinEnabled fails (active-pin cap). The dashboard reads
   *  this to surface a paywall sheet without blocking the bar. */
  paywall?: { reason: string; upgradeTo?: 'pro' }
}

interface UploadStoreState {
  jobs: UploadJob[]
  enqueue: (job: Omit<UploadJob, 'id' | 'status' | 'progress' | 'phaseLabel'>) => string
  retry: (id: string) => void
  dismiss: (id: string) => void
  clearCompleted: () => void
}

/** Internal: are we currently draining the queue? Lives outside the
 *  Zustand state so set() calls inside the loop don't re-trigger it. */
let processing = false

function phaseLabel(p: PublishPhase, draftCount: number): string {
  if (p.step === 'photos') {
    return `Uploading photo ${p.index + 1} of ${p.total}`
  }
  if (p.step === 'content') {
    const which = draftCount > 1 ? ` ${p.index + 1} of ${draftCount}` : ''
    if (p.phase === 'queue') return `Finishing content${which}`
    return `Rendering content${which} · ${Math.round(p.pct * 100)}%`
  }
  return 'Activating pin…'
}

async function drain(set: (fn: (s: UploadStoreState) => Partial<UploadStoreState>) => void, get: () => UploadStoreState) {
  if (processing) return
  processing = true
  try {
    /* eslint-disable no-constant-condition */
    while (true) {
      const next = get().jobs.find((j) => j.status === 'queued')
      if (!next) break

      set((s) => ({
        jobs: s.jobs.map((j) =>
          j.id === next.id
            ? { ...j, status: 'running', progress: 0, phaseLabel: 'Starting…', error: undefined, paywall: undefined }
            : j,
        ),
      }))

      try {
        const result = await publishPinAssets(next.input, (phase) => {
          const draftCount = next.input.contentDrafts.length
          const pct = phase.step === 'activating' ? 1 : (phase as { pct?: number }).pct ?? 0
          const idx = phase.step === 'activating' ? draftCount : (phase as { index?: number }).index ?? 0
          const total = phase.step === 'photos' ? next.input.photos.length : draftCount
          const overall = overallProgress(phase.step, idx, total, pct)
          set((s) => ({
            jobs: s.jobs.map((j) =>
              j.id === next.id
                ? { ...j, progress: overall, phaseLabel: phaseLabel(phase, draftCount) }
                : j,
            ),
          }))
        })

        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === next.id
              ? {
                  ...j,
                  status: 'success',
                  progress: 1,
                  phaseLabel: result.activated ? 'Published' : 'Saved as draft',
                  paywall: result.paywall,
                }
              : j,
          ),
        }))

        // Auto-dismiss successful jobs after a short delay so the bar
        // doesn't accumulate cruft. Failed/paywall jobs stick around
        // until the user retries or dismisses.
        if (!result.paywall) {
          window.setTimeout(() => {
            const cur = get().jobs.find((j) => j.id === next.id)
            if (cur && cur.status === 'success') {
              set((s) => ({ jobs: s.jobs.filter((j) => j.id !== next.id) }))
            }
          }, 4000)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[uploadStore] job failed', next.id, err)
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === next.id
              ? { ...j, status: 'failed', error: message, phaseLabel: 'Upload failed' }
              : j,
          ),
        }))
      }
    }
  } finally {
    processing = false
  }
}

export const useUploadStore = create<UploadStoreState>((set, get) => ({
  jobs: [],

  enqueue: (job) => {
    const id = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const next: UploadJob = {
      id,
      status: 'queued',
      progress: 0,
      phaseLabel: 'Queued',
      ...job,
    }
    set((s) => ({ jobs: [...s.jobs, next] }))
    void drain(set, get)
    return id
  },

  retry: (id) => {
    set((s) => ({
      jobs: s.jobs.map((j) =>
        j.id === id && j.status === 'failed'
          ? { ...j, status: 'queued', progress: 0, phaseLabel: 'Queued', error: undefined }
          : j,
      ),
    }))
    void drain(set, get)
  },

  dismiss: (id) => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }))
  },

  clearCompleted: () => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.status !== 'success') }))
  },
}))
