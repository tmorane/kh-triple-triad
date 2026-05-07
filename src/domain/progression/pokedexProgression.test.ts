import { describe, expect, test } from 'bun:test'
import { cardPool } from '../cards/cardPool'
import { createDefaultProfile } from './profile'
import {
  applyTrackedPokemonMatchResult,
  createInitialTrackedPokemonState,
  getPokedexClaimSelectionCount,
  setTrackedPokemonTarget,
} from './pokedexProgression'

describe('pokedex claim milestones', () => {
  test('scales fragment claim selections at 50%, 75%, and 100% completion', () => {
    const profile = createDefaultProfile()
    const totalCards = cardPool.length

    expect(getPokedexClaimSelectionCount(profile, 5)).toBe(1)

    profile.ownedCardIds = cardPool.slice(0, Math.ceil(totalCards * 0.5)).map((card) => card.id)
    expect(getPokedexClaimSelectionCount(profile, 5)).toBe(2)

    profile.ownedCardIds = cardPool.slice(0, Math.ceil(totalCards * 0.75)).map((card) => card.id)
    expect(getPokedexClaimSelectionCount(profile, 5)).toBe(3)

    profile.ownedCardIds = cardPool.map((card) => card.id)
    expect(getPokedexClaimSelectionCount(profile, 5)).toBe(5)
    expect(getPokedexClaimSelectionCount(profile, 8)).toBe(8)
  })
})

describe('tracked pokemon progression', () => {
  test('starts with empty tracked target and no gauge progress', () => {
    expect(createInitialTrackedPokemonState()).toEqual({
      targetCardId: null,
      gaugePoints: 0,
      completedGaugesInWindow: 0,
      windowStartedAt: null,
    })
  })

  test('does not progress on defeat and does not progress without target', () => {
    const now = new Date('2026-03-09T10:00:00.000Z')
    const noTarget = createInitialTrackedPokemonState()

    const noTargetUpdate = applyTrackedPokemonMatchResult(noTarget, 'player', now)
    expect(noTargetUpdate.gainedGaugePoints).toBe(0)
    expect(noTargetUpdate.fragmentsGranted).toBe(0)
    expect(noTargetUpdate.next).toEqual(noTarget)

    const tracked = setTrackedPokemonTarget(noTarget, 'c25')
    const defeatUpdate = applyTrackedPokemonMatchResult(tracked, 'cpu', now)
    expect(defeatUpdate.gainedGaugePoints).toBe(0)
    expect(defeatUpdate.fragmentsGranted).toBe(0)
    expect(defeatUpdate.next.gaugePoints).toBe(0)
  })

  test('grants +20 per win and +1 fragment each time gauge reaches 100', () => {
    const now = new Date('2026-03-09T10:00:00.000Z')
    let tracked = setTrackedPokemonTarget(createInitialTrackedPokemonState(), 'c25')

    for (let index = 0; index < 4; index += 1) {
      tracked = applyTrackedPokemonMatchResult(tracked, 'player', new Date(now.getTime() + index * 1000)).next
    }

    expect(tracked.gaugePoints).toBe(80)
    expect(tracked.completedGaugesInWindow).toBe(0)

    const completionUpdate = applyTrackedPokemonMatchResult(tracked, 'player', new Date(now.getTime() + 5_000))
    expect(completionUpdate.gainedGaugePoints).toBe(20)
    expect(completionUpdate.fragmentsGranted).toBe(1)
    expect(completionUpdate.next.targetCardId).toBe('c25')
    expect(completionUpdate.next.gaugePoints).toBe(0)
    expect(completionUpdate.next.completedGaugesInWindow).toBe(1)
  })

  test('enforces cap at 10 filled gauges per 12h and resets the cap after window rollover', () => {
    const start = new Date('2026-03-09T10:00:00.000Z')
    const almostCapped = {
      targetCardId: 'c25',
      gaugePoints: 80,
      completedGaugesInWindow: 9,
      windowStartedAt: start.toISOString(),
    } as const

    const cappedByWin = applyTrackedPokemonMatchResult(almostCapped, 'player', new Date(start.getTime() + 1_000))
    expect(cappedByWin.fragmentsGranted).toBe(1)
    expect(cappedByWin.next.completedGaugesInWindow).toBe(10)
    expect(cappedByWin.next.gaugePoints).toBe(0)

    const blocked = applyTrackedPokemonMatchResult(cappedByWin.next, 'player', new Date(start.getTime() + 2_000))
    expect(blocked.capReached).toBe(true)
    expect(blocked.gainedGaugePoints).toBe(0)
    expect(blocked.fragmentsGranted).toBe(0)
    expect(blocked.next.gaugePoints).toBe(0)
    expect(blocked.next.completedGaugesInWindow).toBe(10)

    const reset = applyTrackedPokemonMatchResult(
      blocked.next,
      'player',
      new Date(start.getTime() + 12 * 60 * 60 * 1_000 + 1_000),
    )
    expect(reset.windowReset).toBe(true)
    expect(reset.capReached).toBe(false)
    expect(reset.gainedGaugePoints).toBe(20)
    expect(reset.fragmentsGranted).toBe(0)
    expect(reset.next.completedGaugesInWindow).toBe(0)
    expect(reset.next.gaugePoints).toBe(20)
  })

  test('can switch tracked pokemon target at any time', () => {
    const state = {
      targetCardId: 'c25',
      gaugePoints: 60,
      completedGaugesInWindow: 3,
      windowStartedAt: '2026-03-09T10:00:00.000Z',
    } as const

    const updated = setTrackedPokemonTarget(state, 'c30')
    expect(updated.targetCardId).toBe('c30')
    expect(updated.gaugePoints).toBe(60)
    expect(updated.completedGaugesInWindow).toBe(3)
    expect(updated.windowStartedAt).toBe('2026-03-09T10:00:00.000Z')
  })
})
