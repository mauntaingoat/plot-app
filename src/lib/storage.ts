import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/config/firebase'

// Default size caps. Callers can override via UploadOptions.maxBytes.
// Photos: 12 MB — generous for high-res phone photos but rejects HEIC
// dumps and full-res DSLR exports. Videos: 500 MB — covers ~10 minutes
// of 1080p phone video; the 3-min duration cap (canUploadVideo in
// tiers.ts) is the harder constraint, this is the byte-level safety
// net so we don't melt the browser on a 4K monster file.
export const PHOTO_MAX_BYTES = 12 * 1024 * 1024
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024
export const FILE_TOO_LARGE = 'FILE_TOO_LARGE'

export class FileTooLargeError extends Error {
  readonly code = FILE_TOO_LARGE
  readonly maxBytes: number
  readonly actualBytes: number
  constructor(maxBytes: number, actualBytes: number) {
    super(
      `File is ${formatBytes(actualBytes)} — limit is ${formatBytes(maxBytes)}.`,
    )
    this.maxBytes = maxBytes
    this.actualBytes = actualBytes
    this.name = 'FileTooLargeError'
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Validate file size BEFORE starting an upload. Throws FileTooLargeError.
 * Pickers should call this on selection so users see the error before
 * the network roundtrip. uploadFile() also calls it as a final guard.
 */
export function assertFileWithinLimit(file: File, maxBytes: number): void {
  if (file.size > maxBytes) throw new FileTooLargeError(maxBytes, file.size)
}

interface UploadOptions {
  path: string
  file: File
  onProgress?: (percent: number) => void
  /** Hard byte cap. If exceeded, throws FileTooLargeError without
   *  starting the upload. Defaults are PHOTO_MAX_BYTES / VIDEO_MAX_BYTES
   *  inferred from file.type when not provided. */
  maxBytes?: number
}

function inferDefaultMax(file: File): number {
  if (file.type.startsWith('video/')) return VIDEO_MAX_BYTES
  return PHOTO_MAX_BYTES
}

export async function uploadFile({ path, file, onProgress, maxBytes }: UploadOptions): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not initialized')
  assertFileWithinLimit(file, maxBytes ?? inferDefaultMax(file))
  const storageRef = ref(storage, path)
  const task = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        const percent = (snap.bytesTransferred / snap.totalBytes) * 100
        onProgress?.(percent)
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve(url)
      }
    )
  })
}

export function avatarPath(uid: string) {
  return `users/${uid}/avatar.jpg`
}

export function pinMediaPath(pinId: string, filename: string) {
  return `pins/${pinId}/media/${filename}`
}
