import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface State {
  error: Error | null
}

interface Props {
  children: ReactNode
  onReset?: () => void
}

/**
 * Catches render-time errors from the editor tree and shows a recoverable
 * fallback instead of unmounting silently to a dark screen. Logs the full
 * error + component stack to the console so we can see what blew up.
 */
export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // eslint-disable-next-line no-console
    console.error('[editor] render error caught by boundary', error, info)
  }

  reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center text-center px-6 py-16 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-live-red/15 flex items-center justify-center">
            <AlertTriangle size={26} className="text-live-red" />
          </div>
          <div>
            <p className="text-white text-[15px] font-semibold mb-1">Something broke in the editor</p>
            <p className="text-white/55 text-[12px] leading-snug max-w-[280px] mx-auto">
              {this.state.error.message || 'An unexpected error happened. The editor state has been reset.'}
            </p>
          </div>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-tangerine text-white text-[12px] font-bold cursor-pointer hover:brightness-110 transition-all"
          >
            <RefreshCw size={13} />
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
