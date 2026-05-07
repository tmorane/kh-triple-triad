export type RuntimeErrorSource = 'react-boundary' | 'window-error' | 'unhandled-rejection'

export interface RuntimeErrorReport {
  source: RuntimeErrorSource
  message: string
  stack?: string
  metadata?: Record<string, unknown>
}

function normalizeUnknownError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    }
  }

  if (typeof error === 'string') {
    return { message: error }
  }

  try {
    return { message: JSON.stringify(error) }
  } catch {
    return { message: 'Unknown runtime error' }
  }
}

export function reportRuntimeError(report: RuntimeErrorReport): void {
  // Keep the default adapter simple for V1. This can be swapped for Sentry/PostHog later.
  console.error('[runtime-error]', report)
}

let monitoringInstalled = false

export function installRuntimeMonitoringHooks(): void {
  if (monitoringInstalled || typeof window === 'undefined') {
    return
  }

  monitoringInstalled = true

  window.addEventListener('error', (event) => {
    const normalized = normalizeUnknownError(event.error ?? event.message)
    reportRuntimeError({
      source: 'window-error',
      message: normalized.message,
      stack: normalized.stack,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const normalized = normalizeUnknownError(event.reason)
    reportRuntimeError({
      source: 'unhandled-rejection',
      message: normalized.message,
      stack: normalized.stack,
    })
  })
}
