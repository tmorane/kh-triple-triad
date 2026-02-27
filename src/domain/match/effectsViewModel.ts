import { getCard } from '../cards/cardPool'
import { getElementLabel } from '../cards/taxonomy'
import type { Actor, CardElementId, CardId } from '../types'
import { getElementEffectText } from './elementEffectsCatalog'
import { resolveDisplaySides } from './engine'
import { getModeSpec } from './modeSpec'
import type { MatchState } from './types'

type StatTrend = 'buff' | 'debuff' | 'neutral'
type IndicatorTone = 'neutral' | 'buff' | 'debuff' | 'info'

export interface EffectIndicator {
  key: string
  icon: string
  label: string
  tooltip: string
  tone: IndicatorTone
  valueText?: string
}

export interface DisplayStatValue {
  value: number
  delta: number
  trend: StatTrend
}

export interface DisplayCardStats {
  top: DisplayStatValue
  right: DisplayStatValue
  bottom: DisplayStatValue
  left: DisplayStatValue
}

export interface MatchLaneTypeSlot {
  slotIndex: number
  cardId: CardId
  elementId: CardElementId
  state: 'active' | 'used' | 'disabled'
  effectText: string
  displayLabel: string
}

export interface MatchEffectsViewModel {
  mode: 'normal' | 'effects'
  globalIndicators: EffectIndicator[]
  cellIndicators: Partial<Record<number, EffectIndicator[]>>
  boardCardIndicators: Partial<Record<number, EffectIndicator[]>>
  displayStatsByCell: Partial<Record<number, DisplayCardStats>>
  handIndicatorsByActor: Record<Actor, Partial<Record<CardId, EffectIndicator[]>>>
  handDisplayStatsByActor: Record<Actor, Partial<Record<CardId, DisplayCardStats>>>
  usedOnPoseByActor: Record<Actor, Partial<Record<CardElementId, true>>>
  laneTypeSlotsByActor: Record<Actor, MatchLaneTypeSlot[]>
}

const ON_POSE_ELEMENTS: Set<CardElementId> = new Set([
  'feu',
  'eau',
  'electrik',
  'glace',
  'poison',
  'sol',
  'vol',
  'psy',
  'dragon',
])

function toDisplayStatValue(base: number, value: number): DisplayStatValue {
  const delta = value - base
  return {
    value,
    delta,
    trend: delta > 0 ? 'buff' : delta < 0 ? 'debuff' : 'neutral',
  }
}

function ensureIndicatorCollection(target: Partial<Record<number, EffectIndicator[]>>, cell: number): EffectIndicator[] {
  const existing = target[cell]
  if (existing) {
    return existing
  }
  const created: EffectIndicator[] = []
  target[cell] = created
  return created
}

function pushIndicator(target: EffectIndicator[], indicator: EffectIndicator) {
  if (!target.some((item) => item.key === indicator.key)) {
    target.push(indicator)
  }
}

function isTimerActive(turns: number, untilTurn: number): boolean {
  return turns <= untilTurn
}

function collectConsumedElementTypes(state: MatchState, actor: Actor, mode: MatchEffectsViewModel['mode']): Set<CardElementId> {
  if (mode === 'normal' || !state.elementState) {
    return new Set<CardElementId>()
  }

  const consumed = new Set<CardElementId>()
  const usedByActor = state.elementState.usedOnPoseByActor[actor]
  for (const [elementId, used] of Object.entries(usedByActor)) {
    if (used) {
      consumed.add(elementId as CardElementId)
    }
  }

  const handCardIds = new Set(state.hands[actor])
  const initialDeck = actor === 'player' ? state.config.playerDeck : state.config.cpuDeck
  for (const cardId of initialDeck) {
    if (!handCardIds.has(cardId)) {
      consumed.add(getCard(cardId).elementId)
    }
  }

  return consumed
}

function buildLaneTypeSlots(state: MatchState, actor: Actor, mode: MatchEffectsViewModel['mode']): MatchLaneTypeSlot[] {
  const deck = actor === 'player' ? state.config.playerDeck : state.config.cpuDeck
  const consumedElements = collectConsumedElementTypes(state, actor, mode)
  const seenElements = new Set<CardElementId>()
  const uniqueDeckCards = deck.filter((cardId) => {
    const elementId = getCard(cardId).elementId
    if (seenElements.has(elementId)) {
      return false
    }
    seenElements.add(elementId)
    return true
  })

  return uniqueDeckCards.map((cardId, slotIndex) => {
    const card = getCard(cardId)
    return {
      slotIndex,
      cardId,
      elementId: card.elementId,
      state: mode === 'normal' ? 'disabled' : consumedElements.has(card.elementId) ? 'used' : 'active',
      effectText: getElementEffectText(card.elementId),
      displayLabel: getElementLabel(card.elementId),
    }
  })
}

export function buildMatchEffectsViewModel(state: MatchState): MatchEffectsViewModel {
  const elementState = state.elementState
  const mode: 'normal' | 'effects' = elementState?.mode === 'normal' ? 'normal' : 'effects'
  const globalIndicators: EffectIndicator[] = []
  const cellIndicators: Partial<Record<number, EffectIndicator[]>> = {}
  const boardCardIndicators: Partial<Record<number, EffectIndicator[]>> = {}
  const displayStatsByCell: Partial<Record<number, DisplayCardStats>> = {}
  const handIndicatorsByActor: Record<Actor, Partial<Record<CardId, EffectIndicator[]>>> = {
    player: {},
    cpu: {},
  }
  const handDisplayStatsByActor: Record<Actor, Partial<Record<CardId, DisplayCardStats>>> = {
    player: {},
    cpu: {},
  }

  const usedOnPoseByActor: MatchEffectsViewModel['usedOnPoseByActor'] = {
    player: { ...(elementState?.usedOnPoseByActor.player ?? {}) },
    cpu: { ...(elementState?.usedOnPoseByActor.cpu ?? {}) },
  }
  const laneTypeSlotsByActor: MatchEffectsViewModel['laneTypeSlotsByActor'] = {
    player: buildLaneTypeSlots(state, 'player', mode),
    cpu: buildLaneTypeSlots(state, 'cpu', mode),
  }
  const boardSize = getModeSpec(state.config.mode).boardSize

  if (mode === 'normal') {
    globalIndicators.push({
      key: 'mode-normal',
      icon: '⛔',
      label: 'Mode normal',
      tooltip: 'Mode normal: effets désactivés.',
      tone: 'info',
    })
  } else {
    globalIndicators.push({
      key: 'mode-effects',
      icon: '✨',
      label: 'Mode effets',
      tooltip: 'Les pouvoirs de type sont actifs.',
      tone: 'buff',
    })
  }

  for (let cell = 0; cell < state.board.length; cell += 1) {
    const slot = state.board[cell]
    if (!slot) {
      continue
    }

    const card = getCard(slot.cardId)
    const displaySides = resolveDisplaySides(state, cell)
    if (displaySides) {
      displayStatsByCell[cell] = {
        top: toDisplayStatValue(card.top, displaySides.top),
        right: toDisplayStatValue(card.right, displaySides.right),
        bottom: toDisplayStatValue(card.bottom, displaySides.bottom),
        left: toDisplayStatValue(card.left, displaySides.left),
      }
    }

    if (mode !== 'effects') {
      continue
    }

    const indicators = ensureIndicatorCollection(boardCardIndicators, cell)
    const effects = elementState?.boardEffectsByCell[cell]

    if (card.elementId === 'combat') {
      pushIndicator(indicators, {
        key: 'card-combat-attack',
        icon: '⚔',
        label: 'ATK +2',
        tooltip: '⚔️ +2 uniquement quand cette carte attaque.',
        tone: 'buff',
      })
    }

    if (card.elementId === 'spectre') {
      pushIndicator(indicators, {
        key: 'card-spectre-passive',
        icon: '👻',
        label: 'Ignore cases',
        tooltip: '👻 Ignore les malus et restrictions de case.',
        tone: 'info',
      })
    }

    if (card.elementId === 'plante') {
      const adjacentBonus = Math.min(
        2,
        [cell - boardSize, cell + boardSize, cell - 1, cell + 1].filter((neighborCell) => {
          if (neighborCell < 0 || neighborCell >= state.board.length) {
            return false
          }
          if (
            (neighborCell === cell - 1 || neighborCell === cell + 1) &&
            Math.floor(neighborCell / boardSize) !== Math.floor(cell / boardSize)
          ) {
            return false
          }
          const neighbor = state.board[neighborCell]
          return neighbor?.owner === slot.owner
        }).length,
      )
      if (adjacentBonus > 0) {
        pushIndicator(indicators, {
          key: 'card-plante-pack',
          icon: '🌿',
          label: `Meute +${adjacentBonus}`,
          tooltip: `Plante: +${adjacentBonus} sur toutes les stats.`,
          tone: 'buff',
          valueText: `+${adjacentBonus}`,
        })
      }
    }

    if (!effects) {
      continue
    }

    if (effects.burnTicksRemaining > 0) {
      pushIndicator(indicators, {
        key: 'card-burn',
        icon: '🔥',
        label: `Brûlure ${effects.burnTicksRemaining}`,
        tooltip: `Brûlure active (${effects.burnTicksRemaining} tour(s)).`,
        tone: 'debuff',
        valueText: `${effects.burnTicksRemaining}`,
      })
    }

    const volatile = effects.volatileAllStatsMinusOneUntilEndOfOwnerNextTurn
    if (volatile && isTimerActive(elementState?.actorTurnCount[volatile.actor] ?? 0, volatile.untilTurn)) {
      pushIndicator(indicators, {
        key: 'card-volatile',
        icon: '🕊️',
        label: 'All -1',
        tooltip: 'Vol: -1 temporaire sur toutes les stats.',
        tone: 'debuff',
      })
    }

    const shield = effects.unflippableUntilEndOfOpponentNextTurn
    if (shield && isTimerActive(elementState?.actorTurnCount[shield.actor] ?? 0, shield.untilTurn)) {
      pushIndicator(indicators, {
        key: 'card-unflippable',
        icon: '⚡',
        label: 'Intouchable',
        tooltip: '⚡ Intouchable pendant le prochain tour adverse.',
        tone: 'buff',
      })
    }

    if (effects.swappedHighLowUntilMatchEnd) {
      pushIndicator(indicators, {
        key: 'card-psy-swap',
        icon: '🔄',
        label: 'Confusion',
        tooltip: '🔄 Meilleure/pire stat inversées.',
        tone: 'info',
      })
    }

    if (effects.rockShieldCharges > 0) {
      pushIndicator(indicators, {
        key: 'card-rock-shield',
        icon: '🪨',
        label: `Bouclier x${effects.rockShieldCharges}`,
        tooltip: `🛡️ Annule ${effects.rockShieldCharges} défaite(s) en duel.`,
        tone: 'buff',
        valueText: `${effects.rockShieldCharges}`,
      })
    }

    if (effects.poisonFirstCombatPending) {
      pushIndicator(indicators, {
        key: 'card-poison-first-combat',
        icon: '☠️',
        label: 'Poison',
        tooltip: '☠️ Poison actif: -1 sur toutes les stats.',
        tone: 'debuff',
      })
    }

    if (effects.insectEntryStacks > 0) {
      pushIndicator(indicators, {
        key: 'card-insect-stack',
        icon: '🐞',
        label: `Essaim +${effects.insectEntryStacks}`,
        tooltip: `Insecte: bonus d'entrée +${effects.insectEntryStacks}.`,
        tone: 'buff',
        valueText: `+${effects.insectEntryStacks}`,
      })
    }

    if (effects.dragonApplied) {
      pushIndicator(indicators, {
        key: 'card-dragon-transform',
        icon: '🐉',
        label: 'Draconique',
        tooltip: 'Dragon: +1 sur 2 stats et -1 sur 1 stat.',
        tone: 'info',
      })
    }
  }

  if (mode === 'effects' && elementState) {
    if (Number.isInteger(elementState.floodedCell)) {
      const floodedIndicators = ensureIndicatorCollection(cellIndicators, elementState.floodedCell as number)
      pushIndicator(floodedIndicators, {
        key: 'cell-flooded',
        icon: '🌊',
        label: 'Inondée',
        tooltip: '🌊 Prochaine non-Spectre: -2 meilleure stat.',
        tone: 'debuff',
      })
    }

    for (const [targetActor, blockedCell] of Object.entries(elementState.frozenCellByActor) as Array<[Actor, number]>) {
      if (!Number.isInteger(blockedCell)) {
        continue
      }
      const blockedIndicators = ensureIndicatorCollection(cellIndicators, blockedCell)
      pushIndicator(blockedIndicators, {
        key: 'cell-frozen',
        icon: '❄️',
        label: 'Gelée',
        tooltip: `❄️ ${targetActor === 'player' ? 'Joueur' : 'CPU'}: prochaine pose bloquée ici.`,
        tone: 'debuff',
      })
    }

    for (const actor of ['player', 'cpu'] as const) {
      const poisonedHand = new Set(elementState.poisonedHandByActor[actor])
      for (const cardId of state.hands[actor]) {
        const card = getCard(cardId)
        const indicators: EffectIndicator[] = []
        if (poisonedHand.has(cardId)) {
          indicators.push({
            key: 'hand-poisoned',
            icon: '☠️',
            label: 'Empoisonnée',
            tooltip: '☠️ En main: -1 toutes stats quand elle est posée.',
            tone: 'debuff',
          })
          handDisplayStatsByActor[actor][cardId] = {
            top: toDisplayStatValue(card.top, Math.max(1, card.top - 1)),
            right: toDisplayStatValue(card.right, Math.max(1, card.right - 1)),
            bottom: toDisplayStatValue(card.bottom, Math.max(1, card.bottom - 1)),
            left: toDisplayStatValue(card.left, Math.max(1, card.left - 1)),
          }
        }
        const elementId = card.elementId
        if (ON_POSE_ELEMENTS.has(elementId) && elementState.usedOnPoseByActor[actor][elementId]) {
          indicators.push({
            key: 'hand-power-used',
            icon: '⏳',
            label: 'Pouvoir utilisé',
            tooltip: `⏳ ${getElementLabel(elementId)}: pouvoir déjà utilisé.`,
            tone: 'info',
          })
        }
        if (indicators.length > 0) {
          handIndicatorsByActor[actor][cardId] = indicators
        }
      }
    }
  }

  return {
    mode,
    globalIndicators,
    cellIndicators,
    boardCardIndicators,
    displayStatsByCell,
    handIndicatorsByActor,
    handDisplayStatsByActor,
    usedOnPoseByActor,
    laneTypeSlotsByActor,
  }
}
