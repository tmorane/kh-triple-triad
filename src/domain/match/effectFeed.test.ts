import { describe, expect, test } from 'vitest'
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
    next.elementState.frozenCellByActor.cpu = 5
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
})
