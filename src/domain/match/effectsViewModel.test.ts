import { describe, expect, test } from 'vitest'
import { getCard } from '../cards/cardPool'
import type { MatchState } from './types'
import { buildMatchEffectsViewModel } from './effectsViewModel'

function makeBaseState(): MatchState {
  return {
    config: {
      playerDeck: ['c01', 'c17', 'c42', 'c26', 'c32'],
      cpuDeck: ['c02', 'c03', 'c12', 'c34', 'c40'],
      mode: '3x3',
      rules: { open: true, same: false, plus: false },
      seed: 42,
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
      player: ['c17', 'c42', 'c26'],
      cpu: ['c02', 'c03', 'c12'],
    },
    turns: 2,
    status: 'active',
    lastMove: null,
    elementState: {
      enabled: true,
      mode: 'effects',
      strictPowerTargeting: true,
      usedOnPoseByActor: { player: {}, cpu: {} },
      actorTurnCount: { player: 2, cpu: 2 },
      frozenCellByActor: {},
      floodedCell: null,
      poisonedHandByActor: { player: [], cpu: [] },
      boardEffectsByCell: {},
    },
  }
}

describe('buildMatchEffectsViewModel', () => {
  test('returns reduced data and explicit badge in normal mode', () => {
    const state = makeBaseState()
    if (!state.elementState) {
      throw new Error('Expected element state.')
    }
    state.elementState.mode = 'normal'
    state.elementState.floodedCell = 4
    state.elementState.frozenCellByActor.player = 2
    state.elementState.poisonedHandByActor.player = ['c42']

    const view = buildMatchEffectsViewModel(state)

    expect(view.mode).toBe('normal')
    expect(view.globalIndicators.some((item) => item.key === 'mode-normal')).toBe(true)
    expect(Object.keys(view.cellIndicators)).toHaveLength(0)
    expect(Object.keys(view.boardCardIndicators)).toHaveLength(0)
    expect(view.handIndicatorsByActor.player.c42).toBeUndefined()
    expect(view.laneTypeSlotsByActor.player).toHaveLength(5)
    expect(view.laneTypeSlotsByActor.cpu).toHaveLength(5)
    expect(view.laneTypeSlotsByActor.player.every((slot) => slot.state === 'disabled')).toBe(true)
    expect(view.laneTypeSlotsByActor.cpu.every((slot) => slot.state === 'disabled')).toBe(true)
  })

  test('maps hazards and board effects to indicators and display stats', () => {
    const state = makeBaseState()
    if (!state.elementState) {
      throw new Error('Expected element state.')
    }
    state.elementState.floodedCell = 6
    state.elementState.frozenCellByActor.player = 5
    state.board[0] = { owner: 'cpu', cardId: 'c02' }
    state.elementState.boardEffectsByCell[0] = {
      permanentDelta: { top: -1, right: -1, bottom: -1, left: -1 },
      burnTicksRemaining: 2,
      volatileAllStatsMinusOneUntilEndOfOwnerNextTurn: null,
      unflippableUntilEndOfOpponentNextTurn: null,
      swappedHighLowUntilMatchEnd: false,
      rockShieldCharges: 0,
      poisonFirstCombatPending: true,
      insectEntryStacks: 0,
      dragonApplied: false,
    }

    const view = buildMatchEffectsViewModel(state)
    const fireIndicators = view.boardCardIndicators[0] ?? []
    const cellSixIndicators = view.cellIndicators[6] ?? []
    const cellFiveIndicators = view.cellIndicators[5] ?? []
    const stats = view.displayStatsByCell[0]

    expect(cellSixIndicators.some((item) => item.key === 'cell-flooded')).toBe(true)
    expect(cellFiveIndicators.some((item) => item.key === 'cell-frozen')).toBe(true)
    expect(fireIndicators.some((item) => item.key === 'card-burn')).toBe(true)
    expect(fireIndicators.some((item) => item.key === 'card-poison-first-combat')).toBe(true)
    expect(stats?.top.value).toBe(1)
    expect(stats?.top.trend).toBe('debuff')
    expect(stats?.right.trend).toBe('debuff')
  })

  test('shows public hand poison and on-pose power usage marker', () => {
    const state = makeBaseState()
    if (!state.elementState) {
      throw new Error('Expected element state.')
    }
    state.elementState.poisonedHandByActor.player = ['c42']
    state.elementState.usedOnPoseByActor.player.feu = true

    const view = buildMatchEffectsViewModel(state)
    const poisonedIndicators = view.handIndicatorsByActor.player.c42 ?? []
    const usedPowerIndicators = view.handIndicatorsByActor.player.c17 ?? []
    const poisonedPlayerStats = view.handDisplayStatsByActor.player.c42
    const poisonedCpuStats = view.handDisplayStatsByActor.cpu.c03

    expect(poisonedIndicators.some((item) => item.key === 'hand-poisoned')).toBe(true)
    expect(usedPowerIndicators.some((item) => item.key === 'hand-power-used')).toBe(true)
    expect(poisonedPlayerStats?.top.value).toBe(2)
    expect(poisonedPlayerStats?.top.trend).toBe('debuff')
    expect(poisonedCpuStats).toBeUndefined()
  })

  test('shows plante adjacency bonus and keeps combat bonus contextual only', () => {
    const state = makeBaseState()
    state.board[4] = { owner: 'player', cardId: 'c01' }
    state.board[1] = { owner: 'player', cardId: 'c03' }
    state.board[2] = { owner: 'player', cardId: 'c26' }

    const view = buildMatchEffectsViewModel(state)
    const planteIndicators = view.boardCardIndicators[4] ?? []
    const combatIndicators = view.boardCardIndicators[2] ?? []
    const planteStats = view.displayStatsByCell[4]
    const combatStats = view.displayStatsByCell[2]

    expect(planteIndicators.some((item) => item.key === 'card-plante-pack')).toBe(true)
    expect(combatIndicators.some((item) => item.key === 'card-combat-attack')).toBe(true)
    expect(planteStats?.top.value).toBe(3)
    expect(planteStats?.top.trend).toBe('buff')
    expect(combatStats?.top.value).toBe(3)
    expect(combatStats?.top.trend).toBe('neutral')
  })

  test('marks duplicated type slots as used when one card of that type was already played', () => {
    const state = makeBaseState()
    if (!state.elementState) {
      throw new Error('Expected element state.')
    }

    state.config.playerDeck = ['c03', 'c25', 'c17', 'c26', 'c32']
    state.hands.player = ['c25', 'c17', 'c26', 'c32']

    const view = buildMatchEffectsViewModel(state)
    const playerSlots = view.laneTypeSlotsByActor.player

    expect(playerSlots).toHaveLength(4)
    const waterSlots = playerSlots.filter((slot) => slot.elementId === 'eau')
    expect(waterSlots).toHaveLength(1)
    expect(waterSlots[0]?.state).toBe('used')
  })

  test('marks duplicated type slots as used when on-pose type power is consumed', () => {
    const state = makeBaseState()
    if (!state.elementState) {
      throw new Error('Expected element state.')
    }

    state.config.playerDeck = ['c03', 'c25', 'c17', 'c26', 'c32']
    state.hands.player = ['c03', 'c25', 'c17', 'c26', 'c32']
    state.elementState.usedOnPoseByActor.player.eau = true

    const view = buildMatchEffectsViewModel(state)
    const playerSlots = view.laneTypeSlotsByActor.player

    expect(playerSlots).toHaveLength(4)
    const waterSlots = playerSlots.filter((slot) => slot.elementId === 'eau')
    expect(waterSlots).toHaveLength(1)
    expect(waterSlots[0]?.state).toBe('used')
  })

  test('builds lane type slots per actor from unique deck types in 4x4 mode', () => {
    const state = makeBaseState()
    state.config.mode = '4x4'
    state.board = Array.from({ length: 16 }, () => null)
    state.config.playerDeck = ['c01', 'c17', 'c42', 'c26', 'c32', 'c11', 'c12', 'c40']
    state.config.cpuDeck = ['c02', 'c03', 'c25', 'c34', 'c72', 'c73', 'c74', 'c75']
    state.hands.player = [...state.config.playerDeck]
    state.hands.cpu = [...state.config.cpuDeck]

    const view = buildMatchEffectsViewModel(state)
    const expectedPlayerTypes = new Set(state.config.playerDeck.map((cardId) => getCard(cardId).elementId))
    const expectedCpuTypes = new Set(state.config.cpuDeck.map((cardId) => getCard(cardId).elementId))

    expect(view.laneTypeSlotsByActor.player).toHaveLength(expectedPlayerTypes.size)
    expect(view.laneTypeSlotsByActor.cpu).toHaveLength(expectedCpuTypes.size)
  })
})
