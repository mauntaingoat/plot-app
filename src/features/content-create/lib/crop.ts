import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/config/firebase'

interface CropPhotosArgs {
  urls: string[]
  aspect: string
  pinId: string
  contentId: string
}

interface CropPhotosResult {
  urls: string[]
}

export async function cropPhotosServer(args: CropPhotosArgs): Promise<string[]> {
  const functions = getFunctions(app ?? undefined)
  const fn = httpsCallable<CropPhotosArgs, CropPhotosResult>(functions, 'cropPhotos')
  const res = await fn(args)
  return res.data.urls
}
