import { describe, expect, test } from 'vitest'
import { isTowerBossFloor, resolveTowerFloorSpec, resolveTowerOpponentLevel } from './floorPlan'

describe('tower floor plan', () => {
  test('marks boss floors every 10 levels', () => {
    expect(isTowerBossFloor(1)).toBe(false)
    expect(isTowerBossFloor(9)).toBe(false)
    expect(isTowerBossFloor(10)).toBe(true)
    expect(isTowerBossFloor(100)).toBe(true)
  })

  test('uses non-boss rules in deterministic 3-floor cycles', () => {
    expect(resolveTowerFloorSpec(1).rules).toEqual({ open: true, same: false, plus: false })
    expect(resolveTowerFloorSpec(3).rules).toEqual({ open: true, same: false, plus: false })

    expect(resolveTowerFloorSpec(4).rules).toEqual({ open: true, same: true, plus: false })
    expect(resolveTowerFloorSpec(6).rules).toEqual({ open: true, same: true, plus: false })

    expect(resolveTowerFloorSpec(7).rules).toEqual({ open: true, same: false, plus: true })
    expect(resolveTowerFloorSpec(9).rules).toEqual({ open: true, same: false, plus: true })
  })

  test('uses boss rule sets by floor bracket', () => {
    expect(resolveTowerFloorSpec(10).rules).toEqual({ open: true, same: true, plus: false })
    expect(resolveTowerFloorSpec(20).rules).toEqual({ open: true, same: true, plus: false })

    expect(resolveTowerFloorSpec(30).rules).toEqual({ open: true, same: false, plus: true })
    expect(resolveTowerFloorSpec(50).rules).toEqual({ open: true, same: false, plus: true })

    expect(resolveTowerFloorSpec(60).rules).toEqual({ open: true, same: true, plus: true })
    expect(resolveTowerFloorSpec(100).rules).toEqual({ open: true, same: true, plus: true })
  })

  test('applies score bonus spikes on bosses (+5 then +10)', () => {
    expect(resolveTowerFloorSpec(10).scoreBonus).toBeGreaterThanOrEqual(5)
    expect(resolveTowerFloorSpec(50).scoreBonus).toBeGreaterThanOrEqual(5)
    expect(resolveTowerFloorSpec(60).scoreBonus).toBeGreaterThanOrEqual(10)
    expect(resolveTowerFloorSpec(100).scoreBonus).toBeGreaterThanOrEqual(10)
  })

  test('scales reward multiplier from 1.0 to 1.5 over 100 floors', () => {
    const start = resolveTowerFloorSpec(1).rewardMultiplier
    const middle = resolveTowerFloorSpec(50).rewardMultiplier
    const end = resolveTowerFloorSpec(100).rewardMultiplier

    expect(start).toBe(1)
    expect(middle).toBeGreaterThan(start)
    expect(end).toBe(1.5)
  })

  test('scales tower opponent level from 1 to 8 across floors', () => {
    expect(resolveTowerOpponentLevel(1)).toBe(1)
    expect(resolveTowerOpponentLevel(12)).toBe(1)
    expect(resolveTowerOpponentLevel(13)).toBe(2)
    expect(resolveTowerOpponentLevel(48)).toBe(4)
    expect(resolveTowerOpponentLevel(100)).toBe(8)
  })
})
