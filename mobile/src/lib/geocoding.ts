/**
 * Mapbox geocoding — mirrors web `src/hooks/useGeocoding.ts`.
 *
 * iOS hits the same Mapbox Places API with the same token; results
 * are debounced and aborted on rapid query changes so we don't burn
 * Mapbox quota during typing.
 *
 * iOS sim quirks: we drop `proximity=ip` (Mapbox's IP-based bias
 * doesn't play well with simulator NAT'd IPs) and retry transient
 * `Network request failed` errors up to 3 times with exponential
 * backoff — the iOS simulator's NSURLSession bug drops fresh
 * connections after any network state change and can fail several
 * times in a row before recovering.
 *
 * If the fetch still fails after all retries we surface the error
 * through `GeocodingState.error` so the UI can show a retry pill
 * rather than a silent empty dropdown (which was the bug as of
 * 2026-05-22 — geocode would die in the sim and the address step
 * looked permanently broken).
 */

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? ''

if (!MAPBOX_TOKEN) {
  // eslint-disable-next-line no-console
  console.warn(
    '[geocoding] EXPO_PUBLIC_MAPBOX_TOKEN is not set. Address search will return no results. ' +
      'Add it to mobile/.env and restart the Metro bundler with `--clear`.',
  )
}

export interface GeocodingResult {
  placeName: string
  center: [number, number] // [lng, lat]
  text: string
}

export type GeocodingType = 'address' | 'spotlight'

export interface GeocodingState {
  results: GeocodingResult[]
  loading: boolean
  /** Human-readable error after retries exhausted. Cleared on each fresh
   *  search. UI surfaces this so the user knows to retry. */
  error: string | null
}

interface GeocodingHandle {
  /** Submit a fresh query. Debounced internally; safe to call on
   *  every keystroke. */
  search: (query: string, type?: GeocodingType) => void
  /** Cancel pending + clear results. */
  clear: () => void
  /** Re-run the last query with the same type. No-op if no prior search. */
  retry: () => void
}

const MAX_ATTEMPTS = 3
const BACKOFF_MS = [400, 900, 1600]

/** Fetch with up to MAX_ATTEMPTS-1 retries on transient network errors.
 *  iOS sim's NSURLSession drops fresh connections sporadically — one
 *  retry isn't enough. Aborts are propagated immediately, not retried. */
async function fetchWithRetry(url: string, signal: AbortSignal): Promise<Response> {
  const headers: Record<string, string> = {
    // Mapbox is more forgiving with browser-shaped UAs than the bare
    // RN default, which some intermediaries drop on the floor.
    'User-Agent': 'Reelst-iOS/1.0',
    Accept: 'application/json',
  }
  let lastErr: unknown = null
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fetch(url, { signal, headers })
    } catch (err) {
      if (signal.aborted) throw err
      const msg = err instanceof Error ? err.message : String(err)
      const isTransient = /network request failed|timeout|cancelled|load failed/i.test(msg)
      lastErr = err
      if (!isTransient || attempt === MAX_ATTEMPTS - 1) throw err
      // eslint-disable-next-line no-console
      console.warn(`[geocoding] transient fetch error (attempt ${attempt + 1}/${MAX_ATTEMPTS}):`, msg)
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]))
      if (signal.aborted) throw err
    }
  }
  throw lastErr ?? new Error('geocoding: exhausted retries')
}

/** Vanilla controller — not a React hook because some screens want
 *  to drive it imperatively from a TextInput's onChange. Pair with
 *  a `useState` in the component to render the results. */
export function createGeocodingController(
  onChange: (state: GeocodingState) => void,
): GeocodingHandle {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let abort: AbortController | null = null
  // Monotonic request id. The catch/finally only mutate UI state when
  // their request is still the latest — older (aborted) requests no-op
  // so newer ones own the spinner.
  let latestId = 0
  // Track the last query + type so the UI can call retry() without
  // needing to re-pass the text.
  let lastQuery = ''
  let lastType: GeocodingType = 'address'

  const run = (query: string, type: GeocodingType) => {
    if (timeoutId) clearTimeout(timeoutId)
    if (abort) abort.abort()

    lastQuery = query
    lastType = type

    const q = query.trim()
    if (!q || q.length < 3) {
      latestId++
      onChange({ results: [], loading: false, error: null })
      return
    }

    const myId = ++latestId
    timeoutId = setTimeout(async () => {
      const controller = new AbortController()
      abort = controller
      onChange({ results: [], loading: true, error: null })

      // Safety: if the network hangs, force-abort after 12s so the
      // spinner doesn't get stuck on screen. Slightly longer than the
      // sum of backoffs so retries get their chance.
      const safetyTimer = setTimeout(() => controller.abort(), 12000)

      try {
        if (!MAPBOX_TOKEN) {
          if (myId === latestId) {
            onChange({
              results: [],
              loading: false,
              error: 'Mapbox token missing. Add EXPO_PUBLIC_MAPBOX_TOKEN to mobile/.env and restart Metro with --clear.',
            })
          }
          return
        }
        const types = type === 'spotlight'
          ? 'neighborhood,locality,place,district'
          : 'address'
        // Note: no `proximity=ip` — flakes on simulator NAT'd IPs.
        // Web can re-add it if ranking quality regresses; for now
        // mobile ranks results by Mapbox's default relevance.
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&country=us&types=${types}&limit=5&autocomplete=true`
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[geocoding] →', url.replace(MAPBOX_TOKEN, 'TOKEN'))
        }
        const res = await fetchWithRetry(url, controller.signal)
        if (myId !== latestId) return
        if (!res.ok) {
          const bodyText = await res.text().catch(() => '')
          // eslint-disable-next-line no-console
          console.warn('[geocoding] non-2xx', res.status, bodyText)
          onChange({
            results: [],
            loading: false,
            error: res.status === 401
              ? 'Mapbox rejected the token. Check it\'s active + unrestricted.'
              : `Mapbox returned ${res.status}. Try again.`,
          })
          return
        }
        const data = await res.json() as {
          features?: Array<{ place_name: string; center: [number, number]; text: string }>
        }
        if (myId !== latestId) return
        const results: GeocodingResult[] = (data.features || []).map((f) => ({
          placeName: f.place_name,
          center: f.center,
          text: f.text,
        }))
        onChange({ results, loading: false, error: null })
      } catch (err) {
        // Stale request — a newer search() already replaced us. Don't
        // touch loading; the newer call will own it.
        if (myId !== latestId) return
        const isAbort = err instanceof Error && err.name === 'AbortError'
        if (isAbort) {
          // Safety timer fired — show as a timeout error so the user can retry.
          onChange({
            results: [],
            loading: false,
            error: 'Search timed out. Tap to retry.',
          })
          return
        }
        const msg = err instanceof Error ? err.message : String(err)
        // eslint-disable-next-line no-console
        console.warn('[geocoding] search error', msg)
        onChange({
          results: [],
          loading: false,
          error: /network request failed|load failed/i.test(msg)
            ? 'Network error reaching Mapbox. Tap to retry.'
            : `Couldn't load addresses: ${msg}`,
        })
      } finally {
        clearTimeout(safetyTimer)
      }
    }, 300)
  }

  return {
    search: (query, type = 'address') => run(query, type),
    clear: () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (abort) abort.abort()
      latestId++
      lastQuery = ''
      onChange({ results: [], loading: false, error: null })
    },
    retry: () => {
      if (!lastQuery) return
      run(lastQuery, lastType)
    },
  }
}
