import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import type { MatchConfig, Move } from '../types'

let applyMove: typeof import('./engine')['applyMove']
let applyMoveDetailed: typeof import('./engine')['applyMoveDetailed']
let createMatch: typeof import('./engine')['createMatch']
let resolveDisplaySides: typeof import('./engine')['resolveDisplaySides']

beforeAll(async () => {
  vi.resetModules()
  vi.doMock('../cards/cardPool', () => {
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

    return {
      cardPool: Object.values(cardById),
      cardById,
      getCard(cardId: string) {
        const card = cardById[cardId as keyof typeof cardById]
        if (!card) {
          throw new Error(`Unknown card: ${cardId}`)
        }
        return card
      },
    }
  })

  ;({ applyMove, applyMoveDetailed, createMatch, resolveDisplaySides } = await import('./engine'))
})

afterAll(() => {
  vi.doUnmock('../cards/cardPool')
  vi.resetModules()
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

    expect(state.rules.same).toBe(true)
    expect(state.rules.plus).toBe(true)
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

  test('fire burn applies two permanent all-stat debuffs on target owner turns', () => {
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

  test('glace blocks the next opponent turn on targeted cell, then unblocks', () => {
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
    const afterCpuRetry = applyMove(afterPlayer, { actor: 'cpu', cardId: 'c_fill_2', cell: 4 })

    expect(afterCpuRetry.board[4]?.owner).toBe('cpu')
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
    const afterCpu = applyMove(afterElectric, { actor: 'cpu', cardId: 'c_attacker', cell: 5 })

    expect(afterCpu.board[4]?.owner).toBe('player')
  })

  test('combat gets +2 while attacking', () => {
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

    expect(result.board[5]?.owner).toBe('player')
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

  test('eau flood applies -2 to highest stat when a non-spectre card enters the flooded cell', () => {
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

  test('sol applies current-combat debuff to adjacent cards', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ground', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_mid_4', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const afterSetup = play(state, [
      { actor: 'player', cardId: 'p_grass', cell: 8 },
      { actor: 'cpu', cardId: 'c_mid_4', cell: 5 },
    ])
    const resolution = applyMoveDetailed(afterSetup, { actor: 'player', cardId: 'p_ground', cell: 4 })

    expect(resolution.groundDebuffedCells).toEqual([5])
    expect(resolution.combatCells).toEqual([4, 5])
    expect(resolution.state.board[5]?.owner).toBe('player')
  })

  test('sol is not consumed when no adjacent card exists at placement time', () => {
    const state = createMatch(
      makeConfig({
        strictPowerTargeting: false,
        playerDeck: ['p_ground', 'p_grass', 'p_fire', 'p_water', 'p_ghost'],
        cpuDeck: ['c_mid_4', 'c_fill_1', 'c_fill_2', 'c_fill_3', 'c_fill_4'],
      }),
    )

    const resolution = applyMoveDetailed(state, { actor: 'player', cardId: 'p_ground', cell: 4 })

    expect(resolution.groundDebuffedCells).toEqual([])
    expect(resolution.combatCells).toEqual([])
    expect(resolution.state.elementState?.usedOnPoseByActor.player.sol).toBeUndefined()
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
