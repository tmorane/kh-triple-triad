import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportRuntimeError } from '../../app/runtime/runtimeMonitoring'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportRuntimeError({
      source: 'react-boundary',
      message: error.message,
      stack: error.stack,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    })
  }

  private handleReload = (): void => {
    if (typeof window === 'undefined') {
      return
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="panel" data-testid="app-crash-fallback">
          <h1>Oops, quelque chose a crash.</h1>
          <p className="small">Une erreur inattendue est survenue. Tu peux recharger la page pour reprendre.</p>
          <button type="button" className="button button-primary" onClick={this.handleReload}>
            Recharger
          </button>
        </section>
      )
    }

    return this.props.children
  }
}
