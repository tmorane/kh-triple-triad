import { describe, expect, test } from 'bun:test'
import type { Move } from '../types'
import type { MatchState } from './types'
import { deriveEffectFeedEntries } from './effectFeed'

function makeState(): MatchState {
  return {
    config: {
      playerDeck: ['c02', 'c03', 'c12', 'c40', 'c32'],
      cpuDeck: ['c17', 'c42', 'c26', 'c01', 'c34'],
      mode: '3x3',
      rules: { open: true, same: false, plus: false },
      seed: 123,
      enableElementPowers: true,
      strictPowerTargeting: true,
      typeSynergy: {
        player: { primaryTypeId: null, secondaryTypeId: null },
        cpu: { primaryTypeId: null, secondaryTypeId: null },
      },
    },
    rules: { open: true, same: false, plus: false },
    typeSynergy: {
      player: { primaryTypeId: null, secondaryTypeId: null },
      cpu: { primaryTypeId: null, secondaryTypeId: null },
    },
    metrics: {
      playsByActor: { player: 0, cpu: 0 },
      samePlusTriggersByActor: { player: 0, cpu: 0 },
      cornerPlaysByActor: { player: 0, cpu: 0 },
    },
    turn: 'player',
    board: Array.from({ length: 9 }, () => null),
    hands: {
      player: ['c02', 'c03', 'c12'],
      cpu: ['c17', 'c42', 'c26'],
    },
    turns: 1,
    status: 'active',
    lastMove: null,
    elementState: {
      enabled: true,
      mode: 'effects',
      strictPowerTargeting: true,
      usedOnPoseByActor: { player: {}, cpu: {} },
      actorTurnCount: { player: 1, cpu: 1 },
      frozenCellByActor: {},
      floodedCell: null,
      poisonedHandByActor: { player: [], cpu: [] },
      boardEffectsByCell: {},
    },
  }
}

describe('deriveEffectFeedEntries', () => {
  test('captures flood and freeze events', () => {
    const previous = makeState()
    const next = makeState()
    if (!next.elementState) {
      throw new Error('Expected element state.')
    }
    next.elementState.floodedCell = 4
    next.elementState.frozenCellByActor.cpu = { cell: 5, turnsRemaining: 2 }
    const move: Move = { actor: 'player', cardId: 'c03', cell: 0, powerTarget: { targetCell: 4 } }

    const entries = deriveEffectFeedEntries(previous, next, move)
    const text = entries.map((entry) => entry.text).join(' ')

    expect(text).toContain('inondée')
    expect(text).toContain('gelée')
  })

  test('captures poisoned hand and on-pose usage', () => {
    const previous = makeState()
    const next = makeState()
    if (!next.elementState) {
      throw new Error('Expected element state.')
    }
    next.elementState.poisonedHandByActor.cpu = ['c42']
    next.elementState.usedOnPoseByActor.player.poison = true
    const move: Move = { actor: 'player', cardId: 'c11', cell: 1 }

    const entries = deriveEffectFeedEntries(previous, next, move)
    const text = entries.map((entry) => entry.text).join(' ')

    expect(text).toContain('empoisonnée')
    expect(text).toContain('Poison')
  })

  test('reports explicit normal-mode switch', () => {
    const previous = makeState()
    const next = makeState()
    if (!next.elementState) {
      throw new Error('Expected element state.')
    }
    next.elementState.mode = 'normal'
    const move: Move = { actor: 'player', cardId: 'c02', cell: 0 }

    const entries = deriveEffectFeedEntries(previous, next, move)

    expect(entries.some((entry) => entry.text.includes('Mode normal'))).toBe(true)
  })

  test('reports roche shield gain when charge is added', () => {
    const previous = makeState()
    const next = makeState()
    previous.board[4] = { owner: 'player', cardId: 'c32' }
    next.board[4] = { owner: 'player', cardId: 'c32' }
    if (!previous.elementState || !next.elementState) {
      throw new Error('Expected element state.')
    }
    previous.elementState.boardEffectsByCell[4] = {
      permanentDelta: { top: 0, right: 0, bottom: 0, left: 0 },
      burnTicksRemaining: 0,
      allStatsMinusOneStacks: [],
      unflippableUntilEndOfOpponentNextTurn: null,
      swappedHighLowUntilMatchEnd: false,
      rockShieldCharges: 0,
      poisonFirstCombatPending: false,
      insectEntryStacks: 0,
      dragonApplied: false,
    }
    next.elementState.boardEffectsByCell[4] = {
      ...previous.elementState.boardEffectsByCell[4]!,
      rockShieldCharges: 1,
    }
    const move: Move = { actor: 'player', cardId: 'c32', cell: 4 }

    const entries = deriveEffectFeedEntries(previous, next, move)

    expect(entries.some((entry) => entry.text.includes('gagne un bouclier'))).toBe(true)
  })

  test('reports roche shield consumption when charge is spent', () => {
    const previous = makeState()
    const next = makeState()
    previous.board[4] = { owner: 'player', cardId: 'c32' }
    next.board[4] = { owner: 'player', cardId: 'c32' }
    if (!previous.elementState || !next.elementState) {
      throw new Error('Expected element state.')
    }
    previous.elementState.boardEffectsByCell[4] = {
      permanentDelta: { top: 0, right: 0, bottom: 0, left: 0 },
      burnTicksRemaining: 0,
      allStatsMinusOneStacks: [],
      unflippableUntilEndOfOpponentNextTurn: null,
      swappedHighLowUntilMatchEnd: false,
      rockShieldCharges: 1,
      poisonFirstCombatPending: false,
      insectEntryStacks: 0,
      dragonApplied: false,
    }
    next.elementState.boardEffectsByCell[4] = {
      ...previous.elementState.boardEffectsByCell[4]!,
      rockShieldCharges: 0,
    }
    const move: Move = { actor: 'cpu', cardId: 'c17', cell: 1 }

    const entries = deriveEffectFeedEntries(previous, next, move)

    expect(entries.some((entry) => entry.text.includes('consommé'))).toBe(true)
  })

  test('reports a dedicated feed entry when sol applies a temporary all-stat malus', () => {
    const previous = makeState()
    const next = makeState()
    previous.board[4] = { owner: 'cpu', cardId: 'c17' }
    next.board[4] = { owner: 'cpu', cardId: 'c17' }
    if (!previous.elementState || !next.elementState) {
      throw new Error('Expected element state.')
    }
    previous.elementState.boardEffectsByCell[4] = {
      permanentDelta: { top: 0, right: 0, bottom: 0, left: 0 },
      burnTicksRemaining: 0,
      allStatsMinusOneStacks: [],
      unflippableUntilEndOfOpponentNextTurn: null,
      swappedHighLowUntilMatchEnd: false,
      rockShieldCharges: 0,
      poisonFirstCombatPending: false,
      insectEntryStacks: 0,
      dragonApplied: false,
    }
    next.elementState.boardEffectsByCell[4] = {
      ...previous.elementState.boardEffectsByCell[4]!,
      allStatsMinusOneStacks: [{ source: 'sol', actor: 'cpu', untilTurn: 2 }],
    }
    const move: Move = { actor: 'player', cardId: 'c45', cell: 3 }

    const entries = deriveEffectFeedEntries(previous, next, move)

    expect(entries.some((entry) => entry.text.includes('malus temporaire de Sol'))).toBe(true)
  })
})
