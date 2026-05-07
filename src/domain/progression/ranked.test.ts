import { describe, expect, test } from 'bun:test'
import { applyRankedMatchResult, createInitialRankedState, type RankedMatchResultSummary } from './ranked'

function applySequence(outcomes: Array<'player' | 'cpu' | 'draw'>): RankedMatchResultSummary {
  let state = createInitialRankedState()
  let summary = applyRankedMatchResult(state, 'draw')
  state = summary.next

  for (const winner of outcomes) {
    summary = applyRankedMatchResult(state, winner)
    state = summary.next
  }

  return summary
}

describe('ranked ladder progression', () => {
  test('starts at Iron with empty score and no streak', () => {
    const state = createInitialRankedState()

    expect(state.tier).toBe('iron')
    expect(state.division).toBe('IV')
    expect(state.lp).toBe(0)
    expect(state.matchesPlayed).toBe(0)
    expect(state.wins).toBe(0)
    expect(state.losses).toBe(0)
    expect(state.draws).toBe(0)
    expect(state.resultStreak).toEqual({ type: 'none', count: 0 })
    expect(state.demotionShieldLosses).toBe(0)
  })

  test('applies +30..+35 on win streak and resets to +30 after a loss', () => {
    const first = applySequence(['player'])
    expect(first.deltaLp).toBe(30)
    expect(first.next.lp).toBe(30)

    const second = applySequence(['player', 'player'])
    expect(second.deltaLp).toBe(31)
    expect(second.next.lp).toBe(61)

    const third = applySequence(['player', 'player', 'player', 'cpu', 'player'])
    expect(third.deltaLp).toBe(30)
  })

  test('applies -15..-20 on loss streak and resets to -15 after a win', () => {
    const initial = {
      ...createInitialRankedState(),
      tier: 'bronze' as const,
      division: 'IV' as const,
      lp: 90,
      demotionShieldLosses: 0,
      resultStreak: { type: 'none' as const, count: 0 },
    }

    const first = applyRankedMatchResult(initial, 'cpu')
    expect(first.deltaLp).toBe(-15)
    expect(first.next.lp).toBe(75)

    const second = applyRankedMatchResult(first.next, 'cpu')
    expect(second.deltaLp).toBe(-16)
    expect(second.next.lp).toBe(59)

    const third = applyRankedMatchResult(second.next, 'player')
    expect(third.deltaLp).toBe(30)

    const fourth = applyRankedMatchResult(third.next, 'cpu')
    expect(fourth.deltaLp).toBe(-15)
  })

  test('starts a promotion BO3 at 100 points without immediate promotion', () => {
    const initial = {
      ...createInitialRankedState(),
      tier: 'bronze' as const,
      division: 'IV' as const,
      lp: 95,
      resultStreak: { type: 'none' as const, count: 0 },
    } as const

    const result = applyRankedMatchResult(initial, 'player')

    expect(result.deltaLp).toBe(30)
    expect(result.promoted).toBe(false)
    expect(result.next.tier).toBe('bronze')
    expect(result.next.lp).toBe(100)
    expect((result.next as { promotionSeries?: { wins: number; losses: number } | null }).promotionSeries).toEqual({
      wins: 0,
      losses: 0,
    })
  })

  test('promotion BO3 promotes on 2 wins and does not change points during series matches', () => {
    const initial = {
      ...createInitialRankedState(),
      tier: 'silver' as const,
      division: 'IV' as const,
      lp: 100,
      resultStreak: { type: 'none' as const, count: 0 },
      demotionShieldLosses: 2,
      promotionSeries: { wins: 0, losses: 0 },
    } as const

    const first = applyRankedMatchResult(initial, 'player')
    expect(first.deltaLp).toBe(0)
    expect(first.promoted).toBe(false)
    expect(first.next.lp).toBe(100)
    expect((first.next as { promotionSeries?: { wins: number; losses: number } | null }).promotionSeries).toEqual({
      wins: 1,
      losses: 0,
    })

    const second = applyRankedMatchResult(first.next, 'player')
    expect(second.deltaLp).toBe(0)
    expect(second.promoted).toBe(true)
    expect(second.next.tier).toBe('gold')
    expect(second.next.lp).toBe(20)
    expect(second.next.demotionShieldLosses).toBe(0)
    expect((second.next as { promotionSeries?: { wins: number; losses: number } | null }).promotionSeries).toBe(null)
  })

  test('promotion BO3 failure returns to 80 points in same league', () => {
    const initial = {
      ...createInitialRankedState(),
      tier: 'gold' as const,
      division: 'IV' as const,
      lp: 100,
      demotionShieldLosses: 0,
      resultStreak: { type: 'none' as const, count: 0 },
      promotionSeries: { wins: 1, losses: 1 },
    } as const

    const result = applyRankedMatchResult(initial, 'cpu')

    expect(result.deltaLp).toBe(0)
    expect(result.promoted).toBe(false)
    expect(result.next.tier).toBe('gold')
    expect(result.next.lp).toBe(80)
    expect((result.next as { promotionSeries?: { wins: number; losses: number } | null }).promotionSeries).toBe(null)
  })

  test('at 0 points, consumes two shields then demotes on third loss', () => {
    const initial = {
      ...createInitialRankedState(),
      tier: 'silver' as const,
      division: 'IV' as const,
      lp: 0,
      demotionShieldLosses: 0,
      resultStreak: { type: 'none' as const, count: 0 },
    } as const

    const first = applyRankedMatchResult(initial, 'cpu')
    expect(first.demoted).toBe(false)
    expect(first.next.lp).toBe(0)
    expect(first.next.demotionShieldLosses).toBe(1)

    const second = applyRankedMatchResult(first.next, 'cpu')
    expect(second.demoted).toBe(false)
    expect(second.next.lp).toBe(0)
    expect(second.next.demotionShieldLosses).toBe(2)

    const third = applyRankedMatchResult(second.next, 'cpu')
    expect(third.demoted).toBe(true)
    expect(third.next.tier).toBe('bronze')
    expect(third.next.lp).toBe(80)
    expect(third.next.demotionShieldLosses).toBe(0)
  })

  test('challenger never demotes even at 0 with repeated losses', () => {
    const initial = {
      ...createInitialRankedState(),
      tier: 'challenger' as const,
      division: null,
      lp: 0,
      demotionShieldLosses: 2,
      resultStreak: { type: 'loss' as const, count: 2 },
    } as const

    const result = applyRankedMatchResult(initial, 'cpu')

    expect(result.demoted).toBe(false)
    expect(result.next.tier).toBe('challenger')
    expect(result.next.division).toBe(null)
    expect(result.next.lp).toBe(0)
  })

  test('grants league passage reward once per league per season', () => {
    const initial = {
      ...createInitialRankedState(),
      tier: 'gold' as const,
      division: 'IV' as const,
      lp: 100,
      promotionSeries: { wins: 1, losses: 0 },
      seasonId: '2026-03',
      seasonLeagueRewardsClaimed: {},
    } as const

    const firstPromotion = applyRankedMatchResult(initial, 'player', { now: new Date('2026-03-09T10:00:00.000Z') })

    expect(firstPromotion.promoted).toBe(true)
    expect(firstPromotion.next.tier).toBe('platinum')
    expect(firstPromotion.awardedLeagueReward).toEqual({ tier: 'platinum', fragments: 30 })
    expect(firstPromotion.next.seasonLeagueRewardsClaimed?.platinum).toBe(true)

    const repeatPromotionState = {
      ...createInitialRankedState(),
      tier: 'gold' as const,
      division: 'IV' as const,
      lp: 100,
      promotionSeries: { wins: 1, losses: 0 },
      seasonId: '2026-03',
      seasonLeagueRewardsClaimed: { platinum: true },
    }

    const repeatPromotion = applyRankedMatchResult(repeatPromotionState, 'player', { now: new Date('2026-03-20T10:00:00.000Z') })

    expect(repeatPromotion.promoted).toBe(true)
    expect(repeatPromotion.awardedLeagueReward).toBe(null)
  })

  test('resets ranked state when season changes with a -2 leagues demotion', () => {
    const initial = {
      ...createInitialRankedState(),
      tier: 'diamond' as const,
      division: 'IV' as const,
      lp: 67,
      demotionShieldLosses: 2,
      resultStreak: { type: 'win' as const, count: 4 },
      promotionSeries: { wins: 1, losses: 0 },
      seasonId: '2026-01',
      seasonLeagueRewardsClaimed: { bronze: true, silver: true, gold: true, platinum: true, diamond: true },
    } as const

    const result = applyRankedMatchResult(initial, 'draw', { now: new Date('2026-03-09T10:00:00.000Z') })

    expect(result.seasonReset).toBe(true)
    expect(result.next.tier).toBe('gold')
    expect(result.next.division).toBe('IV')
    expect(result.next.lp).toBe(0)
    expect(result.next.demotionShieldLosses).toBe(0)
    expect(result.next.resultStreak).toEqual({ type: 'none', count: 0 })
    expect(result.next.promotionSeries).toBe(null)
    expect(result.next.seasonId).toBe('2026-03')
    expect(result.next.seasonLeagueRewardsClaimed).toEqual({})
  })
})
