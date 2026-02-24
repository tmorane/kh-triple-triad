import { useEffect, useMemo, useState } from 'react'
import type { RankedMatchResultSummary } from '../../domain/progression/ranked'
import type { MatchMode, RankedTierId } from '../../domain/types'

type RankedLpRecapContext = 'modal' | 'results'

interface RankedLpRecapProps {
  mode: MatchMode
  update: RankedMatchResultSummary
  animated: boolean
  context: RankedLpRecapContext
  testIdPrefix: string
}

const tierNames: Record<RankedTierId, string> = {
  iron: 'Iron',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  emerald: 'Emerald',
  diamond: 'Diamond',
  master: 'Master',
  grandmaster: 'Grandmaster',
  challenger: 'Challenger',
}

function clampLp(lp: number): number {
  if (!Number.isFinite(lp)) {
    return 0
  }
  return Math.max(0, Math.min(99, Math.round(lp)))
}

function toPercent(lp: number): number {
  return (clampLp(lp) / 99) * 100
}

function formatRankLabel(tier: RankedTierId, division: string | null): string {
  const tierLabel = tierNames[tier]
  return division ? `${tierLabel} ${division}` : tierLabel
}

function formatDelta(deltaLp: number): string {
  if (deltaLp > 0) {
    return `+${deltaLp} LP`
  }
  if (deltaLp < 0) {
    return `${deltaLp} LP`
  }
  return '0 LP'
}

function getDeltaClass(deltaLp: number): 'positive' | 'negative' | 'neutral' {
  if (deltaLp > 0) {
    return 'positive'
  }
  if (deltaLp < 0) {
    return 'negative'
  }
  return 'neutral'
}

function getStartLp(update: RankedMatchResultSummary): number {
  const sameSlot = update.previous.tier === update.next.tier && update.previous.division === update.next.division
  if (sameSlot) {
    return clampLp(update.previous.lp)
  }
  if (update.promoted) {
    return 0
  }
  if (update.demoted) {
    return 99
  }
  return clampLp(update.previous.lp)
}

function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function RankedLpRecap({ mode, update, animated, context, testIdPrefix }: RankedLpRecapProps) {
  const deltaClass = getDeltaClass(update.deltaLp)
  const targetLp = clampLp(update.next.lp)
  const shouldAnimate = animated && !getPrefersReducedMotion()
  const [displayedLp, setDisplayedLp] = useState<number>(() => (shouldAnimate ? getStartLp(update) : targetLp))

  useEffect(() => {
    const startLp = shouldAnimate ? getStartLp(update) : targetLp
    if (!shouldAnimate || startLp === targetLp) {
      setDisplayedLp(targetLp)
      return
    }

    const durationMs = 900
    let frameId = 0
    let startTimestamp: number | null = null

    const animateStep = (timestamp: number) => {
      if (startTimestamp === null) {
        startTimestamp = timestamp
      }

      const elapsed = timestamp - startTimestamp
      const progress = Math.min(1, elapsed / durationMs)
      const eased = 1 - (1 - progress) ** 3
      const value = Math.round(startLp + (targetLp - startLp) * eased)

      setDisplayedLp(clampLp(value))

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animateStep)
      }
    }

    frameId = window.requestAnimationFrame(animateStep)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [shouldAnimate, targetLp, update])

  const currentLpLabel = useMemo(() => `${clampLp(displayedLp)} LP`, [displayedLp])

  return (
    <section
      className={`ranked-lp-recap ranked-lp-recap--${context} ${shouldAnimate ? 'is-animated' : ''}`}
      data-testid={`${testIdPrefix}-recap`}
      aria-label="Ranked LP recap"
    >
      <header className="ranked-lp-recap__header">
        <img
          src={`/ranks/${update.next.tier}.svg`}
          alt={`${formatRankLabel(update.next.tier, update.next.division)} rank emblem`}
          className="ranked-lp-recap__emblem"
          data-testid={`${testIdPrefix}-emblem`}
        />
        <h3 className="ranked-lp-recap__title">{`Ranked LP · ${mode.toUpperCase()}`}</h3>
        <p
          className={`ranked-lp-recap__delta ranked-lp-recap__delta--${deltaClass}`}
          data-testid={`${testIdPrefix}-delta`}
        >
          {formatDelta(update.deltaLp)}
        </p>
      </header>

      <div className="ranked-lp-recap__ranks">
        <p className="ranked-lp-recap__line" data-testid={`${testIdPrefix}-before`}>
          Before: {formatRankLabel(update.previous.tier, update.previous.division)} • {update.previous.lp} LP
        </p>
        <p className="ranked-lp-recap__line" data-testid={`${testIdPrefix}-after`}>
          After: {formatRankLabel(update.next.tier, update.next.division)} • {update.next.lp} LP
        </p>
      </div>

      <div className="ranked-lp-recap__progress-row">
        <div
          className="ranked-lp-recap__progress"
          role="progressbar"
          aria-label="Ranked LP progress"
          aria-valuemin={0}
          aria-valuemax={99}
          aria-valuenow={clampLp(displayedLp)}
          data-testid={`${testIdPrefix}-progress`}
        >
          <span className="ranked-lp-recap__progress-fill" style={{ width: `${toPercent(displayedLp)}%` }} />
        </div>
        <p className="ranked-lp-recap__current-lp" data-testid={`${testIdPrefix}-current-lp`}>
          {currentLpLabel}
        </p>
      </div>

      {update.promoted ? (
        <p
          className="ranked-lp-recap__event ranked-lp-recap__event--promotion"
          data-testid={`${testIdPrefix}-event`}
        >
          PROMOTION
        </p>
      ) : null}
      {update.demoted ? (
        <p
          className="ranked-lp-recap__event ranked-lp-recap__event--demotion"
          data-testid={`${testIdPrefix}-event`}
        >
          DEMOTION
        </p>
      ) : null}
    </section>
  )
}
