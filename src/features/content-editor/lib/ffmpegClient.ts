import type { FFmpeg } from '@ffmpeg/ffmpeg'

/**
 * Lazy-loaded ffmpeg.wasm singleton. Uses the single-threaded core
 * which works in all browsers without SharedArrayBuffer/COOP/COEP.
 * Tries unpkg first, falls back to jsdelivr if that fails.
 */
let instance: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null

const CORE_VERSION = '0.12.10'
const CDNS = [
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
]

export async function getFFmpeg(
  onLog?: (msg: string) => void,
): Promise<FFmpeg> {
  if (instance) return instance
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ])
    const ff = new FFmpeg()
    if (onLog) ff.on('log', ({ message }) => onLog(message))

    for (const base of CDNS) {
      try {
        await ff.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
        })
        instance = ff
        return ff
      } catch (err) {
        console.warn(`ffmpeg load failed from ${base}:`, err)
      }
    }
    throw new Error('Failed to load ffmpeg from all CDNs')
  })()

  return loadingPromise
}

export function isFFmpegLoaded() {
  return instance !== null
}
