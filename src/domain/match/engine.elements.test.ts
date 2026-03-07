import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { __setCardPoolOverrideForTests } from '../cards/cardPool'
import { selectCpuMove } from './ai'
import { applyMove, applyMoveDetailed, createMatch, resolveDisplaySides } from './engine'
import type { MatchConfig, Move } from '../types'

beforeAll(() => {
  const cardById = {
      p_normal: {
        id: 'p_normal',
        name: 'Normal Unit',
        top: 2,
        right: 2,
        bottom: 2,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'normal',
      },
      p_normal_2: {
        id: 'p_normal_2',
        name: 'Normal Unit 2',
        top: 2,
        right: 2,
        bottom: 3,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'normal',
      },
      p_normal_3: {
        id: 'p_normal_3',
        name: 'Normal Unit 3',
        top: 3,
        right: 2,
        bottom: 2,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'normal',
      },
      p_normal_4: {
        id: 'p_normal_4',
        name: 'Normal Unit 4',
        top: 2,
        right: 3,
        bottom: 2,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'normal',
      },
      p_normal_5: {
        id: 'p_normal_5',
        name: 'Normal Unit 5',
        top: 2,
        right: 2,
        bottom: 2,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'normal',
      },
      p_fire: {
        id: 'p_fire',
        name: 'Fire Unit',
        top: 4,
        right: 6,
        bottom: 4,
        left: 4,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'feu',
      },
      p_water: {
        id: 'p_water',
        name: 'Water Unit',
        top: 4,
        right: 4,
        bottom: 4,
        left: 4,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'eau',
      },
      p_ice: {
        id: 'p_ice',
        name: 'Ice Unit',
        top: 3,
        right: 3,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'glace',
      },
      p_electric: {
        id: 'p_electric',
        name: 'Electric Unit',
        top: 2,
        right: 2,
        bottom: 2,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'electrik',
      },
      p_fight: {
        id: 'p_fight',
        name: 'Fight Unit',
        top: 3,
        right: 4,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'combat',
      },
      p_poison: {
        id: 'p_poison',
        name: 'Poison Unit',
        top: 3,
        right: 3,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'poison',
      },
      p_ground: {
        id: 'p_ground',
        name: 'Ground Unit',
        top: 3,
        right: 4,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'sol',
      },
      p_flying: {
        id: 'p_flying',
        name: 'Flying Unit',
        top: 3,
        right: 5,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'vol',
      },
      p_psy: {
        id: 'p_psy',
        name: 'Psy Unit',
        top: 3,
        right: 3,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'psy',
      },
      p_bug_a: {
        id: 'p_bug_a',
        name: 'Bug Unit A',
        top: 3,
        right: 2,
        bottom: 3,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'insecte',
      },
      p_bug_b: {
        id: 'p_bug_b',
        name: 'Bug Unit B',
        top: 3,
        right: 3,
        bottom: 3,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'insecte',
      },
      p_bug_c: {
        id: 'p_bug_c',
        name: 'Bug Unit C',
        top: 3,
        right: 2,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'insecte',
      },
      p_bug_d: {
        id: 'p_bug_d',
        name: 'Bug Unit D',
        top: 2,
        right: 3,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'insecte',
      },
      p_rock: {
        id: 'p_rock',
        name: 'Rock Unit',
        top: 3,
        right: 3,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'roche',
      },
      p_rock_2: {
        id: 'p_rock_2',
        name: 'Rock Unit 2',
        top: 3,
        right: 3,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'roche',
      },
      p_dragon: {
        id: 'p_dragon',
        name: 'Dragon Unit',
        top: 5,
        right: 3,
        bottom: 3,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'dragon',
      },
      p_grass: {
        id: 'p_grass',
        name: 'Grass Unit',
        top: 3,
        right: 3,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'plante',
      },
      p_grass_2: {
        id: 'p_grass_2',
        name: 'Grass Unit 2',
        top: 3,
        right: 3,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'plante',
      },
      p_ghost: {
        id: 'p_ghost',
        name: 'Ghost Unit',
        top: 3,
        right: 4,
        bottom: 3,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'spectre',
      },
      c_guard: {
        id: 'c_guard',
        name: 'CPU Guard',
        top: 3,
        right: 3,
        bottom: 6,
        left: 5,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'sol',
      },
      c_fill_1: {
        id: 'c_fill_1',
        name: 'CPU Fill 1',
        top: 1,
        right: 1,
        bottom: 1,
        left: 1,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'sol',
      },
      c_fill_2: {
        id: 'c_fill_2',
        name: 'CPU Fill 2',
        top: 1,
        right: 1,
        bottom: 1,
        left: 1,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'vol',
      },
      c_fill_3: {
        id: 'c_fill_3',
        name: 'CPU Fill 3',
        top: 1,
        right: 1,
        bottom: 1,
        left: 1,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'psy',
      },
      c_fill_4: {
        id: 'c_fill_4',
        name: 'CPU Fill 4',
        top: 1,
        right: 1,
        bottom: 1,
        left: 1,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'dragon',
      },
      c_attacker: {
        id: 'c_attacker',
        name: 'CPU Attacker',
        top: 1,
        right: 1,
        bottom: 1,
        left: 5,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'fee',
      },
      c_attacker_2: {
        id: 'c_attacker_2',
        name: 'CPU Attacker 2',
        top: 1,
        right: 5,
        bottom: 1,
        left: 1,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'fee',
      },
      c_ghost: {
        id: 'c_ghost',
        name: 'CPU Ghost',
        top: 2,
        right: 2,
        bottom: 2,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'spectre',
      },
      c_mid_3: {
        id: 'c_mid_3',
        name: 'CPU Mid 3',
        top: 1,
        right: 1,
        bottom: 1,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'fee',
      },
      c_mid_4: {
        id: 'c_mid_4',
        name: 'CPU Mid 4',
        top: 1,
        right: 1,
        bottom: 1,
        left: 4,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'fee',
      },
      c_swap_target: {
        id: 'c_swap_target',
        name: 'CPU Swap Target',
        top: 6,
        right: 1,
        bottom: 4,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'fee',
      },
  } as const

  __setCardPoolOverrideForTests(Object.values(cardById))
})

afterAll(() => {
  __setCardPoolOverrideForTests(null)
})

function makeConfig(overrides?: Partial<MatchConfig>): MatchConfig {
  return {
    playerDeck: ['p_fire', 'p_water', 'p_grass', 'p_ghost', 'p_normal'],
    cpuDeck: ['c_guard', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
    mode: '3x3',
    rules: { open: true, same: true, plus: true },
    seed: 99,
    enableElementPowers: true,
    strictPowerTargeting: true,
    ...overrides,
  }
}

function play(state: ReturnType<typeof createMatch>, moves: Move[]) {
  return moves.reduce((nextState, move) => applyMove(nextState, move), state)
}

describe('match engine element powers', () => {
  test('normal mode is selected at match start when a deck contains at least five normal cards', () => {
    const state = createMatch(
      makeConfig({
        playerDeck: ['p_normal', 'p_normal_2', 'p_normal_3', 'p_normal_4', 'p_normal_5'],
      }),
    )

    expect(state.rules.same).toBe(false)
    expect(state.rules.plus).toBe(false)
  })

  test('single normal card does not force normal mode', () => {
    const state = createMatch(makeConfig())

    expect(state.rules.same).toBe(false)
    expect(state.rules.plus).toBe(false)
  })

  test('normal mode disables element targeting requirements', () => {
    const state = createMatch(
      makeConfig({
        playerDeck: ['p_fire', 'p_grass', 'p_water', 'p_ghost', 'p_ice'],
        cpuDeck: ['p_normal', 'p_normal_2', 'p_normal_3', 'p_normal_4', 'p_normal_5'],
      }),
    )

    const afterPlayer = applyMove(state, { actor: 'player', cardId: 'p_grass', cell: 8 })
    const afterCpu = applyMove(afterPlayer, { actor: 'cpu', cardId: 'p_normal', cell: 1 })

    expect(() =>
      applyMove(afterCpu, {
        actor: 'player',
        cardId: 'p_fire',
        cell: 4,
      }),
    ).not.toThrow()
  })

  test('strict manual targeting rejects move when fire power target is missing', () => {
    const state = createMatch(
      makeConfig({
        playerDeck: ['p_fire', 'p_water', 'p_grass', 'p_ghost', 'c_fill_1'],
        cpuDeck: ['c_guard', 'c_fill_2', 'c_fill_3', 'c_fill_4', 'p_water'],
      }),
    )

    const afterCpu = applyMove(state, { actor: 'player', cardId: 'p_grass', cell: 8 })
    const afterPlayer = applyMove(afterCpu, { actor: 'cpu', cardId: 'c_guard', cell: 1 })

    expect(() =>
      applyMove(afterPlayer, {
        actor: 'player',
        cardId: 'p_fire',
        cell: 4,
      }),
    ).toThrow('Power target is required for feu.')
  })

  test('fire burn applies one permanent all-stat debuff on target owner turn', () => {
    const state = createMatch(
      makeConfig({
        playerDeck: ['p_fire', 'p_water', 'p_grass', 'p_ghost', 'c_fill_1'],
        cpuDeck: ['c_guard', 'c_fill_2', 'c_fill_3', 'c_fill_4', 'p_water'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 8 },
      { actor: 'cpu', cardId: 'c_guard', cell: 1 },
      { actor: 'player', cardId: 'p_fire', cell: 4, powerTarget: { targetCardCell: 1 } },
      { actor: 'cpu', cardId: 'c_fill_2', cell: 0 },
      { actor: 'player', cardId: 'p_water', cell: 7, powerTarget: { targetCell: 6 } },
      { actor: 'cpu', cardId: 'c_fill_3', cell: 5 },
    ])

    expect(result.board[1]?.owner).toBe('cpu')

    const afterBurnResolve = applyMove(result, { actor: 'player', cardId: 'p_ghost', cell: 2 })

    expect(afterBurnResolve.board[1]?.owner).toBe('player')
  })

  test('glace blocks targeted cell for the next targeted actor turn', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ice', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4', 'c_guard'],
      }),
    )

    const afterIce = applyMove(state, { actor: 'player', cardId: 'p_ice', cell: 8, powerTarget: { targetCell: 4 } })

    expect(() =>
      applyMove(afterIce, {
        actor: 'cpu',
        cardId: 'c_fill_1',
        cell: 4,
      }),
    ).toThrow('Cell 4 is frozen for cpu.')

    const afterCpu = applyMove(afterIce, { actor: 'cpu', cardId: 'c_fill_1', cell: 0 })
    const afterPlayer = applyMove(afterCpu, { actor: 'player', cardId: 'p_grass', cell: 7 })
    const afterCpuSecond = applyMove(afterPlayer, { actor: 'cpu', cardId: 'c_fill_2', cell: 4 })

    expect(afterCpuSecond.board[4]?.owner).toBe('cpu')
    expect(afterCpuSecond.elementState?.frozenCellByActor.cpu).toBeUndefined()
  })

  test('cpu ai still picks a move when one empty cell is frozen', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ice', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4', 'c_guard'],
      }),
    )

    const afterIce = applyMove(state, { actor: 'player', cardId: 'p_ice', cell: 8, powerTarget: { targetCell: 4 } })

    const cpuMove = selectCpuMove(afterIce, 'standard')

    expect(cpuMove.actor).toBe('cpu')
    expect(cpuMove.cell).not.toBe(4)
    expect(() => applyMove(afterIce, cpuMove)).not.toThrow()
  })

  test('glace freeze expires after one turn of the targeted actor', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ice', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4', 'c_guard'],
      }),
    )

    const afterIce = applyMove(state, { actor: 'player', cardId: 'p_ice', cell: 8, powerTarget: { targetCell: 4 } })
    expect(() => applyMove(afterIce, { actor: 'cpu', cardId: 'c_fill_1', cell: 4 })).toThrow('Cell 4 is frozen for cpu.')

    const afterCpuFirstTurn = applyMove(afterIce, { actor: 'cpu', cardId: 'c_fill_1', cell: 0 })
    const afterPlayerFirstTurn = applyMove(afterCpuFirstTurn, { actor: 'player', cardId: 'p_grass', cell: 7 })
    const afterCpuSecondTurn = applyMove(afterPlayerFirstTurn, { actor: 'cpu', cardId: 'c_fill_2', cell: 4 })

    expect(afterCpuSecondTurn.board[4]?.owner).toBe('cpu')
  })

  test('electrik shield prevents flips during next opponent turn', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_electric', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_attacker', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterElectric = applyMove(state, { actor: 'player', cardId: 'p_electric', cell: 4 })
    const resolution = applyMoveDetailed(afterElectric, { actor: 'cpu', cardId: 'c_attacker', cell: 5 })

    expect(resolution.state.board[4]?.owner).toBe('player')
    expect(resolution.flipEvents).toEqual([])
  })

  test('combat gets +1 while attacking (and no longer flips at equal value)', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_fight', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_attacker', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 8 },
      { actor: 'cpu', cardId: 'c_attacker', cell: 5 },
      { actor: 'player', cardId: 'p_fight', cell: 4 },
    ])

    expect(result.board[5]?.owner).toBe('cpu')
  })

  test('spectre can be played on a frozen cell', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ice', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_fill_1', 'c_ghost', 'c_fill_3', 'c_fill_4', 'c_guard'],
      }),
    )

    const afterIce = applyMove(state, { actor: 'player', cardId: 'p_ice', cell: 8, powerTarget: { targetCell: 4 } })
    const afterGhost = applyMove(afterIce, { actor: 'cpu', cardId: 'c_fill_1', cell: 0 })
    const afterPlayer = applyMove(afterGhost, { actor: 'player', cardId: 'p_grass', cell: 7 })
    const onFrozen = applyMove(afterPlayer, { actor: 'cpu', cardId: 'c_ghost', cell: 4 })

    expect(onFrozen.board[4]?.owner).toBe('cpu')
  })

  test('roche shield blocks the first flip only', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_rock', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_attacker', 'c_attacker_2', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'p_rock', cell: 4 },
      { actor: 'cpu', cardId: 'c_attacker', cell: 5 },
      { actor: 'player', cardId: 'p_grass', cell: 8 },
      { actor: 'cpu', cardId: 'c_attacker_2', cell: 3 },
    ])

    expect(result.board[4]?.owner).toBe('cpu')
  })

  test('roche grants shield only once per actor in the match', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_rock', 'p_rock_2', 'p_grass', 'p_fire', 'p_water'],
        cpuDeck: ['c_attacker', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'p_rock', cell: 0 },
      { actor: 'cpu', cardId: 'c_fill_1', cell: 1 },
      { actor: 'player', cardId: 'p_rock_2', cell: 4 },
      { actor: 'cpu', cardId: 'c_attacker', cell: 5 },
    ])

    expect(result.elementState?.boardEffectsByCell[0]?.rockShieldCharges).toBe(1)
    expect(result.elementState?.boardEffectsByCell[4]?.rockShieldCharges).toBe(0)
    expect(result.board[4]?.owner).toBe('cpu')
  })

  test('eau flood applies -3 to highest stat when a non-spectre card enters the flooded cell', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_water', 'p_fire', 'p_grass', 'p_ghost', 'p_dragon'],
        cpuDeck: ['c_attacker', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'p_water', cell: 8, powerTarget: { targetCell: 4 } },
      { actor: 'cpu', cardId: 'c_fill_1', cell: 0 },
      { actor: 'player', cardId: 'p_fire', cell: 4, powerTarget: { targetCardCell: 0 } },
      { actor: 'cpu', cardId: 'c_attacker', cell: 5 },
    ])

    expect(result.board[4]?.owner).toBe('cpu')
  })

  test('vol debuff applies before capture resolution', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_flying', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_attacker', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 8 },
      { actor: 'cpu', cardId: 'c_attacker', cell: 5 },
      { actor: 'player', cardId: 'p_flying', cell: 4, powerTarget: { targetCardCell: 5 } },
    ])

    expect(result.board[5]?.owner).toBe('player')
  })

  test('vol applies a double temporary all-stat malus (-2 total)', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_flying', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_guard', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterSetup = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 8 },
      { actor: 'cpu', cardId: 'c_guard', cell: 5 },
    ])

    const afterVol = applyMove(afterSetup, { actor: 'player', cardId: 'p_flying', cell: 4, powerTarget: { targetCardCell: 5 } })
    const stacks = afterVol.elementState?.boardEffectsByCell[5]?.allStatsMinusOneStacks ?? []

    expect(stacks).toEqual([
      { source: 'vol', actor: 'cpu', untilTurn: 2 },
      { source: 'vol', actor: 'cpu', untilTurn: 2 },
    ])
    expect(resolveDisplaySides(afterVol, 5)).toEqual({
      top: 1,
      right: 1,
      bottom: 4,
      left: 3,
    })
  })

  test('vol can be reused on later placements by the same actor', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_flying', 'c_fill_2', 'p_grass', 'p_fire', 'p_water'],
        cpuDeck: ['c_guard', 'c_fill_1', 'c_fill_3', 'c_fill_4', 'c_attacker'],
      }),
    )

    const afterFirstVol = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 8 },
      { actor: 'cpu', cardId: 'c_guard', cell: 5 },
      { actor: 'player', cardId: 'p_flying', cell: 4, powerTarget: { targetCardCell: 5 } },
      { actor: 'cpu', cardId: 'c_fill_1', cell: 0 },
      { actor: 'player', cardId: 'c_fill_2', cell: 7, powerTarget: { targetCardCell: 0 } },
    ])

    const secondTargetStacks = afterFirstVol.elementState?.boardEffectsByCell[0]?.allStatsMinusOneStacks ?? []
    expect(secondTargetStacks).toHaveLength(2)
    expect(secondTargetStacks.every((stack) => stack.source === 'vol')).toBe(true)
  })

  test('sol applies enemy-only -1 all and expires after the target next turn', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ground', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_mid_4', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterSetup = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 3 },
      { actor: 'cpu', cardId: 'c_mid_4', cell: 5 },
    ])
    const resolution = applyMoveDetailed(afterSetup, { actor: 'player', cardId: 'p_ground', cell: 4 })

    expect(resolution.groundDebuffedCells).toEqual([5])
    expect(resolution.state.elementState?.boardEffectsByCell[3]?.allStatsMinusOneStacks).toEqual([])
    expect(resolution.state.elementState?.boardEffectsByCell[5]?.allStatsMinusOneStacks).toEqual([
      {
        source: 'sol',
        actor: 'cpu',
        untilTurn: 2,
      },
    ])
    expect(resolution.combatCells).toEqual([4, 5])
    expect(resolution.state.board[5]?.owner).toBe('player')
    expect(resolveDisplaySides(resolution.state, 5)).toEqual({
      top: 1,
      right: 1,
      bottom: 1,
      left: 3,
    })

    const afterCpuTurn = applyMove(resolution.state, { actor: 'cpu', cardId: 'c_fill_1', cell: 0 })
    expect(resolveDisplaySides(afterCpuTurn, 5)).toEqual({
      top: 1,
      right: 1,
      bottom: 1,
      left: 4,
    })
  })

  test('sol is not consumed when there is no adjacent enemy card', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ground', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_mid_4', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterSetup = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 3 },
      { actor: 'cpu', cardId: 'c_fill_1', cell: 0 },
    ])
    const resolution = applyMoveDetailed(afterSetup, { actor: 'player', cardId: 'p_ground', cell: 4 })

    expect(resolution.groundDebuffedCells).toEqual([])
    expect(resolution.combatCells).toEqual([])
    expect(resolution.state.elementState?.usedOnPoseByActor.player.sol).toBeUndefined()
    expect(resolution.state.elementState?.boardEffectsByCell[3]?.allStatsMinusOneStacks).toEqual([])
  })

  test('sol can trigger again on a later placement by the same actor', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ground', 'c_guard', 'p_grass', 'p_fire', 'p_water'],
        cpuDeck: ['c_guard', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterFirstSol = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 0 },
      { actor: 'cpu', cardId: 'c_guard', cell: 4 },
      { actor: 'player', cardId: 'p_ground', cell: 8 },
      { actor: 'cpu', cardId: 'c_fill_1', cell: 1 },
    ])

    const secondSolResolution = applyMoveDetailed(afterFirstSol, { actor: 'player', cardId: 'c_guard', cell: 5 })

    expect(secondSolResolution.groundDebuffedCells).toEqual([4])
    expect(secondSolResolution.state.elementState?.boardEffectsByCell[4]?.allStatsMinusOneStacks).toEqual([
      { source: 'sol', actor: 'cpu', untilTurn: 3 },
    ])
  })

  test('sol is consumed after the first successful trigger for the actor', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ground', 'c_guard', 'p_grass', 'p_fire', 'p_water'],
        cpuDeck: ['c_guard', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterFirstSol = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 3 },
      { actor: 'cpu', cardId: 'c_guard', cell: 4 },
      { actor: 'player', cardId: 'p_ground', cell: 5 },
      { actor: 'cpu', cardId: 'c_fill_1', cell: 0 },
    ])

    const beforeStacks = afterFirstSol.elementState?.boardEffectsByCell[4]?.allStatsMinusOneStacks ?? []
    const secondSolResolution = applyMoveDetailed(afterFirstSol, { actor: 'player', cardId: 'c_guard', cell: 8 })
    const afterStacks = secondSolResolution.state.elementState?.boardEffectsByCell[4]?.allStatsMinusOneStacks ?? []

    expect(secondSolResolution.groundDebuffedCells).toEqual([])
    expect(afterStacks).toEqual(beforeStacks)
  })

  test('sol stacks with an existing vol debuff to apply -2 all', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ground', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_guard', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterSetup = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 0 },
      { actor: 'cpu', cardId: 'c_guard', cell: 5 },
    ])

    if (!afterSetup.elementState?.boardEffectsByCell[5]) {
      throw new Error('Expected board effects at cell 5.')
    }
    afterSetup.elementState.boardEffectsByCell[5]!.allStatsMinusOneStacks = [
      {
        source: 'vol',
        actor: 'cpu',
        untilTurn: 2,
      },
    ]

    const resolution = applyMoveDetailed(afterSetup, { actor: 'player', cardId: 'p_ground', cell: 4 })

    expect(resolution.groundDebuffedCells).toEqual([5])
    expect(resolution.state.elementState?.boardEffectsByCell[5]?.allStatsMinusOneStacks).toEqual([
      { source: 'vol', actor: 'cpu', untilTurn: 2 },
      { source: 'sol', actor: 'cpu', untilTurn: 2 },
    ])
    expect(resolveDisplaySides(resolution.state, 5)).toEqual({
      top: 1,
      right: 1,
      bottom: 4,
      left: 3,
    })
  })

  test('sol keeps at most two all-stat stacks and replaces the shortest one', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ground', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_guard', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterSetup = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 0 },
      { actor: 'cpu', cardId: 'c_guard', cell: 5 },
    ])

    if (!afterSetup.elementState?.boardEffectsByCell[5]) {
      throw new Error('Expected board effects at cell 5.')
    }
    afterSetup.elementState.boardEffectsByCell[5]!.allStatsMinusOneStacks = [
      { source: 'vol', actor: 'cpu', untilTurn: 1 },
      { source: 'vol', actor: 'cpu', untilTurn: 4 },
    ]

    const resolution = applyMoveDetailed(afterSetup, { actor: 'player', cardId: 'p_ground', cell: 4 })
    const stacks = resolution.state.elementState?.boardEffectsByCell[5]?.allStatsMinusOneStacks ?? []

    expect(stacks).toHaveLength(2)
    expect(stacks).toEqual(
      expect.arrayContaining([
        { source: 'vol', actor: 'cpu', untilTurn: 4 },
        { source: 'sol', actor: 'cpu', untilTurn: 2 },
      ]),
    )
    expect(resolveDisplaySides(resolution.state, 5)).toEqual({
      top: 1,
      right: 1,
      bottom: 4,
      left: 3,
    })
  })

  test('insecte gains entry stacks from allied insecte already on board', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_bug_a', 'p_bug_b', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_mid_3', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'p_bug_a', cell: 3 },
      { actor: 'cpu', cardId: 'c_mid_3', cell: 5 },
      { actor: 'player', cardId: 'p_bug_b', cell: 4 },
    ])

    expect(result.board[5]?.owner).toBe('player')
  })

  test('insecte can stack up to +3 with three allied adjacent insecte', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_bug_a', 'p_bug_b', 'p_bug_c', 'p_bug_d', 'p_fire'],
        cpuDeck: ['c_attacker', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'p_bug_a', cell: 1 },
      { actor: 'cpu', cardId: 'c_fill_1', cell: 0 },
      { actor: 'player', cardId: 'p_bug_c', cell: 3 },
      { actor: 'cpu', cardId: 'c_fill_2', cell: 2 },
      { actor: 'player', cardId: 'p_bug_d', cell: 7 },
      { actor: 'cpu', cardId: 'c_attacker', cell: 5 },
      { actor: 'player', cardId: 'p_bug_b', cell: 4 },
    ])

    expect(result.board[5]?.owner).toBe('player')
  })

  test('dragon applies deterministic stat transform on placement', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_dragon', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_mid_3', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 8 },
      { actor: 'cpu', cardId: 'c_mid_3', cell: 5 },
      { actor: 'player', cardId: 'p_dragon', cell: 4 },
    ])

    expect(result.board[5]?.owner).toBe('player')
  })

  test('plante bonus scales only with adjacent allied plante cards', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_grass', 'p_grass_2', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4', 'c_guard'],
      }),
    )

    const afterNonPlanteAdjacent = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 4 },
      { actor: 'cpu', cardId: 'c_fill_1', cell: 0 },
      { actor: 'player', cardId: 'p_fire', cell: 1 },
    ])
    expect(resolveDisplaySides(afterNonPlanteAdjacent, 4)).toEqual({ top: 3, right: 3, bottom: 3, left: 3 })

    const afterPlanteAdjacent = play(afterNonPlanteAdjacent, [
      { actor: 'cpu', cardId: 'c_fill_2', cell: 2 },
      { actor: 'player', cardId: 'p_grass_2', cell: 5 },
    ])
    expect(resolveDisplaySides(afterPlanteAdjacent, 4)).toEqual({ top: 4, right: 4, bottom: 4, left: 4 })
  })

  test('stolen plante does not grant passive bonus to the thief', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_grass', 'p_fire', 'p_water', 'p_ghost', 'p_normal'],
        cpuDeck: ['c_fill_1', 'c_fill_2', 'c_fill_3', 'c_attacker', 'p_grass_2'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 4 },
      { actor: 'cpu', cardId: 'c_fill_1', cell: 0 },
      { actor: 'player', cardId: 'p_fire', cell: 1 },
      { actor: 'cpu', cardId: 'c_attacker', cell: 5 },
      { actor: 'player', cardId: 'p_water', cell: 6 },
      { actor: 'cpu', cardId: 'p_grass_2', cell: 3 },
    ])

    expect(result.board[4]?.owner).toBe('cpu')
    expect(resolveDisplaySides(result, 4)).toEqual({ top: 3, right: 3, bottom: 3, left: 3 })
    expect(resolveDisplaySides(result, 3)).toEqual({ top: 3, right: 3, bottom: 3, left: 3 })
  })

  test('poison marks an opponent hand card and applies pending poison malus when played', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_poison', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_attacker', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterPoison = applyMove(state, { actor: 'player', cardId: 'p_poison', cell: 8 })
    const poisonedCardId = afterPoison.elementState?.poisonedHandByActor.cpu[0]
    expect(poisonedCardId).toBeTruthy()

    const afterCpuPlay = applyMove(afterPoison, {
      actor: 'cpu',
      cardId: poisonedCardId!,
      cell: 0,
    })
    const poisonedCell = afterCpuPlay.board.findIndex((slot) => slot?.cardId === poisonedCardId)
    const pending = poisonedCell >= 0 ? afterCpuPlay.elementState?.boardEffectsByCell[poisonedCell]?.poisonFirstCombatPending : null
    expect(pending).toBe(true)
  })

  test('poisoned card keeps -1 board stats until end of match if placed without adjacent enemies', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_fire', 'p_grass', 'p_water', 'p_ghost', 'p_poison'],
        cpuDeck: ['c_guard', 'c_swap_target', 'c_mid_4', 'c_attacker', 'c_attacker_2'],
      }),
    )

    if (!state.elementState) {
      throw new Error('Expected element state.')
    }
    state.elementState.poisonedHandByActor.cpu = ['c_guard']

    const afterPlayerMove = applyMove(state, { actor: 'player', cardId: 'p_fire', cell: 8 })
    const afterCpuMove = applyMove(afterPlayerMove, { actor: 'cpu', cardId: 'c_guard', cell: 0 })
    const effects = afterCpuMove.elementState?.boardEffectsByCell[0]
    const displaySides = resolveDisplaySides(afterCpuMove, 0)

    expect(effects?.poisonFirstCombatPending).toBe(true)
    expect(displaySides).toEqual({ top: 2, right: 2, bottom: 5, left: 4 })
  })

  test('poisoned card keeps -1 board stats even after entering combat', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_fire', 'p_grass', 'p_water', 'p_ghost', 'p_poison'],
        cpuDeck: ['c_guard', 'c_swap_target', 'c_mid_4', 'c_attacker', 'c_attacker_2'],
      }),
    )

    if (!state.elementState) {
      throw new Error('Expected element state.')
    }
    state.elementState.poisonedHandByActor.cpu = ['c_guard']

    const afterPlayerMove = applyMove(state, { actor: 'player', cardId: 'p_fire', cell: 8 })
    const afterCpuMove = applyMove(afterPlayerMove, { actor: 'cpu', cardId: 'c_guard', cell: 5 })
    const effects = afterCpuMove.elementState?.boardEffectsByCell[5]
    const displaySides = resolveDisplaySides(afterCpuMove, 5)

    expect(effects?.poisonFirstCombatPending).toBe(true)
    expect(displaySides).toEqual({ top: 2, right: 2, bottom: 5, left: 4 })
  })

  test('spectre ignores active malus stacks and poison pending malus', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ghost', 'p_fire', 'p_water', 'p_grass', 'p_normal'],
        cpuDeck: ['c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4', 'c_guard'],
      }),
    )

    const afterSetup = play(state, [
      { actor: 'player', cardId: 'p_ghost', cell: 4 },
      { actor: 'cpu', cardId: 'c_fill_1', cell: 0 },
    ])

    if (!afterSetup.elementState?.boardEffectsByCell[4]) {
      throw new Error('Expected board effects at cell 4.')
    }
    afterSetup.elementState.boardEffectsByCell[4]!.allStatsMinusOneStacks = [
      { source: 'vol', actor: 'cpu', untilTurn: 99 },
      { source: 'sol', actor: 'cpu', untilTurn: 99 },
    ]
    afterSetup.elementState.boardEffectsByCell[4]!.poisonFirstCombatPending = true

    expect(resolveDisplaySides(afterSetup, 4)).toEqual({
      top: 4,
      right: 5,
      bottom: 4,
      left: 4,
    })
  })

  test('normal cards gain +1 all stats in normal mode', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_normal', 'p_normal_2', 'p_normal_3', 'p_normal_4', 'p_normal_5'],
        cpuDeck: ['c_guard', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterPlayer = applyMove(state, { actor: 'player', cardId: 'p_normal', cell: 4 })
    expect(resolveDisplaySides(afterPlayer, 4)).toEqual({
      top: 3,
      right: 3,
      bottom: 3,
      left: 3,
    })
  })

  test('psy applies swap effect on targeted enemy card', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_psy', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_swap_target', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterSetup = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 8 },
      { actor: 'cpu', cardId: 'c_swap_target', cell: 1 },
    ])
    const afterPsy = applyMove(afterSetup, { actor: 'player', cardId: 'p_psy', cell: 4, powerTarget: { targetCardCell: 1 } })

    expect(afterPsy.elementState?.boardEffectsByCell[1]?.swappedHighLowUntilMatchEnd).toBe(true)
  })
})
