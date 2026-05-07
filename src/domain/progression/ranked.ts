import type { RankedDivision, RankedState, RankedTierId } from '../types'

export type RankedStreakType = RankedState['resultStreak']['type']

export interface RankedMatchResultSummary {
  previous: RankedState
  next: RankedState
  deltaLp: number
  promoted: boolean
  demoted: boolean
  seasonReset: boolean
  awardedLeagueReward: { tier: RankedTierId; fragments: number } | null
}

interface RankedSlot {
  tier: RankedTierId
  division: RankedDivision | null
}

interface ApplyRankedMatchOptions {
  now?: Date
}

const WIN_POINTS_BASE = 30
const LOSS_POINTS_BASE = 15
const STREAK_BONUS_CAP = 5
const POINTS_FOR_PROMOTION = 100
const PROMOTION_SUCCESS_POINTS = 20
const PROMOTION_FAILURE_POINTS = 80
const ZERO_POINT_SHIELDS = 2
const DEMOTION_ON_ZERO_POINT_LOSS = ZERO_POINT_SHIELDS + 1
const MAX_POINTS = 100

const LEAGUE_PASSAGE_FRAGMENT_REWARD: Partial<Record<RankedTierId, number>> = {
  bronze: 10,
  silver: 15,
  gold: 20,
  platinum: 30,
  diamond: 50,
  challenger: 100,
}

export const rankedTiers: ReadonlyArray<{ id: RankedTierId; name: string; hasDivisions: boolean }> = [
  { id: 'iron', name: 'Iron', hasDivisions: true },
  { id: 'bronze', name: 'Bronze', hasDivisions: true },
  { id: 'silver', name: 'Silver', hasDivisions: true },
  { id: 'gold', name: 'Gold', hasDivisions: true },
  { id: 'platinum', name: 'Platinum', hasDivisions: true },
  { id: 'diamond', name: 'Diamond', hasDivisions: true },
  { id: 'challenger', name: 'Challenger', hasDivisions: false },
]

const rankedSlots: RankedSlot[] = rankedTiers.map((tier): RankedSlot => ({
  tier: tier.id,
  division: tier.id === 'challenger' ? null : 'IV',
}))

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
  options?: ApplyRankedMatchOptions,
): RankedMatchResultSummary {
  const previous = cloneRankedState(state)
  const next = cloneRankedState(state)
  const now = options?.now ?? new Date()
  const seasonReset = applySeasonBoundaryIfNeeded(next, now)

  next.matchesPlayed += 1

  if (next.promotionSeries) {
    return resolvePromotionSeries(next, previous, winner, seasonReset)
  }

  if (winner === 'draw') {
    next.draws += 1
    next.resultStreak = { type: 'none', count: 0 }

    return {
      previous,
      next,
      deltaLp: 0,
      promoted: false,
      demoted: false,
      seasonReset,
      awardedLeagueReward: null,
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

  const streakBonus = Math.min(Math.max(next.resultStreak.count - 1, 0), STREAK_BONUS_CAP)
  const deltaLp = isWin ? WIN_POINTS_BASE + streakBonus : -(LOSS_POINTS_BASE + streakBonus)

  const promoted = false
  let demoted = false

  const slotIndex = getSlotIndex(next)
  const lpBefore = next.lp
  const lpValue = next.lp + deltaLp

  if (deltaLp > 0) {
    if (next.tier === 'challenger') {
      next.lp = clamp(lpValue, 0, MAX_POINTS)
      return {
        previous,
        next,
        deltaLp,
        promoted,
        demoted,
        seasonReset,
        awardedLeagueReward: null,
      }
    }

    if (lpValue >= POINTS_FOR_PROMOTION) {
      next.lp = POINTS_FOR_PROMOTION
      next.promotionSeries = { wins: 0, losses: 0 }
      return {
        previous,
        next,
        deltaLp,
        promoted,
        demoted,
        seasonReset,
        awardedLeagueReward: null,
      }
    }

    next.lp = clamp(lpValue, 0, MAX_POINTS)
    return {
      previous,
      next,
      deltaLp,
      promoted,
      demoted,
      seasonReset,
      awardedLeagueReward: null,
    }
  }

  if (next.tier === 'challenger') {
    next.lp = clamp(lpValue, 0, MAX_POINTS)
    return {
      previous,
      next,
      deltaLp,
      promoted,
      demoted,
      seasonReset,
      awardedLeagueReward: null,
    }
  }

  if (lpValue >= 0) {
    next.lp = clamp(lpValue, 0, MAX_POINTS)
    return {
      previous,
      next,
      deltaLp,
      promoted,
      demoted,
      seasonReset,
      awardedLeagueReward: null,
    }
  }

  next.lp = 0
  if (lpBefore === 0) {
    next.demotionShieldLosses += 1
    if (next.demotionShieldLosses >= DEMOTION_ON_ZERO_POINT_LOSS && slotIndex > 0) {
      const demotedSlot = rankedSlots[slotIndex - 1]
      next.tier = demotedSlot.tier
      next.division = demotedSlot.division
      next.lp = PROMOTION_FAILURE_POINTS
      next.demotionShieldLosses = 0
      demoted = true
    }
  }

  return {
    previous,
    next,
    deltaLp,
    promoted,
    demoted,
    seasonReset,
    awardedLeagueReward: null,
  }
}

function applySeasonBoundaryIfNeeded(state: RankedState, now: Date): boolean {
  const currentSeasonId = getSeasonId(now)

  if (!state.seasonId) {
    state.seasonId = currentSeasonId
    state.seasonLeagueRewardsClaimed = state.seasonLeagueRewardsClaimed
      ? { ...state.seasonLeagueRewardsClaimed }
      : {}
    return false
  }

  if (state.seasonId === currentSeasonId) {
    state.seasonLeagueRewardsClaimed = state.seasonLeagueRewardsClaimed
      ? { ...state.seasonLeagueRewardsClaimed }
      : {}
    return false
  }

  const currentSlotIndex = getSlotIndex(state)
  const resetSlotIndex = Math.max(0, currentSlotIndex - 2)
  const resetSlot = rankedSlots[resetSlotIndex]

  state.tier = resetSlot.tier
  state.division = resetSlot.division
  state.lp = 0
  state.resultStreak = { type: 'none', count: 0 }
  state.demotionShieldLosses = 0
  state.promotionSeries = null
  state.seasonId = currentSeasonId
  state.seasonLeagueRewardsClaimed = {}

  return true
}

function getSeasonId(now: Date): string {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const seasonStartMonth = month - (month % 2)
  return `${year}-${String(seasonStartMonth + 1).padStart(2, '0')}`
}

function getSlotIndex(state: RankedState): number {
  const slotIndex = rankedSlots.findIndex((slot) => slot.tier === state.tier)
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
    promotionSeries: state.promotionSeries ? { ...state.promotionSeries } : state.promotionSeries,
    seasonLeagueRewardsClaimed: state.seasonLeagueRewardsClaimed ? { ...state.seasonLeagueRewardsClaimed } : state.seasonLeagueRewardsClaimed,
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

function resolvePromotionSeries(
  next: RankedState,
  previous: RankedState,
  winner: 'player' | 'cpu' | 'draw',
  seasonReset: boolean,
): RankedMatchResultSummary {
  if (!next.promotionSeries) {
    throw new Error('Promotion series resolution requires an active series.')
  }

  if (winner === 'draw') {
    next.draws += 1
    next.resultStreak = { type: 'none', count: 0 }
    return {
      previous,
      next,
      deltaLp: 0,
      promoted: false,
      demoted: false,
      seasonReset,
      awardedLeagueReward: null,
    }
  }

  const isWin = winner === 'player'
  if (isWin) {
    next.wins += 1
    next.resultStreak = buildNextStreak(next.resultStreak, 'win')
    next.promotionSeries.wins += 1
  } else {
    next.losses += 1
    next.resultStreak = buildNextStreak(next.resultStreak, 'loss')
    next.promotionSeries.losses += 1
  }

  if (next.promotionSeries.wins >= 2) {
    const currentSlotIndex = getSlotIndex(next)
    const promotedIndex = currentSlotIndex + 1
    if (promotedIndex < rankedSlots.length) {
      const promotedSlot = rankedSlots[promotedIndex]
      next.tier = promotedSlot.tier
      next.division = promotedSlot.division
    }
    next.lp = PROMOTION_SUCCESS_POINTS
    next.demotionShieldLosses = 0
    next.promotionSeries = null
    return {
      previous,
      next,
      deltaLp: 0,
      promoted: true,
      demoted: false,
      seasonReset,
      awardedLeagueReward: claimLeaguePassageReward(next),
    }
  }

  if (next.promotionSeries.losses >= 2) {
    next.lp = PROMOTION_FAILURE_POINTS
    next.promotionSeries = null
  }

  return {
    previous,
    next,
    deltaLp: 0,
    promoted: false,
    demoted: false,
    seasonReset,
    awardedLeagueReward: null,
  }
}

function claimLeaguePassageReward(state: RankedState): { tier: RankedTierId; fragments: number } | null {
  const rewardFragments = LEAGUE_PASSAGE_FRAGMENT_REWARD[state.tier]
  if (!rewardFragments || rewardFragments <= 0) {
    return null
  }

  const claimedMap = { ...(state.seasonLeagueRewardsClaimed ?? {}) }
  if (claimedMap[state.tier] === true) {
    state.seasonLeagueRewardsClaimed = claimedMap
    return null
  }

  claimedMap[state.tier] = true
  state.seasonLeagueRewardsClaimed = claimedMap
  return {
    tier: state.tier,
    fragments: rewardFragments,
  }
}
