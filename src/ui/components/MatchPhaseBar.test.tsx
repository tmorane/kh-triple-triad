import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'bun:test'
import { MatchPhaseBar } from './MatchPhaseBar'

describe('MatchPhaseBar', () => {
  test('marks the current combat phase', () => {
    render(<MatchPhaseBar phase="duel" />)

    expect(screen.getByTestId('match-phase-bar-label')).toHaveTextContent('Combat Console')
    expect(screen.getByTestId('match-phase-bar-current')).toHaveTextContent('Duel')
    expect(screen.getByTestId('match-phase-bar-action')).toHaveTextContent('Compare les côtés')
    expect(screen.getByTestId('match-phase-bar-next')).toHaveTextContent('Ensuite: capture visible')
    expect(screen.getByTestId('match-phase-step-duel')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByTestId('match-phase-step-result')).toHaveAttribute('data-phase-state', 'next')
    expect(screen.getByTestId('match-phase-step-pose')).not.toHaveAttribute('aria-current')
  })
})
