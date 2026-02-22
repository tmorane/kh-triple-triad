import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import type { MatchConfig } from '../types'
import type { MatchState } from './types'

let applyMove: typeof import('./engine')['applyMove']
let createMatch: typeof import('./engine')['createMatch']
let selectCpuMove: typeof import('./ai')['selectCpuMove']

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
        categoryId: 'allie',
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
        categoryId: 'allie',
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
        categoryId: 'allie',
        elementId: 'terre',
      },
      c04: {
        id: 'c04',
        name: 'Gale Thief',
        top: 2,
        right: 6,
        bottom: 3,
        left: 4,
        rarity: 'common',
        categoryId: 'allie',
        elementId: 'vent',
      },
      c05: {
        id: 'c05',
        name: 'Dawn Lancer',
        top: 5,
        right: 4,
        bottom: 6,
        left: 2,
        rarity: 'common',
        categoryId: 'allie',
        elementId: 'lumiere',
      },
      c06: {
        id: 'c06',
        name: 'Dusk Shield',
        top: 4,
        right: 3,
        bottom: 5,
        left: 6,
        rarity: 'common',
        categoryId: 'allie',
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
        categoryId: 'allie',
        elementId: 'lune',
      },
      c08: {
        id: 'c08',
        name: 'Sun Brawler',
        top: 6,
        right: 4,
        bottom: 3,
        left: 5,
        rarity: 'uncommon',
        categoryId: 'allie',
        elementId: 'feu',
      },
      c15: {
        id: 'c15',
        name: 'Shadow Ninja',
        top: 3,
        right: 8,
        bottom: 4,
        left: 6,
        rarity: 'rare',
        categoryId: 'allie',
        elementId: 'tenebres',
      },
      c16: {
        id: 'c16',
        name: 'Radiant Knight',
        top: 7,
        right: 6,
        bottom: 5,
        left: 5,
        rarity: 'legendary',
        categoryId: 'allie',
        elementId: 'lumiere',
      },
      c20: {
        id: 'c20',
        name: 'Oblivion Lord',
        top: 9,
        right: 5,
        bottom: 8,
        left: 5,
        rarity: 'legendary',
        categoryId: 'allie',
        elementId: 'tenebres',
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

  ;({ applyMove, createMatch } = await import('./engine'))
  ;({ selectCpuMove } = await import('./ai'))
})

afterAll(() => {
  vi.doUnmock('../cards/cardPool')
  vi.resetModules()
})

function config(overrides?: Partial<MatchConfig>): MatchConfig {
  return {
    playerDeck: ['c20', 'c02', 'c03', 'c04', 'c05'],
    cpuDeck: ['c15', 'c01', 'c06', 'c07', 'c08'],
    rules: { open: true, same: false, plus: false },
    seed: 99,
    ...overrides,
  }
}

describe('cpu ai', () => {
  test('picks an immediate flip over non-flip alternatives', () => {
    const start = createMatch(config())
    const afterPlayerMove = applyMove(start, { actor: 'player', cardId: 'c20', cell: 0 })

    const move = selectCpuMove(afterPlayerMove)

    expect(move.cardId).toBe('c15')
    expect(move.cell).toBe(1)
  })

  test('avoids high-risk exposed move when immediate flips are equal', () => {
    const customState: MatchState = {
      config: config({ playerDeck: ['c20', 'c02', 'c03', 'c04', 'c05'], cpuDeck: ['c16', 'c01', 'c06', 'c07', 'c08'] }),
      rules: { open: true, same: false, plus: false },
      turn: 'cpu',
      board: [null, { cardId: 'c06', owner: 'player' }, null, null, null, null, null, null, null],
      hands: {
        player: ['c20'],
        cpu: ['c16'],
      },
      turns: 1,
      status: 'active',
      lastMove: null,
    }

    const move = selectCpuMove(customState)

    expect(move.cell).toBe(2)
  })

  test('is deterministic for identical state', () => {
    const customState: MatchState = {
      config: config({ playerDeck: ['c20', 'c02', 'c03', 'c04', 'c05'], cpuDeck: ['c16', 'c01', 'c06', 'c07', 'c08'] }),
      rules: { open: true, same: false, plus: false },
      turn: 'cpu',
      board: [null, { cardId: 'c06', owner: 'player' }, null, null, null, null, null, null, null],
      hands: {
        player: ['c20'],
        cpu: ['c16'],
      },
      turns: 1,
      status: 'active',
      lastMove: null,
    }

    const a = selectCpuMove(customState)
    const b = selectCpuMove(customState)

    expect(a).toEqual(b)
  })
})
