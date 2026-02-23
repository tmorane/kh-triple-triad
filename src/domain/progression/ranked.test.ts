import { describe, expect, test } from 'vitest'
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
  test('starts at Iron IV 0 LP with empty record', () => {
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

  test('applies adaptive LP on win streak (+20, +25, +30 cap)', () => {
    const first = applySequence(['player'])
    expect(first.deltaLp).toBe(20)
    expect(first.next.lp).toBe(20)

    const second = applySequence(['player', 'player'])
    expect(second.deltaLp).toBe(25)
    expect(second.next.lp).toBe(45)

    const third = applySequence(['player', 'player', 'player'])
    expect(third.deltaLp).toBe(30)
    expect(third.next.lp).toBe(75)
  })

  test('promotes automatically at 100 LP and carries overflow', () => {
    const result = applySequence(['player', 'player', 'player', 'player'])

    expect(result.promoted).toBe(true)
    expect(result.next.tier).toBe('iron')
    expect(result.next.division).toBe('III')
    expect(result.next.lp).toBe(5)
    expect(result.next.demotionShieldLosses).toBe(3)
  })

  test('applies adaptive LP on loss streak (-20, -25, -30 cap)', () => {
    const state = {
      ...createInitialRankedState(),
      tier: 'iron' as const,
      division: 'III' as const,
      lp: 50,
      demotionShieldLosses: 0,
      resultStreak: { type: 'none' as const, count: 0 },
    }

    const first = applyRankedMatchResult(state, 'cpu')
    expect(first.deltaLp).toBe(-20)
    expect(first.next.lp).toBe(30)

    const second = applyRankedMatchResult(first.next, 'cpu')
    expect(second.deltaLp).toBe(-25)
    expect(second.next.lp).toBe(5)

    const third = applyRankedMatchResult(second.next, 'cpu')
    expect(third.deltaLp).toBe(-30)
    expect(third.demoted).toBe(true)
    expect(third.next.tier).toBe('iron')
    expect(third.next.division).toBe('IV')
    expect(third.next.lp).toBe(75)
  })

  test('consumes demotion shield before allowing a demotion', () => {
    const state = {
      ...createInitialRankedState(),
      tier: 'iron' as const,
      division: 'III' as const,
      lp: 5,
      demotionShieldLosses: 2,
      resultStreak: { type: 'none' as const, count: 0 },
    }

    const result = applyRankedMatchResult(state, 'cpu')

    expect(result.demoted).toBe(false)
    expect(result.next.tier).toBe('iron')
    expect(result.next.division).toBe('III')
    expect(result.next.lp).toBe(0)
    expect(result.next.demotionShieldLosses).toBe(1)
  })

  test('never demotes below Iron IV and never goes negative LP', () => {
    const state = {
      ...createInitialRankedState(),
      lp: 0,
      demotionShieldLosses: 0,
      resultStreak: { type: 'loss' as const, count: 2 },
    }

    const result = applyRankedMatchResult(state, 'cpu')

    expect(result.demoted).toBe(false)
    expect(result.next.tier).toBe('iron')
    expect(result.next.division).toBe('IV')
    expect(result.next.lp).toBe(0)
  })

  test('draw gives 0 LP and resets streak without promotion/demotion', () => {
    const state = {
      ...createInitialRankedState(),
      tier: 'gold' as const,
      division: 'II' as const,
      lp: 67,
      resultStreak: { type: 'win' as const, count: 4 },
      wins: 12,
      losses: 9,
      draws: 1,
      matchesPlayed: 22,
    }

    const result = applyRankedMatchResult(state, 'draw')

    expect(result.deltaLp).toBe(0)
    expect(result.promoted).toBe(false)
    expect(result.demoted).toBe(false)
    expect(result.next.tier).toBe('gold')
    expect(result.next.division).toBe('II')
    expect(result.next.lp).toBe(67)
    expect(result.next.resultStreak).toEqual({ type: 'none', count: 0 })
    expect(result.next.draws).toBe(2)
    expect(result.next.matchesPlayed).toBe(23)
  })

  test('master+ tiers have no divisions and can promote with carry', () => {
    const state = {
      ...createInitialRankedState(),
      tier: 'master' as const,
      division: null,
      lp: 90,
      resultStreak: { type: 'win' as const, count: 2 },
      demotionShieldLosses: 0,
    }

    const result = applyRankedMatchResult(state, 'player')

    expect(result.deltaLp).toBe(30)
    expect(result.promoted).toBe(true)
    expect(result.next.tier).toBe('grandmaster')
    expect(result.next.division).toBe(null)
    expect(result.next.lp).toBe(20)
    expect(result.next.demotionShieldLosses).toBe(3)
  })

  test('can demote from master to Diamond I when shield is depleted', () => {
    const state = {
      ...createInitialRankedState(),
      tier: 'master' as const,
      division: null,
      lp: 5,
      resultStreak: { type: 'loss' as const, count: 2 },
      demotionShieldLosses: 0,
    }

    const result = applyRankedMatchResult(state, 'cpu')

    expect(result.demoted).toBe(true)
    expect(result.next.tier).toBe('diamond')
    expect(result.next.division).toBe('I')
    expect(result.next.lp).toBe(75)
  })

  test('caps LP at Challenger instead of overflowing beyond top tier', () => {
    const state = {
      ...createInitialRankedState(),
      tier: 'challenger' as const,
      division: null,
      lp: 95,
      resultStreak: { type: 'win' as const, count: 2 },
    }

    const result = applyRankedMatchResult(state, 'player')

    expect(result.promoted).toBe(false)
    expect(result.next.tier).toBe('challenger')
    expect(result.next.division).toBe(null)
    expect(result.next.lp).toBe(99)
  })
})
