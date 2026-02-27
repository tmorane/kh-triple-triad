import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import type { MatchConfig, Move } from '../types'

let applyMove: typeof import('./engine')['applyMove']
let createMatch: typeof import('./engine')['createMatch']
let resolveMatchResult: typeof import('./engine')['resolveMatchResult']

beforeAll(async () => {
  vi.resetModules()
  vi.doMock('../cards/cardPool', () => {
    const cardById = {
      c01: {
        id: 'c01',
        name: 'Ember Scout',
        top: 3,
        right: 5,
        bottom: 2,
        left: 4,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'feu',
      },
      c02: {
        id: 'c02',
        name: 'Tidal Mage',
        top: 4,
        right: 2,
        bottom: 5,
        left: 3,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'eau',
      },
      c03: {
        id: 'c03',
        name: 'Stone Guard',
        top: 6,
        right: 2,
        bottom: 4,
        left: 5,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'sol',
      },
      c04: {
        id: 'c04',
        name: 'Gale Thief',
        top: 2,
        right: 6,
        bottom: 3,
        left: 4,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'vol',
      },
      c05: {
        id: 'c05',
        name: 'Dawn Lancer',
        top: 5,
        right: 4,
        bottom: 6,
        left: 2,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'fee',
      },
      c06: {
        id: 'c06',
        name: 'Dusk Shield',
        top: 4,
        right: 3,
        bottom: 5,
        left: 6,
        rarity: 'common',
        categoryId: 'humain',
        elementId: 'tenebres',
      },
      c07: {
        id: 'c07',
        name: 'Moon Archer',
        top: 3,
        right: 7,
        bottom: 2,
        left: 5,
        rarity: 'uncommon',
        categoryId: 'humain',
        elementId: 'psy',
      },
      c08: {
        id: 'c08',
        name: 'Sun Brawler',
        top: 6,
        right: 4,
        bottom: 3,
        left: 5,
        rarity: 'uncommon',
        categoryId: 'humain',
        elementId: 'feu',
      },
      c09: {
        id: 'c09',
        name: 'Ether Fox',
        top: 5,
        right: 5,
        bottom: 4,
        left: 4,
        rarity: 'uncommon',
        categoryId: 'humain',
        elementId: 'spectre',
      },
      c10: {
        id: 'c10',
        name: 'Iron Boar',
        top: 7,
        right: 3,
        bottom: 5,
        left: 2,
        rarity: 'uncommon',
        categoryId: 'humain',
        elementId: 'sol',
      },
      c11: {
        id: 'c11',
        name: 'Frost Wyvern',
        top: 6,
        right: 7,
        bottom: 2,
        left: 4,
        rarity: 'rare',
        categoryId: 'humain',
        elementId: 'glace',
      },
      c16: {
        id: 'c16',
        name: 'Radiant Knight',
        top: 7,
        right: 6,
        bottom: 5,
        left: 5,
        rarity: 'legendary',
        categoryId: 'humain',
        elementId: 'fee',
      },
      c18: {
        id: 'c18',
        name: 'Chrono Seer',
        top: 6,
        right: 8,
        bottom: 6,
        left: 3,
        rarity: 'legendary',
        categoryId: 'humain',
        elementId: 'acier',
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

  ;({ applyMove, createMatch, resolveMatchResult } = await import('./engine'))
})

afterAll(() => {
  vi.doUnmock('../cards/cardPool')
  vi.resetModules()
})

function makeConfig(overrides?: Partial<MatchConfig>): MatchConfig {
  return {
    playerDeck: ['c01', 'c02', 'c03', 'c09', 'c16'],
    cpuDeck: ['c06', 'c07', 'c08', 'c10', 'c11'],
    mode: '3x3',
    rules: { open: true, same: false, plus: false },
    seed: 7,
    ...overrides,
  }
}

function play(state: ReturnType<typeof createMatch>, moves: Move[]) {
  return moves.reduce((nextState, move) => applyMove(nextState, move), state)
}

describe('match engine', () => {
  test('uses the configured starting turn when creating a match', () => {
    const cpuStart = createMatch(makeConfig({ startingTurn: 'cpu' }))
    const playerStart = createMatch(makeConfig({ startingTurn: 'player' }))

    expect(cpuStart.turn).toBe('cpu')
    expect(playerStart.turn).toBe('player')
  })

  test('captures a left-adjacent enemy card with normal rules', () => {
    const state = createMatch(makeConfig())

    const result = play(state, [
      { actor: 'player', cardId: 'c01', cell: 8 },
      { actor: 'cpu', cardId: 'c06', cell: 0 },
      { actor: 'player', cardId: 'c16', cell: 1 },
    ])

    expect(result.board[0]?.owner).toBe('player')
  })

  test('captures a right-adjacent enemy card with normal rules', () => {
    const state = createMatch(makeConfig({ playerDeck: ['c01', 'c02', 'c03', 'c18', 'c09'] }))

    const result = play(state, [
      { actor: 'player', cardId: 'c01', cell: 8 },
      { actor: 'cpu', cardId: 'c06', cell: 2 },
      { actor: 'player', cardId: 'c18', cell: 1 },
    ])

    expect(result.board[2]?.owner).toBe('player')
  })

  test('captures an upper-adjacent enemy card with normal rules', () => {
    const state = createMatch(makeConfig())

    const result = play(state, [
      { actor: 'player', cardId: 'c01', cell: 8 },
      { actor: 'cpu', cardId: 'c06', cell: 1 },
      { actor: 'player', cardId: 'c16', cell: 4 },
    ])

    expect(result.board[1]?.owner).toBe('player')
  })

  test('captures a lower-adjacent enemy card with normal rules', () => {
    const state = createMatch(makeConfig({ cpuDeck: ['c01', 'c06', 'c07', 'c08', 'c10'] }))

    const result = play(state, [
      { actor: 'player', cardId: 'c02', cell: 8 },
      { actor: 'cpu', cardId: 'c01', cell: 7 },
      { actor: 'player', cardId: 'c16', cell: 4 },
    ])

    expect(result.board[7]?.owner).toBe('player')
  })

  test('Same flips only when two or more exact matches exist', () => {
    const state = createMatch(
      makeConfig({
        rules: { open: true, same: true, plus: false },
        playerDeck: ['c01', 'c02', 'c03', 'c09', 'c16'],
        cpuDeck: ['c06', 'c08', 'c07', 'c10', 'c11'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'c01', cell: 8 },

      { actor: 'cpu', cardId: 'c06', cell: 1 },
      { actor: 'player', cardId: 'c02', cell: 7 },
      { actor: 'cpu', cardId: 'c08', cell: 3 },
      { actor: 'player', cardId: 'c09', cell: 4 },
    ])

    expect(result.board[1]?.owner).toBe('player')
    expect(result.board[3]?.owner).toBe('player')
  })

  test('Same does not flip with only one exact match', () => {
    const state = createMatch(
      makeConfig({
        rules: { open: true, same: true, plus: false },
        playerDeck: ['c01', 'c02', 'c03', 'c05', 'c16'],
        cpuDeck: ['c06', 'c08', 'c07', 'c10', 'c11'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'c01', cell: 8 },
      { actor: 'cpu', cardId: 'c06', cell: 1 },
      { actor: 'player', cardId: 'c02', cell: 7 },
      { actor: 'cpu', cardId: 'c08', cell: 3 },
      { actor: 'player', cardId: 'c05', cell: 4 },
    ])

    expect(result.board[1]?.owner).toBe('cpu')
    expect(result.board[3]?.owner).toBe('cpu')
  })

  test('Plus flips only when two or more equal sums exist', () => {
    const state = createMatch(
      makeConfig({
        rules: { open: true, same: false, plus: true },
        playerDeck: ['c01', 'c02', 'c03', 'c05', 'c16'],
        cpuDeck: ['c03', 'c07', 'c08', 'c10', 'c11'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'c01', cell: 8 },
      { actor: 'cpu', cardId: 'c03', cell: 1 },
      { actor: 'player', cardId: 'c02', cell: 7 },
      { actor: 'cpu', cardId: 'c07', cell: 3 },
      { actor: 'player', cardId: 'c05', cell: 4 },
    ])

    expect(result.board[1]?.owner).toBe('player')
    expect(result.board[3]?.owner).toBe('player')
  })

  test('Plus does not flip when equal sum exists on only one side', () => {
    const state = createMatch(
      makeConfig({
        rules: { open: true, same: false, plus: true },
        playerDeck: ['c01', 'c02', 'c03', 'c04', 'c16'],
        cpuDeck: ['c03', 'c08', 'c07', 'c10', 'c11'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'c01', cell: 8 },
      { actor: 'cpu', cardId: 'c03', cell: 1 },
      { actor: 'player', cardId: 'c04', cell: 7 },
      { actor: 'cpu', cardId: 'c08', cell: 3 },
      { actor: 'player', cardId: 'c02', cell: 4 },
    ])

    expect(result.board[1]?.owner).toBe('cpu')
    expect(result.board[3]?.owner).toBe('cpu')
  })

  test('combo chain flips continue from Same or Plus flips', () => {
    const state = createMatch(
      makeConfig({
        rules: { open: true, same: true, plus: false },
        playerDeck: ['c01', 'c03', 'c04', 'c09', 'c16'],
        cpuDeck: ['c06', 'c08', 'c02', 'c10', 'c11'],
      }),
    )

    const result = play(state, [
      { actor: 'player', cardId: 'c01', cell: 8 },
      { actor: 'cpu', cardId: 'c06', cell: 1 },
      { actor: 'player', cardId: 'c03', cell: 7 },
      { actor: 'cpu', cardId: 'c08', cell: 3 },
      { actor: 'player', cardId: 'c04', cell: 6 },
      { actor: 'cpu', cardId: 'c02', cell: 0 },
      { actor: 'player', cardId: 'c09', cell: 4 },
    ])

    expect(result.board[0]?.owner).toBe('player')
  })

  test('throws on occupied cell placement', () => {
    const state = createMatch(makeConfig())
    const afterPlayerMove = applyMove(state, { actor: 'player', cardId: 'c01', cell: 0 })

    expect(() =>
      applyMove(afterPlayerMove, {
        actor: 'cpu',
        cardId: 'c06',
        cell: 0,
      }),
    ).toThrowError('Cell 0 is already occupied.')
  })

  test('marks the match finished after nine turns and resolves a winner', () => {
    const state = createMatch(makeConfig())

    const resultState = play(state, [
      { actor: 'player', cardId: 'c01', cell: 0 },
      { actor: 'cpu', cardId: 'c06', cell: 1 },
      { actor: 'player', cardId: 'c02', cell: 2 },
      { actor: 'cpu', cardId: 'c07', cell: 3 },
      { actor: 'player', cardId: 'c03', cell: 4 },
      { actor: 'cpu', cardId: 'c08', cell: 5 },
      { actor: 'player', cardId: 'c09', cell: 6 },
      { actor: 'cpu', cardId: 'c10', cell: 7 },
      { actor: 'player', cardId: 'c16', cell: 8 },
    ])

    expect(resultState.status).toBe('finished')
    const result = resolveMatchResult(resultState)
    expect(result.playerCount + result.cpuCount).toBe(9)
    expect(['player', 'cpu', 'draw']).toContain(result.winner)
  })

  test('creates a 4x4 board and hand sizes from mode config', () => {
    const state = createMatch(
      makeConfig({
        mode: '4x4',
        playerDeck: ['c01', 'c02', 'c03', 'c04', 'c05', 'c09', 'c16', 'c18'],
        cpuDeck: ['c06', 'c07', 'c08', 'c10', 'c11', 'c01', 'c02', 'c03'],
      }),
    )

    expect(state.board).toHaveLength(16)
    expect(state.hands.player).toHaveLength(8)
    expect(state.hands.cpu).toHaveLength(8)
  })

  test('rejects non-8-card decks in 4x4 mode', () => {
    expect(() =>
      createMatch(
        makeConfig({
          mode: '4x4',
          playerDeck: ['c01', 'c02', 'c03', 'c04', 'c05'],
          cpuDeck: ['c06', 'c07', 'c08', 'c09', 'c10'],
        }),
      ),
    ).toThrow('Player deck must contain exactly 8 unique cards.')
  })

  test('marks the match finished after sixteen turns in 4x4 mode', () => {
    const state = createMatch(
      makeConfig({
        mode: '4x4',
        playerDeck: ['c01', 'c02', 'c03', 'c04', 'c05', 'c09', 'c16', 'c18'],
        cpuDeck: ['c06', 'c07', 'c08', 'c10', 'c11', 'c01', 'c02', 'c03'],
      }),
    )

    const resultState = play(state, [
      { actor: 'player', cardId: 'c01', cell: 0 },
      { actor: 'cpu', cardId: 'c06', cell: 1 },
      { actor: 'player', cardId: 'c02', cell: 2 },
      { actor: 'cpu', cardId: 'c07', cell: 3 },
      { actor: 'player', cardId: 'c03', cell: 4 },
      { actor: 'cpu', cardId: 'c08', cell: 5 },
      { actor: 'player', cardId: 'c04', cell: 6 },
      { actor: 'cpu', cardId: 'c10', cell: 7 },
      { actor: 'player', cardId: 'c05', cell: 8 },
      { actor: 'cpu', cardId: 'c11', cell: 9 },
      { actor: 'player', cardId: 'c09', cell: 10 },
      { actor: 'cpu', cardId: 'c01', cell: 11 },
      { actor: 'player', cardId: 'c16', cell: 12 },
      { actor: 'cpu', cardId: 'c02', cell: 13 },
      { actor: 'player', cardId: 'c18', cell: 14 },
      { actor: 'cpu', cardId: 'c03', cell: 15 },
    ])

    expect(resultState.status).toBe('finished')
    expect(resultState.turns).toBe(16)
    const result = resolveMatchResult(resultState)
    expect(result.playerCount + result.cpuCount).toBe(16)
  })

  test('throws on out-of-bounds move cell for current mode', () => {
    const state = createMatch(
      makeConfig({
        mode: '4x4',
        playerDeck: ['c01', 'c02', 'c03', 'c04', 'c05', 'c09', 'c16', 'c18'],
        cpuDeck: ['c06', 'c07', 'c08', 'c10', 'c11', 'c01', 'c02', 'c03'],
      }),
    )

    expect(() =>
      applyMove(state, {
        actor: 'player',
        cardId: 'c01',
        cell: 16,
      }),
    ).toThrow('Cell 16 is out of bounds for 4x4.')
  })

  test('primary synergy R1 grants +1 on first move sides', () => {
    const withPrimary = play(
      createMatch(
        makeConfig({
          startingTurn: 'cpu',
          typeSynergy: {
            player: { primaryTypeId: 'sans_coeur', secondaryTypeId: null },
            cpu: { primaryTypeId: null, secondaryTypeId: null },
          },
        }),
      ),
      [
        { actor: 'cpu', cardId: 'c06', cell: 0 },
        { actor: 'player', cardId: 'c02', cell: 1 },
      ],
    )

    const withoutPrimary = play(
      createMatch(
        makeConfig({
          startingTurn: 'cpu',
          typeSynergy: {
            player: { primaryTypeId: null, secondaryTypeId: null },
            cpu: { primaryTypeId: null, secondaryTypeId: null },
          },
        }),
      ),
      [
        { actor: 'cpu', cardId: 'c06', cell: 0 },
        { actor: 'player', cardId: 'c02', cell: 1 },
      ],
    )

    expect(withPrimary.board[0]?.owner).toBe('player')
    expect(withoutPrimary.board[0]?.owner).toBe('cpu')
  })

  test('primary synergy R2 grants +1 on active corner sides', () => {
    const withPrimary = play(
      createMatch(
        makeConfig({
          playerDeck: ['c01', 'c03', 'c04', 'c05', 'c16'],
          typeSynergy: {
            player: { primaryTypeId: 'simili', secondaryTypeId: null },
            cpu: { primaryTypeId: null, secondaryTypeId: null },
          },
        }),
      ),
      [
        { actor: 'player', cardId: 'c01', cell: 8 },
        { actor: 'cpu', cardId: 'c11', cell: 1 },
        { actor: 'player', cardId: 'c05', cell: 0 },
      ],
    )

    const withoutPrimary = play(
      createMatch(
        makeConfig({
          playerDeck: ['c01', 'c03', 'c04', 'c05', 'c16'],
          typeSynergy: {
            player: { primaryTypeId: null, secondaryTypeId: null },
            cpu: { primaryTypeId: null, secondaryTypeId: null },
          },
        }),
      ),
      [
        { actor: 'player', cardId: 'c01', cell: 8 },
        { actor: 'cpu', cardId: 'c11', cell: 1 },
        { actor: 'player', cardId: 'c05', cell: 0 },
      ],
    )

    expect(withPrimary.board[1]?.owner).toBe('player')
    expect(withoutPrimary.board[1]?.owner).toBe('cpu')
  })

  test('secondary synergy does not alter capture resolution', () => {
    const withSecondaryOnly = play(
      createMatch(
        makeConfig({
          startingTurn: 'cpu',
          typeSynergy: {
            player: { primaryTypeId: null, secondaryTypeId: 'simili' },
            cpu: { primaryTypeId: null, secondaryTypeId: null },
          },
        }),
      ),
      [
        { actor: 'cpu', cardId: 'c06', cell: 0 },
        { actor: 'player', cardId: 'c02', cell: 1 },
      ],
    )

    expect(withSecondaryOnly.board[0]?.owner).toBe('cpu')
  })
})

