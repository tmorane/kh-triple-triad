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

function makeCriticalWinResult(): MatchResult {
  return {
    winner: 'player',
    playerCount: 9,
    cpuCount: 0,
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
    expect(result.rewards.bonusGoldFromCriticalVictory).toBe(0)
    expect(result.rewards.criticalVictory).toBe(false)
    expect(result.rewards.bonusGoldFromAutoDeck).toBe(0)
    expect(result.profile.gold).toBe(100 + 60 + 28)
  })

  test('applies +50% rewards multiplier and tracks extra auto-deck gold', () => {
    const profile = createDefaultProfile()
    const result = applyMatchRewards(profile, makeResult('player'), cpuDeck, 33, 8, 1.5)

    const rawTotal = 60 + 28
    const expectedTotal = Math.floor(rawTotal * 1.5)
    expect(result.rewards.bonusGoldFromCriticalVictory).toBe(0)
    expect(result.rewards.criticalVictory).toBe(false)
    expect(result.rewards.bonusGoldFromAutoDeck).toBe(expectedTotal - rawTotal)
    expect(result.profile.gold).toBe(100 + expectedTotal)
  })

  test('flags critical victory only for 9-0 player wins', () => {
    const critical = applyMatchRewards(createDefaultProfile(), makeCriticalWinResult(), cpuDeck, 88, 8)
    const regular = applyMatchRewards(createDefaultProfile(), makeResult('player'), cpuDeck, 88, 8)
    const draw = applyMatchRewards(createDefaultProfile(), makeResult('draw'), cpuDeck, 88, 8)
    const loss = applyMatchRewards(createDefaultProfile(), makeResult('cpu'), cpuDeck, 88, 8)

    expect(critical.rewards.criticalVictory).toBe(true)
    expect(regular.rewards.criticalVictory).toBe(false)
    expect(draw.rewards.criticalVictory).toBe(false)
    expect(loss.rewards.criticalVictory).toBe(false)
  })

  test('adds +25% critical bonus on base subtotal before auto multiplier', () => {
    const profile = createDefaultProfile()
    const critical = applyMatchRewards(profile, makeCriticalWinResult(), cpuDeck, 91, 8)

    const baseSubtotal = 60 + 28
    const expectedCriticalBonus = Math.floor(baseSubtotal * 0.25)
    const expectedTotal = baseSubtotal + expectedCriticalBonus

    expect(critical.rewards.bonusGoldFromCriticalVictory).toBe(expectedCriticalBonus)
    expect(critical.rewards.bonusGoldFromAutoDeck).toBe(0)
    expect(critical.profile.gold).toBe(100 + expectedTotal)
  })

  test('stacks critical bonus with auto deck multiplier cumulatively', () => {
    const profile = createDefaultProfile()
    const critical = applyMatchRewards(profile, makeCriticalWinResult(), cpuDeck, 93, 8, 1.5)

    const baseSubtotal = 60 + 28
    const criticalBonus = Math.floor(baseSubtotal * 0.25)
    const rawTotal = baseSubtotal + criticalBonus
    const multipliedTotal = Math.floor(rawTotal * 1.5)

    expect(critical.rewards.bonusGoldFromCriticalVictory).toBe(criticalBonus)
    expect(critical.rewards.bonusGoldFromAutoDeck).toBe(multipliedTotal - rawTotal)
    expect(critical.profile.gold).toBe(100 + multipliedTotal)
  })

  test('victory captures the explicitly selected cpu card and adds it to collection', () => {
    const profile = createDefaultProfile()
    const cpuDeckForClaim = ['c71', 'c72', 'c73', 'c74', 'c75']

    const result = applyMatchRewards(profile, makeResult('player'), cpuDeckForClaim, 101, 8, 1, 'c73')

    expect(result.rewards.droppedCardId).toBe('c73')
    expect(result.rewards.duplicateConverted).toBe(false)
    expect(result.rewards.bonusGoldFromDuplicate).toBe(0)
    expect(result.newlyOwnedCards).toEqual(['c73'])
    expect(result.profile.ownedCardIds).toContain('c73')
    expect(result.profile.cardCopiesById.c73).toBe(1)
  })

  test('victory with an already-owned selected card adds one copy without duplicate gold bonus', () => {
    const profile = createDefaultProfile()
    const ownedCardId = profile.ownedCardIds[0]!
    const cpuDeckForClaim = [ownedCardId, 'c71', 'c72', 'c73', 'c74']
    const previousCopies = profile.cardCopiesById[ownedCardId] ?? 0

    const result = applyMatchRewards(profile, makeResult('player'), cpuDeckForClaim, 103, 8, 1, ownedCardId)

    expect(result.rewards.droppedCardId).toBe(ownedCardId)
    expect(result.rewards.duplicateConverted).toBe(false)
    expect(result.rewards.bonusGoldFromDuplicate).toBe(0)
    expect(result.newlyOwnedCards).toEqual([])
    expect(result.profile.cardCopiesById[ownedCardId]).toBe(previousCopies + 1)
  })

  test('draw and loss do not grant a claimed card', () => {
    const profile = createDefaultProfile()

    const draw = applyMatchRewards(profile, makeResult('draw'), cpuDeck, 105, 8)
    const loss = applyMatchRewards(profile, makeResult('cpu'), cpuDeck, 105, 8)

    expect(draw.rewards.droppedCardId).toBeNull()
    expect(draw.rewards.duplicateConverted).toBe(false)
    expect(draw.rewards.bonusGoldFromDuplicate).toBe(0)
    expect(loss.rewards.droppedCardId).toBeNull()
    expect(loss.rewards.duplicateConverted).toBe(false)
    expect(loss.rewards.bonusGoldFromDuplicate).toBe(0)
  })

  test('throws when selected claimed card is not part of cpu deck', () => {
    const profile = createDefaultProfile()

    expect(() => applyMatchRewards(profile, makeResult('player'), cpuDeck, 107, 8, 1, 'c99')).toThrow(
      'Claimed card must belong to the CPU deck.',
    )
  })
})
