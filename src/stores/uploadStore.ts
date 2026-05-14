import { create } from 'zustand'
import { publishPinAssets, overallProgress, type PublishInput, type PublishPhase } from '@/lib/publishContent'

/** Progress callback handed to a content-job runner. Pass a human
 *  phase label (rendered in the bar) and a 0–1 progress fraction. */
export type ContentJobProgress = (label: string, pct: number) => void

/** A "pin" job is one create-pin-with-content workflow (photos +
 *  content drafts + activation). A "content" job is a single-shot
 *  custom runner — used by edit-content and content-only upload
 *  flows so they share the same persistent banner UI. */
export type UploadJob =
  | {
      kind: 'pin'
      id: string
      pinId: string
      pinLabel: string
      input: PublishInput
      status: 'queued' | 'running' | 'success' | 'failed'
      progress: number
      phaseLabel: string
      error?: string
      paywall?: { reason: string; upgradeTo?: 'pro' }
    }
  | {
      kind: 'content'
      id: string
      pinLabel: string             // e.g. "Reel" or "Photo carousel"
      /** Closes over all the work the caller wants to run in the
       *  background. The store invokes it with a setProgress callback
       *  and tracks status. Non-serializable by design (captures File
       *  objects + editor state). */
      runner: (setProgress: ContentJobProgress) => Promise<void>
      status: 'queued' | 'running' | 'success' | 'failed'
      progress: number
      phaseLabel: string
      error?: string
    }

interface UploadStoreState {
  jobs: UploadJob[]
  /** Enqueue a full pin-with-content workflow. */
  enqueue: (job: {
    pinId: string
    pinLabel: string
    input: PublishInput
  }) => string
  /** Enqueue a content-only workflow (edit existing content, upload
   *  unlinked content, etc). The runner is the entire job. */
  enqueueContent: (job: {
    pinLabel: string
    runner: (setProgress: ContentJobProgress) => Promise<void>
  }) => string
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
            ? ({ ...j, status: 'running', progress: 0, phaseLabel: 'Starting…', error: undefined, paywall: undefined } as UploadJob)
            : j,
        ),
      }))

      try {
        if (next.kind === 'pin') {
          const pinJob = next
          const result = await publishPinAssets(pinJob.input, (phase) => {
            const draftCount = pinJob.input.contentDrafts.length
            const pct = phase.step === 'activating' ? 1 : (phase as { pct?: number }).pct ?? 0
            const idx = phase.step === 'activating' ? draftCount : (phase as { index?: number }).index ?? 0
            const total = phase.step === 'photos' ? pinJob.input.photos.length : draftCount
            const overall = overallProgress(phase.step, idx, total, pct)
            set((s) => ({
              jobs: s.jobs.map((j) =>
                j.id === pinJob.id && j.kind === 'pin'
                  ? { ...j, progress: overall, phaseLabel: phaseLabel(phase, draftCount) }
                  : j,
              ),
            }))
          })

          set((s) => ({
            jobs: s.jobs.map((j) =>
              j.id === pinJob.id && j.kind === 'pin'
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

          if (!result.paywall) {
            window.setTimeout(() => {
              const cur = get().jobs.find((j) => j.id === pinJob.id)
              if (cur && cur.status === 'success') {
                set((s) => ({ jobs: s.jobs.filter((j) => j.id !== pinJob.id) }))
              }
            }, 4000)
          }
        } else {
          // Content job — caller provides the runner; we just track
          // progress + status. The runner closes over all the editor
          // state it needs.
          const contentJob = next
          await contentJob.runner((label, pct) => {
            set((s) => ({
              jobs: s.jobs.map((j) =>
                j.id === contentJob.id
                  ? { ...j, progress: Math.max(0, Math.min(1, pct)), phaseLabel: label }
                  : j,
              ),
            }))
          })

          set((s) => ({
            jobs: s.jobs.map((j) =>
              j.id === contentJob.id
                ? { ...j, status: 'success', progress: 1, phaseLabel: 'Published' }
                : j,
            ),
          }))

          window.setTimeout(() => {
            const cur = get().jobs.find((j) => j.id === contentJob.id)
            if (cur && cur.status === 'success') {
              set((s) => ({ jobs: s.jobs.filter((j) => j.id !== contentJob.id) }))
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
      kind: 'pin',
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

  enqueueContent: (job) => {
    const id = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const next: UploadJob = {
      kind: 'content',
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
