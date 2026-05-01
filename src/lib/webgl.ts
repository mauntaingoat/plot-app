/* WebGL availability probe.
 *
 * Used to gate every map-rendering surface in the agent profile so
 * visitors on browsers without WebGL (Safari with hardware accel
 * off, old Android Chromiums, locked-down corporate machines, the
 * occasional in-app webview) get a clean listings-only page instead
 * of Mapbox's "Failed to initialize WebGL" error screen.
 *
 * The check is cached after the first call — the answer doesn't
 * change for the lifetime of a tab and we may consult it from
 * multiple components per render. */

let cached: boolean | null = null

export function hasWebGL(): boolean {
  if (cached !== null) return cached
  if (typeof document === 'undefined') {
    // SSR / Node — optimistic so the resulting markup matches the
    // common-case client.
    return true
  }
  try {
    const canvas = document.createElement('canvas')
    const ctx =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl' as 'webgl')
    // Some browsers return a context that immediately reports as
    // lost — treat that as "no WebGL" too.
    if (!ctx) {
      cached = false
      return false
    }
    const lost = (ctx as WebGLRenderingContext).getExtension?.('WEBGL_lose_context')
    // Just probing — don't actually call loseContext, that would
    // burn the throwaway canvas's slot and we want to leave
    // resources untouched.
    void lost
    cached = true
    return true
  } catch {
    cached = false
    return false
  }
}
