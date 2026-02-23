import type { RankedDivision, RankedState, RankedTierId } from '../types'

export type RankedStreakType = RankedState['resultStreak']['type']

export interface RankedMatchResultSummary {
  previous: RankedState
  next: RankedState
  deltaLp: number
  promoted: boolean
  demoted: boolean
}

interface RankedSlot {
  tier: RankedTierId
  division: RankedDivision | null
}

const LP_PER_RESULT = 20
const STREAK_STEP = 5
const STREAK_CAP = 10
const MAX_LP = 99
const DEMOTION_SHIELD_AFTER_PROMOTION = 3

export const rankedTiers: ReadonlyArray<{ id: RankedTierId; name: string; hasDivisions: boolean }> = [
  { id: 'iron', name: 'Iron', hasDivisions: true },
  { id: 'bronze', name: 'Bronze', hasDivisions: true },
  { id: 'silver', name: 'Silver', hasDivisions: true },
  { id: 'gold', name: 'Gold', hasDivisions: true },
  { id: 'platinum', name: 'Platinum', hasDivisions: true },
  { id: 'emerald', name: 'Emerald', hasDivisions: true },
  { id: 'diamond', name: 'Diamond', hasDivisions: true },
  { id: 'master', name: 'Master', hasDivisions: false },
  { id: 'grandmaster', name: 'Grandmaster', hasDivisions: false },
  { id: 'challenger', name: 'Challenger', hasDivisions: false },
]

const divisions: RankedDivision[] = ['IV', 'III', 'II', 'I']

const rankedSlots: RankedSlot[] = rankedTiers.flatMap((tier): RankedSlot[] => {
  if (!tier.hasDivisions) {
    return [{ tier: tier.id, division: null }]
  }

  return divisions.map((division): RankedSlot => ({ tier: tier.id, division }))
})

export function createInitialRankedState(): RankedState {
  return {
    tier: 'iron',
    division: 'IV',
    lp: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    matchesPlayed: 0,
    resultStreak: {
      type: 'none',
      count: 0,
    },
    demotionShieldLosses: 0,
  }
}

export function applyRankedMatchResult(
  state: RankedState,
  winner: 'player' | 'cpu' | 'draw',
): RankedMatchResultSummary {
  const previous = cloneRankedState(state)
  const next = cloneRankedState(state)

  next.matchesPlayed += 1

  if (winner === 'draw') {
    next.draws += 1
    next.resultStreak = { type: 'none', count: 0 }

    return {
      previous,
      next,
      deltaLp: 0,
      promoted: false,
      demoted: false,
    }
  }

  const isWin = winner === 'player'
  if (isWin) {
    next.wins += 1
    next.resultStreak = buildNextStreak(next.resultStreak, 'win')
  } else {
    next.losses += 1
    next.resultStreak = buildNextStreak(next.resultStreak, 'loss')
  }

  const streakBonus = Math.min(Math.max(next.resultStreak.count - 1, 0) * STREAK_STEP, STREAK_CAP)
  const deltaLp = isWin ? LP_PER_RESULT + streakBonus : -(LP_PER_RESULT + streakBonus)

  let promoted = false
  let demoted = false

  let slotIndex = getSlotIndex(next)
  let lpValue = next.lp + deltaLp

  if (deltaLp > 0) {
    while (lpValue >= 100) {
      const promotedIndex = slotIndex + 1
      if (promotedIndex >= rankedSlots.length) {
        lpValue = MAX_LP
        break
      }

      slotIndex = promotedIndex
      lpValue -= 100
      promoted = true
      next.demotionShieldLosses = DEMOTION_SHIELD_AFTER_PROMOTION
    }
  } else if (deltaLp < 0 && lpValue < 0) {
    const isFloor = slotIndex === 0

    if (isFloor) {
      lpValue = 0
    } else if (next.demotionShieldLosses > 0) {
      next.demotionShieldLosses -= 1
      lpValue = 0
    } else {
      const demotedIndex = slotIndex - 1
      const overflow = Math.abs(lpValue)
      slotIndex = demotedIndex
      lpValue = 100 - overflow
      demoted = true
    }
  }

  lpValue = clamp(lpValue, 0, MAX_LP)

  const slot = rankedSlots[slotIndex]
  next.tier = slot.tier
  next.division = slot.division
  next.lp = lpValue

  return {
    previous,
    next,
    deltaLp,
    promoted,
    demoted,
  }
}

function getSlotIndex(state: RankedState): number {
  const slotIndex = rankedSlots.findIndex((slot) => slot.tier === state.tier && slot.division === state.division)
  if (slotIndex === -1) {
    throw new Error(`Invalid ranked slot: ${state.tier} ${state.division ?? 'Apex'}`)
  }
  return slotIndex
}

function buildNextStreak(
  current: RankedState['resultStreak'],
  nextType: Exclude<RankedStreakType, 'none'>,
): RankedState['resultStreak'] {
  if (current.type === nextType) {
    return {
      type: nextType,
      count: current.count + 1,
    }
  }

  return {
    type: nextType,
    count: 1,
  }
}

function cloneRankedState(state: RankedState): RankedState {
  return {
    ...state,
    resultStreak: { ...state.resultStreak },
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }

  if (value > max) {
    return max
  }

  return value
}
