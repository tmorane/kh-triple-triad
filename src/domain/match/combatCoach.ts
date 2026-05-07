import { getCard } from '../cards/cardPool'
import { getElementLabel } from '../cards/taxonomy'
import type { CardElementId, CardId, Move } from '../types'
import { applyMoveDetailed, listMovePowerTargetOptions } from './engine'
import { getModeSpec } from './modeSpec'
import type { MatchState, MoveFlipEvent } from './types'

export interface CombatCoachMessage {
  title: string
  body: string
  detail: string
}

export interface CombatCoachInput {
  state: MatchState
  selectedCardId: CardId | null
  focusedCell: number | null
  legalMoves: Move[]
  flipEvents?: MoveFlipEvent[]
  powerTargeting?: {
    elementId: CardElementId
    targetCells: number[]
  } | null
}

function formatCell(cell: number): string {
  return `C${cell + 1}`
}

function formatBoardCell(state: MatchState, cell: number): string {
  const boardSize = getModeSpec(state.config.mode).boardSize
  if (boardSize === 3) {
    const labelByCell = [
      '↖ haut gauche',
      '↑ haut',
      '↗ haut droite',
      '← gauche',
      '○ centre',
      '→ droite',
      '↙ bas gauche',
      '↓ bas',
      '↘ bas droite',
    ]
    return labelByCell[cell] ?? formatCell(cell)
  }

  const row = Math.floor(cell / boardSize)
  const col = cell % boardSize
  const rowLabel = row === 0 ? 'haut' : row === boardSize - 1 ? 'bas' : row < boardSize / 2 ? 'milieu haut' : 'milieu bas'
  const colLabel = col === 0 ? 'gauche' : col === boardSize - 1 ? 'droite' : col < boardSize / 2 ? 'centre gauche' : 'centre droite'

  if (row === 0 && col === 0) {
    return '↖ haut gauche'
  }
  if (row === 0 && col === boardSize - 1) {
    return '↗ haut droite'
  }
  if (row === boardSize - 1 && col === 0) {
    return '↙ bas gauche'
  }
  if (row === boardSize - 1 && col === boardSize - 1) {
    return '↘ bas droite'
  }
  if (row === 0) {
    return `↑ haut ${colLabel}`
  }
  if (row === boardSize - 1) {
    return `↓ bas ${colLabel}`
  }
  if (col === 0) {
    return `← ${rowLabel} gauche`
  }
  if (col === boardSize - 1) {
    return `→ ${rowLabel} droite`
  }
  return `${rowLabel} ${colLabel}`
}

function pluralizeCards(count: number): string {
  return count > 1 ? 'cartes' : 'carte'
}

function getPowerAfterPlacementDetail(elementId: CardElementId): string {
  if (elementId === 'eau') {
    return 'Tu pourras inonder une case.'
  }
  if (elementId === 'glace') {
    return 'Tu pourras geler une case.'
  }
  if (elementId === 'feu') {
    return 'Tu pourras bruler une carte.'
  }
  if (elementId === 'vol' || elementId === 'psy') {
    return 'Tu pourras affaiblir une carte.'
  }
  return 'Tu pourras appliquer son pouvoir.'
}

function getPowerTargetDetail(elementId: CardElementId): string {
  if (elementId === 'eau') {
    return 'La case sera inondee.'
  }
  if (elementId === 'glace') {
    return 'La case sera gelee.'
  }
  if (elementId === 'feu') {
    return 'La carte brule: -1 partout pendant 1 tour.'
  }
  if (elementId === 'vol' || elementId === 'psy') {
    return 'La carte sera affaiblie.'
  }
  return 'Le pouvoir sera applique.'
}

function describeFirstCapture(state: MatchState, flippedCells: number[]): string {
  const flippedCell = flippedCells[0]
  if (flippedCell === undefined) {
    return 'Aucune capture.'
  }

  if (flippedCells.length > 1) {
    return `${flippedCells.length} cartes passent chez toi.`
  }

  const targetSlot = state.board[flippedCell]
  if (!targetSlot) {
    return 'Une carte passe chez toi.'
  }

  return `${getCard(targetSlot.cardId).name} passe chez toi.`
}

function previewMove(state: MatchState, move: Move): { detail: string; needsTarget: boolean } {
  const targetOptions = listMovePowerTargetOptions(state, move)
  if (targetOptions && targetOptions.cells.length > 0) {
    const card = getCard(move.cardId)
    return {
      detail: getPowerAfterPlacementDetail(card.elementId),
      needsTarget: true,
    }
  }

  try {
    const resolution = applyMoveDetailed(state, move)
    return {
      detail: describeFirstCapture(
        state,
        resolution.flipEvents.map((event) => event.cell),
      ),
      needsTarget: false,
    }
  } catch {
    return {
      detail: `${formatBoardCell(state, move.cell)} n est pas jouable.`,
      needsTarget: false,
    }
  }
}

export function buildCombatCoachMessage(input: CombatCoachInput): CombatCoachMessage {
  const { state, selectedCardId, focusedCell, legalMoves, flipEvents = [], powerTargeting = null } = input

  if (state.status === 'finished') {
    return {
      title: 'Match termine',
      body: 'Lis le score, puis continue.',
      detail: 'Les cartes controlees font le resultat.',
    }
  }

  if (state.turn === 'cpu') {
    const flipCount = flipEvents.length
    return {
      title: 'Le CPU reflechit',
      body:
        flipCount > 0
          ? `Ton dernier coup a retourne ${flipCount} ${pluralizeCards(flipCount)}.`
          : 'Patiente: le CPU choisit sa reponse.',
      detail: 'Regarde les cartes exposees.',
    }
  }

  if (state.lastMove?.actor === 'cpu' && flipEvents.length > 0) {
    const cpuCard = getCard(state.lastMove.cardId)
    const flipCount = flipEvents.length
    return {
      title: `CPU a joue ${cpuCard.name} en ${formatBoardCell(state, state.lastMove.cell)}`,
      body: `CPU retourne ${flipCount} ${pluralizeCards(flipCount)}.`,
      detail: 'Reprends une carte faible adjacente.',
    }
  }

  if (powerTargeting) {
    const elementLabel = getElementLabel(powerTargeting.elementId)
    const detail = getPowerTargetDetail(powerTargeting.elementId)
    return {
      title: `Choisis la cible ${elementLabel}`,
      body: detail,
      detail,
    }
  }

  if (!selectedCardId) {
    return {
      title: 'A toi de jouer',
      body: 'Choisis une carte.',
      detail: 'Les cases jouables s allument ensuite.',
    }
  }

  const selectedCard = getCard(selectedCardId)
  const selectedMoves = legalMoves.filter((move) => move.cardId === selectedCardId)
  if (selectedMoves.length === 0) {
    return {
      title: `${selectedCard.name} bloque`,
      body: 'Aucune case jouable.',
      detail: 'Choisis une autre carte.',
    }
  }

  const focusedMove = focusedCell === null ? null : selectedMoves.find((move) => move.cell === focusedCell) ?? null
  const candidateMove = focusedMove ?? selectedMoves[0]!
  const preview = previewMove(state, candidateMove)

  if (preview.needsTarget) {
    return {
      title: `Pose ${selectedCard.name} en ${formatBoardCell(state, candidateMove.cell)}`,
      body: preview.detail,
      detail: preview.detail,
    }
  }

  return {
    title: `Pose ${selectedCard.name} en ${formatBoardCell(state, candidateMove.cell)}`,
    body: preview.detail,
    detail: preview.detail,
  }
}
