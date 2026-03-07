import { describe, expect, test } from 'bun:test'
import type { MatchConfig } from '../types'
import { applyMove, createMatch } from './engine'

function makeConfig(): MatchConfig {
  return {
    playerDeck: ['c01', 'c02', 'c03', 'c04', 'c05'],
    cpuDeck: ['c06', 'c07', 'c08', 'c10', 'c11'],
    mode: '3x3',
    rules: { open: true, same: false, plus: false },
    seed: 99,
    enableElementPowers: true,
    strictPowerTargeting: false,
  }
}

describe('match freeze duration', () => {
  test('frozen cell blocks exactly one turn of the targeted actor', () => {
    const state = createMatch(makeConfig())
    if (!state.elementState) {
      throw new Error('Expected element state.')
    }
    state.elementState.frozenCellByActor.cpu = { cell: 4, turnsRemaining: 1 }

    const afterPlayerOne = applyMove(state, { actor: 'player', cardId: 'c01', cell: 8 })
    expect(() => applyMove(afterPlayerOne, { actor: 'cpu', cardId: 'c06', cell: 4 })).toThrow('Cell 4 is frozen for cpu.')

    const afterCpuOne = applyMove(afterPlayerOne, { actor: 'cpu', cardId: 'c06', cell: 0 })
    expect(afterCpuOne.elementState?.frozenCellByActor.cpu).toBeUndefined()

    const afterPlayerTwo = applyMove(afterCpuOne, { actor: 'player', cardId: 'c02', cell: 7 })
    const afterCpuTwo = applyMove(afterPlayerTwo, { actor: 'cpu', cardId: 'c07', cell: 4 })

    expect(afterCpuTwo.board[4]?.owner).toBe('cpu')
  })
})
