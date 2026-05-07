import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'bun:test'
import { AppErrorBoundary } from './AppErrorBoundary'

vi.mock('../../app/runtime/runtimeMonitoring', () => ({
  reportRuntimeError: vi.fn(),
}))

function CrashComponent() {
  throw new Error('boom')
}

describe('AppErrorBoundary', () => {
  test('renders fallback UI when a child throws', () => {
    render(
      <AppErrorBoundary>
        <CrashComponent />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('app-crash-fallback')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeInTheDocument()
  })
})
