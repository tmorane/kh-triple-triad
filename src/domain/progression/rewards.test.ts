import { describe, expect, test } from 'vitest'
import type { OpponentLevel } from '../match/opponents'
import type { MatchResult } from '../types'
import { createDefaultProfile } from './profile'
import { applyMatchRewards } from './rewards'

const cpuDeck = ['c41', 'c42', 'c43', 'c44', 'c45']

function makeResult(winner: MatchResult['winner']): MatchResult {
  return {
    winner,
    playerCount: winner === 'player' ? 6 : winner === 'cpu' ? 3 : 5,
    cpuCount: winner === 'player' ? 3 : winner === 'cpu' ? 6 : 5,
    turns: 9,
    rules: { open: true, same: false, plus: false },
  }
}

describe('match rewards difficulty bonus', () => {
  test('adds difficulty bonus only on victory', () => {
    const profile = createDefaultProfile()

    const win = applyMatchRewards(profile, makeResult('player'), cpuDeck, 19, 8)
    const loss = applyMatchRewards(profile, makeResult('cpu'), cpuDeck, 19, 8)
    const draw = applyMatchRewards(profile, makeResult('draw'), cpuDeck, 19, 8)

    expect(win.rewards.bonusGoldFromDifficulty).toBe(28)
    expect(loss.rewards.bonusGoldFromDifficulty).toBe(0)
    expect(draw.rewards.bonusGoldFromDifficulty).toBe(0)
  })

  test('scales by +4 per level from L1 to L8', () => {
    const bonuses: number[] = []

    for (let level = 1 as OpponentLevel; level <= 8; level = (level + 1) as OpponentLevel) {
      const profile = createDefaultProfile()
      const rewards = applyMatchRewards(profile, makeResult('player'), cpuDeck, 77, level).rewards
      bonuses.push(rewards.bonusGoldFromDifficulty)
    }

    expect(bonuses).toEqual([0, 4, 8, 12, 16, 20, 24, 28])
  })

  test('applies base + duplicate + difficulty to profile gold total when winning', () => {
    const profile = createDefaultProfile()
    const result = applyMatchRewards(profile, makeResult('player'), cpuDeck, 21, 8)

    expect(result.rewards.goldAwarded).toBe(60)
    expect(result.rewards.bonusGoldFromDuplicate).toBe(0)
    expect(result.rewards.bonusGoldFromDifficulty).toBe(28)
    expect(result.rewards.bonusGoldFromAutoDeck).toBe(0)
    expect(result.profile.gold).toBe(100 + 60 + 28)
  })

  test('applies +50% rewards multiplier and tracks extra auto-deck gold', () => {
    const profile = createDefaultProfile()
    const result = applyMatchRewards(profile, makeResult('player'), cpuDeck, 33, 8, 1.5)

    const rawTotal = 60 + 28
    const expectedTotal = Math.floor(rawTotal * 1.5)
    expect(result.rewards.bonusGoldFromAutoDeck).toBe(expectedTotal - rawTotal)
    expect(result.profile.gold).toBe(100 + expectedTotal)
  })
})
