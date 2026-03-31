import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/config/firebase'

interface UploadOptions {
  path: string
  file: File
  onProgress?: (percent: number) => void
}

export async function uploadFile({ path, file, onProgress }: UploadOptions): Promise<string> {
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
