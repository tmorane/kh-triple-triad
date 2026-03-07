import { describe, expect, test } from 'bun:test'
import { createEmptyTowerRelicInventory, getTowerRelicDefinition, resolveTowerRelicEffects } from './relics'

describe('tower relic effects', () => {
  test('creates an empty relic inventory with all relic ids initialized', () => {
    const inventory = createEmptyTowerRelicInventory()

    expect(Object.keys(inventory)).toEqual([
      'golden_pass',
      'initiative_core',
      'boss_breaker',
      'stabilizer',
      'deep_pockets',
      'draft_chisel',
      'high_risk_token',
    ])

    for (const value of Object.values(inventory)) {
      expect(value).toBe(0)
    }
  })

  test('caps Golden Pass bonus at +60%', () => {
    const inventory = createEmptyTowerRelicInventory()
    inventory.golden_pass = 10

    const effects = resolveTowerRelicEffects(inventory)
    expect(effects.goldMultiplier).toBeCloseTo(1.6)
  })

  test('high risk token adds gold and enemy score pressure', () => {
    const inventory = createEmptyTowerRelicInventory()
    inventory.high_risk_token = 2

    const effects = resolveTowerRelicEffects(inventory)
    expect(effects.goldMultiplier).toBeCloseTo(1.6)
    expect(effects.scoreBonusModifier).toBe(4)
  })

  test('initiative core forces player to start', () => {
    const inventory = createEmptyTowerRelicInventory()
    expect(resolveTowerRelicEffects(inventory).forcePlayerStart).toBe(false)

    inventory.initiative_core = 1
    expect(resolveTowerRelicEffects(inventory).forcePlayerStart).toBe(true)
  })

  test('boss breaker and stabilizer reduce score bonuses', () => {
    const inventory = createEmptyTowerRelicInventory()
    inventory.boss_breaker = 1
    inventory.stabilizer = 2

    const effects = resolveTowerRelicEffects(inventory)
    expect(effects.bossScoreReduction).toBe(3)
    expect(effects.nonBossScoreReduction).toBe(2)
  })

  test('deep pockets adds one extra checkpoint pack per stack', () => {
    const inventory = createEmptyTowerRelicInventory()
    inventory.deep_pockets = 3

    const effects = resolveTowerRelicEffects(inventory)
    expect(effects.checkpointPackBonus).toBe(3)
  })

  test('draft chisel extends swap offer choice count from 3 to 4', () => {
    const inventory = createEmptyTowerRelicInventory()
    expect(resolveTowerRelicEffects(inventory).swapOfferChoiceCount).toBe(3)

    inventory.draft_chisel = 1
    expect(resolveTowerRelicEffects(inventory).swapOfferChoiceCount).toBe(4)
  })

  test('has stable metadata for relic display copy', () => {
    const relic = getTowerRelicDefinition('golden_pass')
    expect(relic.id).toBe('golden_pass')
    expect(relic.title.length).toBeGreaterThan(0)
    expect(relic.description.length).toBeGreaterThan(0)
  })
})
