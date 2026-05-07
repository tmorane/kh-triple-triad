import { cardPool } from '../cards/cardPool'
import type { CardId, PlayerProfile, TrackedPokemonState } from '../types'

const trackedCardIdSet = new Set<CardId>(cardPool.map((card) => card.id))

export const TRACKED_GAUGE_POINTS_PER_WIN = 20
export const TRACKED_GAUGE_POINTS_REQUIRED = 100
export const TRACKED_GAUGE_WINDOW_MS = 12 * 60 * 60 * 1000
export const TRACKED_GAUGE_MAX_COMPLETIONS_PER_WINDOW = 10

export interface TrackedPokemonMatchUpdate {
  previous: TrackedPokemonState
  next: TrackedPokemonState
  gainedGaugePoints: number
  fragmentsGranted: number
  capReached: boolean
  windowReset: boolean
}

export function createInitialTrackedPokemonState(): TrackedPokemonState {
  return {
    targetCardId: null,
    gaugePoints: 0,
    completedGaugesInWindow: 0,
    windowStartedAt: null,
  }
}

export function getPokedexClaimSelectionCount(
  profile: Pick<PlayerProfile, 'ownedCardIds'>,
  opponentDeckSize: number,
): number {
  const safeDeckSize = Math.max(0, Math.floor(opponentDeckSize))
  if (safeDeckSize === 0 || cardPool.length === 0) {
    return 0
  }

  const completion = new Set(profile.ownedCardIds).size / cardPool.length
  if (completion >= 1) {
    return safeDeckSize
  }
  if (completion >= 0.75) {
    return Math.min(3, safeDeckSize)
  }
  if (completion >= 0.5) {
    return Math.min(2, safeDeckSize)
  }
  return 1
}

export function setTrackedPokemonTarget(
  state: Readonly<TrackedPokemonState>,
  targetCardId: CardId | null,
): TrackedPokemonState {
  if (targetCardId !== null && !trackedCardIdSet.has(targetCardId)) {
    throw new Error(`Unknown tracked card id: ${targetCardId}`)
  }

  return {
    ...state,
    targetCardId,
  }
}

export function applyTrackedPokemonMatchResult(
  state: Readonly<TrackedPokemonState>,
  winner: 'player' | 'cpu' | 'draw',
  now: Date = new Date(),
): TrackedPokemonMatchUpdate {
  const previous = cloneTrackedState(state)
  const next = cloneTrackedState(state)

  if (next.targetCardId === null || winner !== 'player') {
    return {
      previous,
      next,
      gainedGaugePoints: 0,
      fragmentsGranted: 0,
      capReached: next.completedGaugesInWindow >= TRACKED_GAUGE_MAX_COMPLETIONS_PER_WINDOW,
      windowReset: false,
    }
  }

  const { windowReset } = normalizeWindow(next, now)

  if (next.completedGaugesInWindow >= TRACKED_GAUGE_MAX_COMPLETIONS_PER_WINDOW) {
    return {
      previous,
      next,
      gainedGaugePoints: 0,
      fragmentsGranted: 0,
      capReached: true,
      windowReset,
    }
  }

  next.gaugePoints += TRACKED_GAUGE_POINTS_PER_WIN

  let fragmentsGranted = 0
  while (
    next.gaugePoints >= TRACKED_GAUGE_POINTS_REQUIRED &&
    next.completedGaugesInWindow < TRACKED_GAUGE_MAX_COMPLETIONS_PER_WINDOW
  ) {
    next.gaugePoints -= TRACKED_GAUGE_POINTS_REQUIRED
    next.completedGaugesInWindow += 1
    fragmentsGranted += 1
  }

  if (next.completedGaugesInWindow >= TRACKED_GAUGE_MAX_COMPLETIONS_PER_WINDOW) {
    next.gaugePoints = Math.min(next.gaugePoints, TRACKED_GAUGE_POINTS_REQUIRED - 1)
  }

  return {
    previous,
    next,
    gainedGaugePoints: TRACKED_GAUGE_POINTS_PER_WIN,
    fragmentsGranted,
    capReached: next.completedGaugesInWindow >= TRACKED_GAUGE_MAX_COMPLETIONS_PER_WINDOW,
    windowReset,
  }
}

function cloneTrackedState(state: Readonly<TrackedPokemonState>): TrackedPokemonState {
  return {
    targetCardId: state.targetCardId,
    gaugePoints: state.gaugePoints,
    completedGaugesInWindow: state.completedGaugesInWindow,
    windowStartedAt: state.windowStartedAt,
  }
}

function normalizeWindow(state: TrackedPokemonState, now: Date): { windowReset: boolean } {
  const nowIso = now.toISOString()
  if (!state.windowStartedAt) {
    state.windowStartedAt = nowIso
    return { windowReset: false }
  }

  const startMs = Date.parse(state.windowStartedAt)
  if (!Number.isFinite(startMs)) {
    state.windowStartedAt = nowIso
    state.completedGaugesInWindow = 0
    return { windowReset: true }
  }

  if (now.getTime() - startMs >= TRACKED_GAUGE_WINDOW_MS) {
    state.windowStartedAt = nowIso
    state.completedGaugesInWindow = 0
    return { windowReset: true }
  }

  return { windowReset: false }
}
