import { Component, ReactNode } from 'react'
import { Warning as AlertTriangle, ArrowsClockwise as RefreshCw } from '@phosphor-icons/react'
interface Props {
  children: ReactNode
  label?: string
}

interface State {
  error: Error | null
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryCount: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
      return { error: null }
    }
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
      console.warn('[ErrorBoundary] suppressed Firestore internal assertion, auto-retrying')
      this.setState((s) => ({ error: null, retryCount: s.retryCount + 1 }))
      return
    }
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
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
