import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import type { MatchConfig, Move } from '../types'
import type { MatchState } from './types'

let applyMove: typeof import('./engine')['applyMove']
let createMatch: typeof import('./engine')['createMatch']
let listLegalMoves: typeof import('./engine')['listLegalMoves']
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
        categoryId: 'humain',
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
        categoryId: 'humain',
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
        categoryId: 'humain',
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
        categoryId: 'humain',
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
        categoryId: 'humain',
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
        categoryId: 'humain',
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

  ;({ applyMove, createMatch, listLegalMoves } = await import('./engine'))
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
    mode: '3x3',
    rules: { open: true, same: false, plus: false },
    seed: 99,
    ...overrides,
  }
}

function createEmptyTypeSynergy() {
  return {
    player: { primaryTypeId: null, secondaryTypeId: null },
    cpu: { primaryTypeId: null, secondaryTypeId: null },
  } as const
}

function createEmptyMetrics() {
  return {
    playsByActor: { player: 0, cpu: 0 },
    samePlusTriggersByActor: { player: 0, cpu: 0 },
    cornerPlaysByActor: { player: 0, cpu: 0 },
  } as const
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
      typeSynergy: createEmptyTypeSynergy(),
      metrics: createEmptyMetrics(),
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
      typeSynergy: createEmptyTypeSynergy(),
      metrics: createEmptyMetrics(),
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

  test('keeps legacy behavior when standard profile is explicit', () => {
    const start = createMatch(config())
    const afterPlayerMove = applyMove(start, { actor: 'player', cardId: 'c20', cell: 0 })

    const defaultMove = selectCpuMove(afterPlayerMove)
    const standardMove = selectCpuMove(afterPlayerMove, 'standard')

    expect(standardMove).toEqual(defaultMove)
  })

  test('expert profile improves at least one tactical trap over standard', () => {
    const candidateStates = collectCpuTurnStates(createMatch(config()), 5, 2)

    const improvement = candidateStates.find((state) => {
      const standardMove = selectCpuMove(state, 'standard')
      const expertMove = selectCpuMove(state, 'expert')
      if (standardMove.cardId === expertMove.cardId && standardMove.cell === expertMove.cell) {
        return false
      }

      const standardWorstCase = scoreAfterBestPlayerResponse(state, standardMove)
      const expertWorstCase = scoreAfterBestPlayerResponse(state, expertMove)
      return expertWorstCase > standardWorstCase
    })

    expect(improvement).toBeTruthy()
  })

  test('supports 4x4 boards and selects the only legal cell when one remains', () => {
    const nearlyFullBoard: Array<{ cardId: string; owner: 'player' } | null> = Array.from({ length: 16 }, () => ({
      cardId: 'c06',
      owner: 'player' as const,
    }))
    nearlyFullBoard[15] = null

    const state: MatchState = {
      config: {
        playerDeck: ['c20', 'c02', 'c03', 'c04', 'c05', 'c01', 'c07', 'c08'],
        cpuDeck: ['c16', 'c06', 'c15', 'c01', 'c02', 'c03', 'c04', 'c05'],
        mode: '4x4',
        rules: { open: true, same: false, plus: false },
        seed: 101,
      },
      rules: { open: true, same: false, plus: false },
      typeSynergy: createEmptyTypeSynergy(),
      metrics: createEmptyMetrics(),
      turn: 'cpu',
      board: nearlyFullBoard,
      hands: {
        player: [],
        cpu: ['c16'],
      },
      turns: 15,
      status: 'active',
      lastMove: null,
    }

    const move = selectCpuMove(state)

    expect(move.cell).toBe(15)
    expect(move.actor).toBe('cpu')
    expect(move.cardId).toBe('c16')
  })
})

function collectCpuTurnStates(initial: MatchState, maxDepth: number, branchFactor: number): MatchState[] {
  let frontier: MatchState[] = [initial]
  const cpuStates: MatchState[] = []

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const nextFrontier: MatchState[] = []

    for (const state of frontier) {
      if (state.status !== 'active') {
        continue
      }

      if (state.turn === 'cpu') {
        cpuStates.push(state)
      }

      const moves = listLegalMoves(state).slice(0, branchFactor)
      for (const move of moves) {
        nextFrontier.push(applyMove(state, move))
      }
    }

    frontier = nextFrontier
    if (frontier.length === 0) {
      break
    }
  }

  return cpuStates
}

function scoreAfterBestPlayerResponse(state: MatchState, cpuMove: Move): number {
  if (cpuMove.actor !== 'cpu') {
    throw new Error('Expected a CPU move.')
  }

  const afterCpu = applyMove(state, cpuMove)
  if (afterCpu.status === 'finished') {
    return countCpuLead(afterCpu)
  }

  const playerMoves = listLegalMoves(afterCpu).filter((move) => move.actor === 'player')
  if (playerMoves.length === 0) {
    return countCpuLead(afterCpu)
  }

  return Math.min(...playerMoves.map((move) => countCpuLead(applyMove(afterCpu, move))))
}

function countCpuLead(state: MatchState): number {
  let cpu = 0
  let player = 0
  for (const slot of state.board) {
    if (!slot) {
      continue
    }
    if (slot.owner === 'cpu') {
      cpu += 1
    } else {
      player += 1
    }
  }
  return cpu - player
}
