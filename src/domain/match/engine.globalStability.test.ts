import { describe, expect, test } from 'bun:test'
import { cardPool, getCard } from '../cards/cardPool'
import { createSeededRng } from '../random/seededRng'
import type { CardElementId, CardId, MatchConfig, MatchMode, Move, MovePowerTarget } from '../types'
import { selectCpuMove, type CpuAiProfile } from './ai'
import { applyMoveDetailed, createMatch, listLegalMoves, listMovePowerTargetOptions } from './engine'
import { getModeSpec } from './modeSpec'
import type { MatchState } from './types'

const actorList = ['player', 'cpu'] as const
const aiProfiles: CpuAiProfile[] = ['novice', 'standard', 'expert']
const availableElements = [...new Set(cardPool.map((card) => card.elementId))]

function pickDistinctCardIds(count: number, seed: number, requiredCardIds: CardId[] = []): CardId[] {
  const rng = createSeededRng(seed)
  const selected = new Set<CardId>(requiredCardIds)
  const allCardIds = cardPool.map((card) => card.id)

  if (selected.size > count) {
    return [...selected].slice(0, count)
  }

  while (selected.size < count) {
    selected.add(allCardIds[rng.nextInt(allCardIds.length)]!)
  }

  return [...selected]
}

function buildConfig(mode: MatchMode, seed: number, options?: { strictPowerTargeting?: boolean; forcedPlayerCardId?: CardId }): MatchConfig {
  const deckSize = getModeSpec(mode).deckSize
  const playerDeck = pickDistinctCardIds(deckSize, seed + 11, options?.forcedPlayerCardId ? [options.forcedPlayerCardId] : [])
  const cpuDeck = pickDistinctCardIds(deckSize, seed + 23)

  return {
    playerDeck,
    cpuDeck,
    mode,
    rules: { open: true, same: true, plus: true },
    seed,
    startingTurn: (seed & 1) === 0 ? 'player' : 'cpu',
    enableElementPowers: true,
    strictPowerTargeting: options?.strictPowerTargeting ?? false,
    typeSynergy: {
      player: { primaryTypeId: null, secondaryTypeId: null },
      cpu: { primaryTypeId: null, secondaryTypeId: null },
    },
  }
}

function toPowerTarget(kind: 'targetCell' | 'targetCardCell', targetCell: number): MovePowerTarget {
  return kind === 'targetCell' ? { targetCell } : { targetCardCell: targetCell }
}

function buildMoveWithPowerTarget(state: MatchState, move: Move, rngSeed: number): Move {
  const options = listMovePowerTargetOptions(state, move)
  if (!options || options.cells.length === 0) {
    return move
  }

  const rng = createSeededRng(rngSeed)
  const pickedTargetCell = options.cells[rng.nextInt(options.cells.length)]!
  return {
    ...move,
    powerTarget: toPowerTarget(options.kind, pickedTargetCell),
  }
}

function assertStateInvariants(state: MatchState) {
  const modeSpec = getModeSpec(state.config.mode)
  const occupiedCount = state.board.filter((slot) => slot !== null).length
  const totalCardsInHands = state.hands.player.length + state.hands.cpu.length

  expect(state.board).toHaveLength(modeSpec.cellCount)
  expect(state.turns).toBe(occupiedCount)
  expect(totalCardsInHands).toBe(modeSpec.deckSize * 2 - state.turns)
  expect(state.turns).toBeLessThanOrEqual(modeSpec.cellCount)

  for (const actor of actorList) {
    const frozenCell = state.elementState?.frozenCellByActor[actor]
    if (!frozenCell) {
      continue
    }
    expect(frozenCell.turnsRemaining).toBeGreaterThan(0)
    expect(frozenCell.cell).toBeGreaterThanOrEqual(0)
    expect(frozenCell.cell).toBeLessThan(modeSpec.cellCount)
    expect(state.board[frozenCell.cell]).toBeNull()
  }

  const legalMoves = listLegalMoves(state)
  for (const move of legalMoves) {
    expect(move.actor).toBe(state.turn)
    expect(state.board[move.cell]).toBeNull()
    expect(state.hands[move.actor]).toContain(move.cardId)
  }

  if (state.status === 'active') {
    expect(state.turns).toBeLessThan(modeSpec.cellCount)
    expect(legalMoves.length).toBeGreaterThan(0)
  } else {
    expect(state.turns).toBe(modeSpec.cellCount)
    expect(occupiedCount).toBe(modeSpec.cellCount)
  }
}

function runSimulatedMatch(config: MatchConfig, simulationSeed: number, options?: { forcePlayerCardId?: CardId }) {
  let state = createMatch(config)
  const seenElements = new Set<CardElementId>()
  const maxTurns = getModeSpec(config.mode).cellCount
  let forcedCardPlayed = false

  for (let turnIndex = 0; turnIndex < maxTurns; turnIndex += 1) {
    assertStateInvariants(state)
    expect(state.status).toBe('active')

    const legalMoves = listLegalMoves(state)
    expect(legalMoves.length).toBeGreaterThan(0)

    let selectedMove: Move
    if (!forcedCardPlayed && options?.forcePlayerCardId && state.turn === 'player') {
      const forcedMove = legalMoves.find((move) => move.cardId === options.forcePlayerCardId)
      if (forcedMove) {
        selectedMove = forcedMove
        forcedCardPlayed = true
      } else {
        const rng = createSeededRng(simulationSeed + turnIndex * 53 + 17)
        selectedMove = legalMoves[rng.nextInt(legalMoves.length)]!
      }
    } else if (state.turn === 'cpu' && legalMoves.length > 1) {
      const aiProfile = aiProfiles[(simulationSeed + turnIndex) % aiProfiles.length]!
      selectedMove = selectCpuMove(state, aiProfile)
    } else {
      const rng = createSeededRng(simulationSeed + turnIndex * 53 + 17)
      selectedMove = legalMoves[rng.nextInt(legalMoves.length)]!
    }

    const moveWithTarget = buildMoveWithPowerTarget(state, selectedMove, simulationSeed + turnIndex * 97 + 31)
    const resolution = applyMoveDetailed(state, moveWithTarget)
    state = resolution.state
    seenElements.add(getCard(moveWithTarget.cardId).elementId)
  }

  assertStateInvariants(state)
  expect(state.status).toBe('finished')
  return seenElements
}

describe('match engine global stability', () => {
  test('randomized matches never deadlock and always finish in effects mode', () => {
    const modes: MatchMode[] = ['3x3', '4x4']

    for (const mode of modes) {
      for (let index = 0; index < 90; index += 1) {
        const seed = 10_000 + index * 13 + (mode === '4x4' ? 10_000 : 0)
        const strictPowerTargeting = index % 2 === 0
        const config = buildConfig(mode, seed, { strictPowerTargeting })
        runSimulatedMatch(config, seed + 7)
      }
    }
  })

  test('element coverage campaign plays at least one card of every available element', () => {
    const seenElements = new Set<CardElementId>()
    const modes: MatchMode[] = ['3x3', '4x4']

    let baseSeed = 40_000
    for (const elementId of availableElements) {
      const anchorCard = cardPool.find((card) => card.elementId === elementId)
      expect(anchorCard).toBeDefined()

      for (const mode of modes) {
        const config = buildConfig(mode, baseSeed, {
          strictPowerTargeting: true,
          forcedPlayerCardId: anchorCard?.id,
        })
        const localSeen = runSimulatedMatch(config, baseSeed + 101, { forcePlayerCardId: anchorCard?.id })
        for (const seenElement of localSeen) {
          seenElements.add(seenElement)
        }
        baseSeed += 137
      }
    }

    for (const elementId of availableElements) {
      expect(seenElements.has(elementId)).toBe(true)
    }
  })
})
