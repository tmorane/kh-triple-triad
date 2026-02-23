import { getCard } from '../cards/cardPool'
import type { Actor, CardId, MatchConfig, MatchMetrics, MatchResult, MatchTypeSynergyState, Move } from '../types'
import { getModeSpec } from './modeSpec'
import type { MatchState } from './types'

type Direction = 'up' | 'right' | 'down' | 'left'
type DirectionalBonus = Record<Direction, number>

interface AdjacentEnemy {
  directionFromSource: Direction
  cell: number
  enemyCardId: CardId
}

export interface MoveResolutionDetails {
  state: MatchState
  flippedCells: number[]
  immediateFlips: number
  wasSpecialRuleTrigger: boolean
}

const oppositeDirection: Record<Direction, Direction> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right',
}

const neighborDelta: Record<Direction, [number, number]> = {
  up: [-1, 0],
  right: [0, 1],
  down: [1, 0],
  left: [0, -1],
}

function createEmptyTypeSynergyState(): MatchTypeSynergyState {
  return {
    player: { primaryTypeId: null, secondaryTypeId: null },
    cpu: { primaryTypeId: null, secondaryTypeId: null },
  }
}

function cloneTypeSynergyState(typeSynergy: MatchTypeSynergyState | undefined): MatchTypeSynergyState {
  const source = typeSynergy ?? createEmptyTypeSynergyState()
  return {
    player: { ...source.player },
    cpu: { ...source.cpu },
  }
}

function createEmptyMatchMetrics(): MatchMetrics {
  return {
    playsByActor: { player: 0, cpu: 0 },
    samePlusTriggersByActor: { player: 0, cpu: 0 },
    cornerPlaysByActor: { player: 0, cpu: 0 },
  }
}

function cloneMatchMetrics(metrics: MatchMetrics): MatchMetrics {
  return {
    playsByActor: { ...metrics.playsByActor },
    samePlusTriggersByActor: { ...metrics.samePlusTriggersByActor },
    cornerPlaysByActor: { ...metrics.cornerPlaysByActor },
  }
}

export function createMatch(config: MatchConfig): MatchState {
  validateMatchConfig(config)
  const modeSpec = getModeSpec(config.mode)
  const typeSynergy = cloneTypeSynergyState(config.typeSynergy)

  return {
    config: {
      playerDeck: [...config.playerDeck],
      cpuDeck: [...config.cpuDeck],
      mode: config.mode,
      rules: { ...config.rules },
      seed: config.seed,
      startingTurn: config.startingTurn,
      typeSynergy,
    },
    rules: { ...config.rules },
    typeSynergy,
    metrics: createEmptyMatchMetrics(),
    turn: config.startingTurn ?? 'player',
    board: Array.from({ length: modeSpec.cellCount }, () => null),
    hands: {
      player: [...config.playerDeck],
      cpu: [...config.cpuDeck],
    },
    turns: 0,
    status: 'active',
    lastMove: null,
  }
}

export function listLegalMoves(state: MatchState): Move[] {
  if (state.status === 'finished') {
    return []
  }

  const emptyCells = state.board
    .map((slot, index) => ({ slot, index }))
    .filter((entry) => entry.slot === null)
    .map((entry) => entry.index)

  const actor = state.turn
  const legalMoves: Move[] = []
  for (const cardId of state.hands[actor]) {
    for (const cell of emptyCells) {
      legalMoves.push({ actor, cardId, cell })
    }
  }

  return legalMoves
}

export function applyMove(state: MatchState, move: Move): MatchState {
  return applyMoveDetailed(state, move).state
}

export function applyMoveDetailed(state: MatchState, move: Move): MoveResolutionDetails {
  assertMoveIsValid(state, move)

  const nextState = cloneState(state)
  const actor = move.actor
  const opponent: Actor = actor === 'player' ? 'cpu' : 'player'

  nextState.board[move.cell] = { cardId: move.cardId, owner: actor }
  nextState.hands[actor] = nextState.hands[actor].filter((cardId) => cardId !== move.cardId)

  const adjacentEnemies = getAdjacentEnemies(nextState, move.cell, actor)
  const sourceSideBonuses = getSourceSideBonuses(nextState, move)
  const normalFlipSet = collectNormalFlipSet(move.cardId, adjacentEnemies, sourceSideBonuses)
  const sameFlipSet = nextState.rules.same
    ? collectSameFlipSet(move.cardId, adjacentEnemies, sourceSideBonuses)
    : new Set<number>()
  const plusFlipSet = nextState.rules.plus
    ? collectPlusFlipSet(move.cardId, adjacentEnemies, sourceSideBonuses)
    : new Set<number>()

  const specialFlipSet = unionSets(sameFlipSet, plusFlipSet)
  const wasSpecialRuleTrigger = specialFlipSet.size > 0
  const immediateFlipSet = unionSets(normalFlipSet, specialFlipSet)

  for (const cell of immediateFlipSet) {
    const slot = nextState.board[cell]
    if (slot) {
      slot.owner = actor
    }
  }

  if (wasSpecialRuleTrigger) {
    runComboChain(nextState, actor, opponent, specialFlipSet)
  }

  const boardSize = getModeSpec(nextState.config.mode).boardSize
  nextState.metrics.playsByActor[actor] += 1
  if (isCornerCell(move.cell, boardSize)) {
    nextState.metrics.cornerPlaysByActor[actor] += 1
  }
  if (wasSpecialRuleTrigger) {
    nextState.metrics.samePlusTriggersByActor[actor] += 1
  }

  nextState.turns += 1
  nextState.lastMove = move
  nextState.status = isFinished(nextState) ? 'finished' : 'active'
  if (nextState.status === 'active') {
    nextState.turn = opponent
  }

  return {
    state: nextState,
    flippedCells: [...immediateFlipSet],
    immediateFlips: immediateFlipSet.size,
    wasSpecialRuleTrigger,
  }
}

export function resolveMatchResult(state: MatchState): MatchResult {
  const { playerCount, cpuCount } = countBoardOwners(state)

  return {
    mode: state.config.mode,
    winner: playerCount === cpuCount ? 'draw' : playerCount > cpuCount ? 'player' : 'cpu',
    playerCount,
    cpuCount,
    turns: state.turns,
    rules: { ...state.rules },
    typeSynergy: cloneTypeSynergyState(state.typeSynergy),
    metrics: cloneMatchMetrics(state.metrics),
  }
}

function validateMatchConfig(config: MatchConfig) {
  const modeSpec = getModeSpec(config.mode)
  if (new Set(config.playerDeck).size !== modeSpec.deckSize || config.playerDeck.length !== modeSpec.deckSize) {
    throw new Error(`Player deck must contain exactly ${modeSpec.deckSize} unique cards.`)
  }
  if (new Set(config.cpuDeck).size !== modeSpec.deckSize || config.cpuDeck.length !== modeSpec.deckSize) {
    throw new Error(`CPU deck must contain exactly ${modeSpec.deckSize} unique cards.`)
  }
}

function assertMoveIsValid(state: MatchState, move: Move) {
  const modeSpec = getModeSpec(state.config.mode)

  if (state.status === 'finished') {
    throw new Error('Cannot play a move on a finished match.')
  }
  if (state.turn !== move.actor) {
    throw new Error(`It is ${state.turn}'s turn, not ${move.actor}'s turn.`)
  }
  if (!state.hands[move.actor].includes(move.cardId)) {
    throw new Error(`${move.actor} does not have card ${move.cardId} in hand.`)
  }
  if (!Number.isInteger(move.cell) || move.cell < 0 || move.cell >= modeSpec.cellCount) {
    throw new Error(`Cell ${move.cell} is out of bounds for ${state.config.mode}.`)
  }
  if (state.board[move.cell] !== null) {
    throw new Error(`Cell ${move.cell} is already occupied.`)
  }
}

function cloneState(state: MatchState): MatchState {
  return {
    config: {
      playerDeck: [...state.config.playerDeck],
      cpuDeck: [...state.config.cpuDeck],
      mode: state.config.mode,
      rules: { ...state.config.rules },
      seed: state.config.seed,
      startingTurn: state.config.startingTurn,
      typeSynergy: cloneTypeSynergyState(state.config.typeSynergy),
    },
    rules: { ...state.rules },
    typeSynergy: cloneTypeSynergyState(state.typeSynergy),
    metrics: cloneMatchMetrics(state.metrics),
    turn: state.turn,
    board: state.board.map((slot) => (slot ? { ...slot } : null)),
    hands: {
      player: [...state.hands.player],
      cpu: [...state.hands.cpu],
    },
    turns: state.turns,
    status: state.status,
    lastMove: state.lastMove ? { ...state.lastMove } : null,
  }
}

function countBoardOwners(state: MatchState) {
  let playerCount = 0
  let cpuCount = 0

  for (const slot of state.board) {
    if (!slot) {
      continue
    }
    if (slot.owner === 'player') {
      playerCount += 1
    } else {
      cpuCount += 1
    }
  }

  return { playerCount, cpuCount }
}

function isFinished(state: MatchState): boolean {
  if (state.turns >= getModeSpec(state.config.mode).cellCount) {
    return true
  }
  return state.board.every((slot) => slot !== null)
}

function getAdjacentEnemies(state: MatchState, sourceCell: number, sourceOwner: Actor): AdjacentEnemy[] {
  const result: AdjacentEnemy[] = []
  const boardSize = getModeSpec(state.config.mode).boardSize

  for (const [direction, cell] of getNeighbors(sourceCell, boardSize)) {
    const slot = state.board[cell]
    if (!slot || slot.owner === sourceOwner) {
      continue
    }

    result.push({
      directionFromSource: direction,
      cell,
      enemyCardId: slot.cardId,
    })
  }

  return result
}

function collectNormalFlipSet(
  sourceCardId: CardId,
  adjacentEnemies: AdjacentEnemy[],
  sourceSideBonuses: DirectionalBonus,
): Set<number> {
  const sourceCard = getCard(sourceCardId)
  const result = new Set<number>()

  for (const adjacent of adjacentEnemies) {
    const enemyCard = getCard(adjacent.enemyCardId)
    const attackerValue = getSideValue(sourceCard, adjacent.directionFromSource) + sourceSideBonuses[adjacent.directionFromSource]
    const defenderValue = getSideValue(enemyCard, oppositeDirection[adjacent.directionFromSource])

    if (attackerValue > defenderValue) {
      result.add(adjacent.cell)
    }
  }

  return result
}

function collectSameFlipSet(
  sourceCardId: CardId,
  adjacentEnemies: AdjacentEnemy[],
  sourceSideBonuses: DirectionalBonus,
): Set<number> {
  const sourceCard = getCard(sourceCardId)
  const matchingCells: number[] = []

  for (const adjacent of adjacentEnemies) {
    const enemyCard = getCard(adjacent.enemyCardId)
    const sourceValue = getSideValue(sourceCard, adjacent.directionFromSource) + sourceSideBonuses[adjacent.directionFromSource]
    const enemyValue = getSideValue(enemyCard, oppositeDirection[adjacent.directionFromSource])

    if (sourceValue === enemyValue) {
      matchingCells.push(adjacent.cell)
    }
  }

  return matchingCells.length >= 2 ? new Set(matchingCells) : new Set<number>()
}

function collectPlusFlipSet(
  sourceCardId: CardId,
  adjacentEnemies: AdjacentEnemy[],
  sourceSideBonuses: DirectionalBonus,
): Set<number> {
  const sourceCard = getCard(sourceCardId)
  const bySum = new Map<number, number[]>()

  for (const adjacent of adjacentEnemies) {
    const enemyCard = getCard(adjacent.enemyCardId)
    const sourceValue = getSideValue(sourceCard, adjacent.directionFromSource) + sourceSideBonuses[adjacent.directionFromSource]
    const enemyValue = getSideValue(enemyCard, oppositeDirection[adjacent.directionFromSource])
    const sum = sourceValue + enemyValue
    const cells = bySum.get(sum) ?? []
    cells.push(adjacent.cell)
    bySum.set(sum, cells)
  }

  const result = new Set<number>()
  for (const cells of bySum.values()) {
    if (cells.length >= 2) {
      cells.forEach((cell) => result.add(cell))
    }
  }

  return result
}

function runComboChain(state: MatchState, actor: Actor, opponent: Actor, seedCells: Set<number>) {
  const queue = [...seedCells]
  const boardSize = getModeSpec(state.config.mode).boardSize

  while (queue.length > 0) {
    const sourceCell = queue.shift()!
    const sourceSlot = state.board[sourceCell]
    if (!sourceSlot || sourceSlot.owner !== actor) {
      continue
    }

    const sourceCard = getCard(sourceSlot.cardId)

    for (const [direction, neighborCell] of getNeighbors(sourceCell, boardSize)) {
      const neighborSlot = state.board[neighborCell]
      if (!neighborSlot || neighborSlot.owner !== opponent) {
        continue
      }

      const attackerValue = getSideValue(sourceCard, direction)
      const defenderValue = getSideValue(getCard(neighborSlot.cardId), oppositeDirection[direction])
      if (attackerValue <= defenderValue) {
        continue
      }

      neighborSlot.owner = actor
      queue.push(neighborCell)
    }
  }
}

function getSourceSideBonuses(state: MatchState, move: Move): DirectionalBonus {
  const bonuses: DirectionalBonus = { up: 0, right: 0, down: 0, left: 0 }
  const actorSynergy = state.typeSynergy[move.actor]
  const primaryTypeId = actorSynergy.primaryTypeId
  if (!primaryTypeId) {
    return bonuses
  }

  if (primaryTypeId === 'sans_coeur' && state.metrics.playsByActor[move.actor] === 0) {
    bonuses.up += 1
    bonuses.right += 1
    bonuses.down += 1
    bonuses.left += 1
  }

  if (primaryTypeId === 'simili') {
    const boardSize = getModeSpec(state.config.mode).boardSize
    for (const direction of getActiveCornerDirections(move.cell, boardSize)) {
      bonuses[direction] += 1
    }
  }

  return bonuses
}

function getActiveCornerDirections(cell: number, boardSize: number): Direction[] {
  const topLeft = 0
  const topRight = boardSize - 1
  const bottomLeft = boardSize * (boardSize - 1)
  const bottomRight = boardSize * boardSize - 1

  if (cell === topLeft) {
    return ['right', 'down']
  }
  if (cell === topRight) {
    return ['left', 'down']
  }
  if (cell === bottomLeft) {
    return ['up', 'right']
  }
  if (cell === bottomRight) {
    return ['up', 'left']
  }
  return []
}

function isCornerCell(cell: number, boardSize: number): boolean {
  const topRight = boardSize - 1
  const bottomLeft = boardSize * (boardSize - 1)
  const bottomRight = boardSize * boardSize - 1
  return cell === 0 || cell === topRight || cell === bottomLeft || cell === bottomRight
}

function unionSets<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a, ...b])
}

function getNeighbors(cell: number, boardSize: number): Array<[Direction, number]> {
  const row = Math.floor(cell / boardSize)
  const col = cell % boardSize
  const neighbors: Array<[Direction, number]> = []

  for (const direction of Object.keys(neighborDelta) as Direction[]) {
    const [dr, dc] = neighborDelta[direction]
    const nextRow = row + dr
    const nextCol = col + dc
    if (nextRow < 0 || nextRow >= boardSize || nextCol < 0 || nextCol >= boardSize) {
      continue
    }
    neighbors.push([direction, nextRow * boardSize + nextCol])
  }

  return neighbors
}

function getSideValue(card: ReturnType<typeof getCard>, direction: Direction): number {
  switch (direction) {
    case 'up':
      return card.top
    case 'right':
      return card.right
    case 'down':
      return card.bottom
    case 'left':
      return card.left
  }
}
