import type { FFmpeg } from '@ffmpeg/ffmpeg'

/**
 * Lazy-loaded ffmpeg.wasm singleton. Uses the single-threaded core
 * which works in all browsers without SharedArrayBuffer/COOP/COEP.
 */
let instance: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null

const CORE_VERSION = '0.12.10'
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`

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

    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    instance = ff
    return ff
  })()

  return loadingPromise
}

export function isFFmpegLoaded() {
  return instance !== null
}
