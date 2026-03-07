import { getCard } from '../cards/cardPool'
import type { Actor, Move } from '../types'
import { applyMoveDetailed, listLegalMoves } from './engine'
import { getModeSpec } from './modeSpec'
import type { MatchState } from './types'

type Direction = 'up' | 'right' | 'down' | 'left'
export type CpuAiProfile = 'novice' | 'standard' | 'expert'

interface ScoredMove {
  move: Move
  score: number
  immediateFlips: number
  exposureRisk: number
  cornerBonus: number
  centerBonus: number
  lookaheadScore: number
}

interface AiTuning {
  flipWeight: number
  riskWeight: number
  cornerWeight: number
  centerWeight: number
  lookaheadWeight: number
}

const aiTuningByProfile: Record<CpuAiProfile, AiTuning> = {
  novice: {
    flipWeight: 70,
    riskWeight: 4,
    cornerWeight: 2,
    centerWeight: 6,
    lookaheadWeight: 0,
  },
  standard: {
    flipWeight: 100,
    riskWeight: 8,
    cornerWeight: 6,
    centerWeight: 4,
    lookaheadWeight: 0,
  },
  expert: {
    flipWeight: 120,
    riskWeight: 14,
    cornerWeight: 8,
    centerWeight: 3,
    lookaheadWeight: 0.45,
  },
}

const oppositeDirection: Record<Direction, Direction> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right',
}

const directionDelta: Record<Direction, [number, number]> = {
  up: [-1, 0],
  right: [0, 1],
  down: [1, 0],
  left: [0, -1],
}

export function selectCpuMove(state: MatchState, aiProfile: CpuAiProfile = 'standard'): Move {
  if (state.status !== 'active') {
    throw new Error('Cannot pick a move for a finished match.')
  }
  if (state.turn !== 'cpu') {
    throw new Error('CPU move requested when it is not CPU turn.')
  }

  const legalMoves = listLegalMoves(state)
  if (legalMoves.length === 0) {
    throw new Error('No legal moves available for CPU.')
  }
  const boardSize = getModeSpec(state.config.mode).boardSize

  const scoredMoves = legalMoves.map((move) => scoreMove(state, move, aiProfile))

  scoredMoves.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    if (b.immediateFlips !== a.immediateFlips) {
      return b.immediateFlips - a.immediateFlips
    }

    const zoneDelta = zonePriority(b.move.cell, boardSize) - zonePriority(a.move.cell, boardSize)
    if (zoneDelta !== 0) {
      return zoneDelta
    }

    const cardDelta = a.move.cardId.localeCompare(b.move.cardId)
    if (cardDelta !== 0) {
      return cardDelta
    }

    return a.move.cell - b.move.cell
  })

  return scoredMoves[0].move
}

function scoreMove(state: MatchState, move: Move, aiProfile: CpuAiProfile): ScoredMove {
  const boardSize = getModeSpec(state.config.mode).boardSize
  const tuning = aiTuningByProfile[aiProfile]
  const resolution = applyMoveDetailed(state, move)
  const immediateFlips = resolution.immediateFlips
  const exposureRisk = calculateExposureRisk(resolution.state, move.cell)
  const cornerBonus = isCorner(move.cell, boardSize) ? 1 : 0
  const centerBonus = isCenter(move.cell, boardSize) ? 1 : 0
  const lookaheadScore =
    tuning.lookaheadWeight > 0 ? calculateWorstCaseCpuLeadAfterPlayerTurn(resolution.state) * tuning.lookaheadWeight * 20 : 0
  const score =
    immediateFlips * tuning.flipWeight -
    exposureRisk * tuning.riskWeight +
    cornerBonus * tuning.cornerWeight +
    centerBonus * tuning.centerWeight +
    lookaheadScore

  return {
    move,
    score,
    immediateFlips,
    exposureRisk,
    cornerBonus,
    centerBonus,
    lookaheadScore,
  }
}

function calculateWorstCaseCpuLeadAfterPlayerTurn(state: MatchState): number {
  if (state.status !== 'active' || state.turn !== 'player') {
    return countCpuLead(state)
  }

  const playerMoves = listLegalMoves(state).filter((move) => move.actor === 'player')
  if (playerMoves.length === 0) {
    return countCpuLead(state)
  }

  let worstLead = Number.POSITIVE_INFINITY
  for (const playerMove of playerMoves) {
    let afterPlayer: MatchState
    try {
      afterPlayer = applyMoveDetailed(state, playerMove).state
    } catch {
      continue
    }
    const lead = countCpuLead(afterPlayer)
    if (lead < worstLead) {
      worstLead = lead
    }
  }

  if (!Number.isFinite(worstLead)) {
    return countCpuLead(state)
  }

  return worstLead
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

function calculateExposureRisk(state: MatchState, placedCell: number): number {
  const placedSlot = state.board[placedCell]
  if (!placedSlot || placedSlot.owner !== 'cpu') {
    return 0
  }

  const placedCard = getCard(placedSlot.cardId)
  const playerCards = state.hands.player
  let risk = 0

  for (const [, directionFromNeighborToPlaced] of getEmptyNeighborCells(placedCell, state)) {
    const canCapture = playerCards.some((cardId) => {
      const attacker = getCard(cardId)
      const attackerValue = getSide(attacker, directionFromNeighborToPlaced)
      const defenderValue = getSide(placedCard, oppositeDirection[directionFromNeighborToPlaced])
      return attackerValue > defenderValue
    })

    if (canCapture) {
      risk += 1
    }
  }

  return risk
}

function getEmptyNeighborCells(placedCell: number, state: MatchState): Array<[number, Direction]> {
  const neighbors: Array<[number, Direction]> = []
  const boardSize = getModeSpec(state.config.mode).boardSize

  for (const [direction, cell] of getNeighbors(placedCell, boardSize)) {
    if (state.board[cell] !== null) {
      continue
    }

    neighbors.push([cell, oppositeDirection[direction]])
  }

  return neighbors
}

function getNeighbors(cell: number, boardSize: number): Array<[Direction, number]> {
  const row = Math.floor(cell / boardSize)
  const col = cell % boardSize
  const neighbors: Array<[Direction, number]> = []

  for (const direction of Object.keys(directionDelta) as Direction[]) {
    const [dr, dc] = directionDelta[direction]
    const nextRow = row + dr
    const nextCol = col + dc
    if (nextRow < 0 || nextRow >= boardSize || nextCol < 0 || nextCol >= boardSize) {
      continue
    }
    neighbors.push([direction, nextRow * boardSize + nextCol])
  }

  return neighbors
}

function zonePriority(cell: number, boardSize: number): number {
  if (isCenter(cell, boardSize)) {
    return 3
  }
  if (isCorner(cell, boardSize)) {
    return 2
  }
  return 1
}

function isCorner(cell: number, boardSize: number): boolean {
  const last = boardSize * boardSize - 1
  return cell === 0 || cell === boardSize - 1 || cell === last - (boardSize - 1) || cell === last
}

function isCenter(cell: number, boardSize: number): boolean {
  const row = Math.floor(cell / boardSize)
  const col = cell % boardSize
  if (boardSize % 2 === 1) {
    const center = Math.floor(boardSize / 2)
    return row === center && col === center
  }

  const centerLow = boardSize / 2 - 1
  const centerHigh = centerLow + 1
  return (row === centerLow || row === centerHigh) && (col === centerLow || col === centerHigh)
}

function getSide(card: ReturnType<typeof getCard>, direction: Direction): number {
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

export function selectFirstLegalMove(state: MatchState, actor: Actor): Move {
  const legalMoves = listLegalMoves(state).filter((move) => move.actor === actor)
  if (!legalMoves[0]) {
    throw new Error(`No legal move for ${actor}.`)
  }
  return legalMoves[0]
}
