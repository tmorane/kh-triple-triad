import { act, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { RankedMatchResultSummary } from '../../domain/progression/ranked'
import { RankedLpRecap } from './RankedLpRecap'

type RankedMatchResultSummaryOverrides = Omit<Partial<RankedMatchResultSummary>, 'previous' | 'next'> & {
  previous?: Partial<RankedMatchResultSummary['previous']>
  next?: Partial<RankedMatchResultSummary['next']>
}

function makeUpdate(overrides: RankedMatchResultSummaryOverrides = {}): RankedMatchResultSummary {
  const base: RankedMatchResultSummary = {
    previous: {
      tier: 'iron',
      division: 'IV',
      lp: 95,
      wins: 3,
      losses: 2,
      draws: 1,
      matchesPlayed: 6,
      resultStreak: { type: 'win', count: 2 },
      demotionShieldLosses: 0,
    },
    next: {
      tier: 'iron',
      division: 'III',
      lp: 15,
      wins: 4,
      losses: 2,
      draws: 1,
      matchesPlayed: 7,
      resultStreak: { type: 'win', count: 3 },
      demotionShieldLosses: 3,
    },
    deltaLp: 20,
    promoted: true,
    demoted: false,
  }

  return {
    ...base,
    ...overrides,
    previous: { ...base.previous, ...overrides.previous },
    next: { ...base.next, ...overrides.next },
  }
}

describe('RankedLpRecap', () => {
  test('renders positive delta LP', () => {
    render(<RankedLpRecap mode="4x4" update={makeUpdate({ deltaLp: 30, promoted: false })} animated={false} context="results" testIdPrefix="ranked" />)

    expect(screen.getByTestId('ranked-delta')).toHaveTextContent('+30 LP')
  })

  test('renders negative and neutral delta LP', () => {
    const { rerender } = render(
      <RankedLpRecap mode="4x4" update={makeUpdate({ deltaLp: -25, promoted: false, demoted: false })} animated={false} context="results" testIdPrefix="ranked" />,
    )
    expect(screen.getByTestId('ranked-delta')).toHaveTextContent('-25 LP')

    rerender(
      <RankedLpRecap mode="4x4" update={makeUpdate({ deltaLp: 0, promoted: false, demoted: false })} animated={false} context="results" testIdPrefix="ranked" />,
    )
    expect(screen.getByTestId('ranked-delta')).toHaveTextContent('0 LP')
  })

  test('renders next tier emblem and before/after labels', () => {
    render(<RankedLpRecap mode="4x4" update={makeUpdate()} animated={false} context="results" testIdPrefix="ranked" />)

    expect(screen.getByTestId('ranked-emblem')).toHaveAttribute('src', '/ranks/iron.svg')
    expect(screen.getByTestId('ranked-before')).toHaveTextContent('Before: Iron IV • 95 LP')
    expect(screen.getByTestId('ranked-after')).toHaveTextContent('After: Iron III • 15 LP')
  })

  test('renders promotion and demotion badges from flags', () => {
    const { rerender } = render(
      <RankedLpRecap mode="4x4" update={makeUpdate({ promoted: true, demoted: false })} animated={false} context="results" testIdPrefix="ranked" />,
    )
    expect(screen.getByTestId('ranked-event')).toHaveTextContent('PROMOTION')

    rerender(
      <RankedLpRecap mode="4x4" update={makeUpdate({ promoted: false, demoted: true })} animated={false} context="results" testIdPrefix="ranked" />,
    )
    expect(screen.getByTestId('ranked-event')).toHaveTextContent('DEMOTION')
  })

  test('does not mark recap as animated when animated is false', () => {
    render(<RankedLpRecap mode="4x4" update={makeUpdate()} animated={false} context="results" testIdPrefix="ranked" />)

    expect(screen.getByTestId('ranked-recap')).not.toHaveClass('is-animated')
  })

  test('does not restart animation on rerender when LP transition values stay identical', () => {
    const rafCallbacks = new Map<number, FrameRequestCallback>()
    let nextFrameId = 0
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        nextFrameId += 1
        rafCallbacks.set(nextFrameId, callback)
        return nextFrameId
      })
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId: number) => {
      rafCallbacks.delete(frameId)
    })

    const animatedUpdateOverrides = {
      promoted: false,
      demoted: false,
      deltaLp: 20,
      previous: { tier: 'iron', division: 'IV', lp: 10 },
      next: { tier: 'iron', division: 'IV', lp: 30 },
    } as RankedMatchResultSummaryOverrides

    const flushAnimationFrame = (timestamp: number) => {
      const callbacks = [...rafCallbacks.values()]
      rafCallbacks.clear()
      callbacks.forEach((callback) => callback(timestamp))
    }

    try {
      const { rerender } = render(
        <RankedLpRecap
          mode="4x4"
          update={makeUpdate(animatedUpdateOverrides)}
          animated
          context="results"
          testIdPrefix="ranked"
        />,
      )

      expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('ranked-current-lp')).toHaveTextContent('10 LP')

      act(() => {
        flushAnimationFrame(0)
      })
      act(() => {
        flushAnimationFrame(900)
      })

      expect(screen.getByTestId('ranked-current-lp')).toHaveTextContent('30 LP')
      const callsBeforeRerender = requestAnimationFrameSpy.mock.calls.length

      rerender(
        <RankedLpRecap
          mode="4x4"
          update={makeUpdate(animatedUpdateOverrides)}
          animated
          context="results"
          testIdPrefix="ranked"
        />,
      )

      expect(requestAnimationFrameSpy.mock.calls.length).toBe(callsBeforeRerender)
    } finally {
      requestAnimationFrameSpy.mockRestore()
      cancelAnimationFrameSpy.mockRestore()
    }
  })
})
