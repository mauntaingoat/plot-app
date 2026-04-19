import type { FFmpeg } from '@ffmpeg/ffmpeg'

/**
 * Lazy-loaded ffmpeg.wasm singleton. Tries the multi-threaded core first
 * (requires SharedArrayBuffer + COOP/COEP headers). Falls back to the
 * single-threaded core if SharedArrayBuffer isn't available.
 */
let instance: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null

const CORE_VERSION = '0.12.10'
const MT_BASE = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/umd`
const ST_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`

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

    const canUseThreads = typeof SharedArrayBuffer !== 'undefined'

    if (canUseThreads) {
      try {
        await ff.load({
          coreURL: await toBlobURL(`${MT_BASE}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${MT_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${MT_BASE}/ffmpeg-core.worker.js`, 'text/javascript'),
        })
        instance = ff
        return ff
      } catch (err) {
        console.warn('ffmpeg multi-threaded load failed, trying single-threaded:', err)
      }
    }

    // Single-threaded fallback — no SharedArrayBuffer needed.
    await ff.load({
      coreURL: await toBlobURL(`${ST_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${ST_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    instance = ff
    return ff
  })()

  return loadingPromise
}

export function isFFmpegLoaded() {
  return instance !== null
}
