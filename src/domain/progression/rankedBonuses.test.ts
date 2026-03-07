import { describe, expect, test } from 'bun:test'
import { getRankedDeckScoreBonus, getRankedWinLpBonus } from './rankedBonuses'

describe('ranked bonuses', () => {
  test('returns expected deck score bonus for every division tier', () => {
    expect(getRankedDeckScoreBonus('iron', 'IV')).toBe(0)
    expect(getRankedDeckScoreBonus('bronze', 'III')).toBe(2)
    expect(getRankedDeckScoreBonus('silver', 'II')).toBe(4)
    expect(getRankedDeckScoreBonus('gold', 'I')).toBe(6)
    expect(getRankedDeckScoreBonus('platinum', 'IV')).toBe(0)
    expect(getRankedDeckScoreBonus('diamond', 'II')).toBe(4)
    expect(getRankedDeckScoreBonus('diamond', 'I')).toBe(6)
  })

  test('returns expected deck score bonus for apex tier', () => {
    expect(getRankedDeckScoreBonus('challenger', null)).toBe(6)
  })

  test('returns expected LP win bonus for every division tier', () => {
    expect(getRankedWinLpBonus('iron', 'IV')).toBe(0)
    expect(getRankedWinLpBonus('bronze', 'III')).toBe(1)
    expect(getRankedWinLpBonus('silver', 'II')).toBe(2)
    expect(getRankedWinLpBonus('gold', 'I')).toBe(3)
    expect(getRankedWinLpBonus('platinum', 'IV')).toBe(0)
    expect(getRankedWinLpBonus('diamond', 'II')).toBe(2)
    expect(getRankedWinLpBonus('diamond', 'I')).toBe(3)
  })

  test('returns expected LP win bonus for apex tier', () => {
    expect(getRankedWinLpBonus('challenger', null)).toBe(2)
  })
})
