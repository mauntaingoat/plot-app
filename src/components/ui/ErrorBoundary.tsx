import { Component, type ReactNode } from 'react'
import { Warning as AlertTriangle, ArrowsClockwise as RefreshCw } from '@phosphor-icons/react'
interface Props {
  children: ReactNode
  label?: string
}

interface State {
  error: Error | null
  retryCount: number
  // True between the moment a stale-chunk error is caught and the
  // moment window.location.reload() actually takes effect. Render a
  // clean loading screen instead of the error fallback so users never
  // see "App failed to load" during a deploy-triggered reload.
  reloading: boolean
}

// Browsers phrase the "lazy chunk 404" error differently — Chrome says
// "Failed to fetch dynamically imported module", Safari says "Importing
// a module script failed", Firefox says "error loading dynamically
// imported module". Match any of them.
function isStaleChunkError(err: Error): boolean {
  const msg = err?.message || ''
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('ChunkLoadError')
  )
}

// One-shot reload guard so a bundle that's *actually* broken (vs.
// merely stale) doesn't trigger an infinite reload loop. Cleared by
// the user closing the tab.
const RELOAD_FLAG = 'reelst:reloaded-for-stale-chunk'

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryCount: 0, reloading: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
      return { error: null }
    }
    // Stale chunk after a hosting deploy — componentDidCatch will
    // window.location.reload(). Don't render the error fallback in
    // the gap; show a quiet loading state instead.
    if (isStaleChunkError(error)) {
      return { error: null, reloading: true }
    }
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
      console.warn('[ErrorBoundary] suppressed Firestore internal assertion, auto-retrying')
      this.setState((s) => ({ error: null, retryCount: s.retryCount + 1 }))
      return
    }
    // Stale lazy-chunk after a deploy: the old index.html references a
    // hash that no longer exists on the server. Force-reload to fetch
    // the new index.html with current asset hashes. Skip if we already
    // tried this in the current tab session — that signals a real
    // problem (build broken, server down) we should show the fallback
    // for instead of looping.
    if (isStaleChunkError(error) && typeof sessionStorage !== 'undefined') {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        console.warn('[ErrorBoundary] stale chunk detected, force-reloading')
        window.location.reload()
        return
      }
    }
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.reloading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-ivory">
          <div className="w-8 h-8 rounded-full border-2 border-pearl border-t-tangerine animate-spin" />
        </div>
      )
    }
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-3">
          <div className="w-12 h-12 rounded-full bg-live-red/10 flex items-center justify-center">
            <AlertTriangle size={22} className="text-live-red" />
          </div>
          <p className="text-[14px] font-semibold text-ink">
            {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
          </p>
          <p className="text-[12px] text-smoke max-w-[260px]">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-tangerine text-white text-[12px] font-bold cursor-pointer hover:brightness-110 transition-all mt-1"
          >
            <RefreshCw size={12} />
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
