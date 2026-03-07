import { getCard } from '../cards/cardPool'
import { getElementLabel } from '../cards/taxonomy'
import type { Actor, CardElementId, Move } from '../types'
import type { MatchState } from './types'

export interface EffectFeedEntry {
  id: string
  text: string
  tone: 'neutral' | 'buff' | 'debuff' | 'info'
}

function actorLabel(actor: Actor): string {
  return actor === 'player' ? 'joueur' : 'CPU'
}

function makeEntry(idSeed: string, text: string, tone: EffectFeedEntry['tone']): EffectFeedEntry {
  return {
    id: `${idSeed}:${text}`,
    text,
    tone,
  }
}

function diffAddedValues(previousValues: string[], nextValues: string[]): string[] {
  const previousSet = new Set(previousValues)
  return nextValues.filter((value) => !previousSet.has(value))
}

function isOnPoseElement(elementId: CardElementId): boolean {
  return (
    elementId === 'feu' ||
    elementId === 'eau' ||
    elementId === 'electrik' ||
    elementId === 'glace' ||
    elementId === 'poison' ||
    elementId === 'sol' ||
    elementId === 'vol' ||
    elementId === 'psy' ||
    elementId === 'dragon'
  )
}

export function deriveEffectFeedEntries(previous: MatchState, next: MatchState, move: Move): EffectFeedEntry[] {
  const entries: EffectFeedEntry[] = []
  const previousElementState = previous.elementState
  const nextElementState = next.elementState
  if (!nextElementState) {
    return entries
  }

  if (nextElementState.mode === 'normal' && previousElementState?.mode !== 'normal') {
    entries.push(makeEntry(`mode:${next.turns}`, '⛔ Mode normal: effets désactivés.', 'info'))
    return entries
  }

  if (nextElementState.mode !== 'effects') {
    return entries
  }

  if (nextElementState.floodedCell !== null && nextElementState.floodedCell !== previousElementState?.floodedCell) {
    entries.push(
      makeEntry(
        `flood:${next.turns}:${nextElementState.floodedCell}`,
        `🌊 Case ${nextElementState.floodedCell + 1} inondée.`,
        'debuff',
      ),
    )
  }

  for (const actor of ['player', 'cpu'] as const) {
    const nextFrozen = nextElementState.frozenCellByActor[actor]
    const previousFrozen = previousElementState?.frozenCellByActor[actor]
    if (
      nextFrozen &&
      Number.isInteger(nextFrozen.cell) &&
      nextFrozen.turnsRemaining > 0 &&
      (!previousFrozen ||
        previousFrozen.cell !== nextFrozen.cell ||
        previousFrozen.turnsRemaining < nextFrozen.turnsRemaining)
    ) {
      const blockedCell = nextFrozen.cell
      entries.push(
        makeEntry(
          `freeze:${next.turns}:${actor}:${blockedCell}`,
          `❄️ Case ${blockedCell + 1} gelée pour ${actorLabel(actor)} (${nextFrozen.turnsRemaining} tour(s)).`,
          'debuff',
        ),
      )
    }
  }

  for (const actor of ['player', 'cpu'] as const) {
    const previousPoisoned = previousElementState?.poisonedHandByActor[actor] ?? []
    const nextPoisoned = nextElementState.poisonedHandByActor[actor]
    for (const cardId of diffAddedValues(previousPoisoned, nextPoisoned)) {
      const cardName = getCard(cardId).name
      entries.push(
        makeEntry(
          `poison-hand:${next.turns}:${actor}:${cardId}`,
          `☠️ ${cardName} (${actorLabel(actor)}) est empoisonnée en main.`,
          'debuff',
        ),
      )
    }
  }

  for (const actor of ['player', 'cpu'] as const) {
    const previousUsed = previousElementState?.usedOnPoseByActor[actor] ?? {}
    const nextUsed = nextElementState.usedOnPoseByActor[actor]
    for (const [element, enabled] of Object.entries(nextUsed)) {
      if (!enabled) {
        continue
      }
      if (previousUsed[element as keyof typeof previousUsed]) {
        continue
      }
      const elementId = element as CardElementId
      entries.push(
        makeEntry(
          `pose:${next.turns}:${actor}:${element}`,
          `✨ Pouvoir ${getElementLabel(elementId)} utilisé par ${actorLabel(actor)}.`,
          'info',
        ),
      )
    }
  }

  const touchedCells = new Set<number>([
    ...Object.keys(previousElementState?.boardEffectsByCell ?? {}).map((key) => Number(key)),
    ...Object.keys(nextElementState.boardEffectsByCell).map((key) => Number(key)),
  ])

  for (const cell of touchedCells) {
    if (!Number.isInteger(cell) || !next.board[cell]) {
      continue
    }
    const cardName = getCard(next.board[cell]!.cardId).name
    const previousEffects = previousElementState?.boardEffectsByCell[cell]
    const nextEffects = nextElementState.boardEffectsByCell[cell]
    if (!nextEffects) {
      continue
    }

    const previousBurn = previousEffects?.burnTicksRemaining ?? 0
    if (nextEffects.burnTicksRemaining > previousBurn) {
      entries.push(
        makeEntry(
          `burn:${next.turns}:${cell}`,
          `🔥 ${cardName} brûle (${nextEffects.burnTicksRemaining} tour(s)).`,
          'debuff',
        ),
      )
    }

    const previousAllStatsMinusOneStacks = previousEffects?.allStatsMinusOneStacks ?? []
    const nextAllStatsMinusOneStacks = nextEffects.allStatsMinusOneStacks
    const previousVolatileCount = previousAllStatsMinusOneStacks.filter((stack) => stack.source === 'vol').length
    const nextVolatileCount = nextAllStatsMinusOneStacks.filter((stack) => stack.source === 'vol').length
    if (nextVolatileCount > previousVolatileCount) {
      entries.push(makeEntry(`vol:${next.turns}:${cell}`, `🕊️ ${cardName} subit un malus temporaire.`, 'debuff'))
    }
    const previousGroundCount = previousAllStatsMinusOneStacks.filter((stack) => stack.source === 'sol').length
    const nextGroundCount = nextAllStatsMinusOneStacks.filter((stack) => stack.source === 'sol').length
    if (nextGroundCount > previousGroundCount) {
      entries.push(makeEntry(`sol:${next.turns}:${cell}`, `🪨 ${cardName} subit un malus temporaire de Sol.`, 'debuff'))
    }

    if (!previousEffects?.unflippableUntilEndOfOpponentNextTurn && nextEffects.unflippableUntilEndOfOpponentNextTurn) {
      entries.push(makeEntry(`shield:${next.turns}:${cell}`, `⚡ ${cardName} devient intouchable.`, 'buff'))
    }

    if (!previousEffects?.swappedHighLowUntilMatchEnd && nextEffects.swappedHighLowUntilMatchEnd) {
      entries.push(makeEntry(`psy:${next.turns}:${cell}`, `🔄 ${cardName} a ses stats inversées.`, 'info'))
    }

    const previousRockShield = previousEffects?.rockShieldCharges ?? 0
    if (nextEffects.rockShieldCharges > previousRockShield) {
      entries.push(makeEntry(`rock-plus:${next.turns}:${cell}`, `🪨 ${cardName} gagne un bouclier.`, 'buff'))
    }
    if (nextEffects.rockShieldCharges < previousRockShield) {
      entries.push(makeEntry(`rock-minus:${next.turns}:${cell}`, `🪨 Bouclier de ${cardName} consommé.`, 'info'))
    }

    if (!previousEffects?.poisonFirstCombatPending && nextEffects.poisonFirstCombatPending) {
      entries.push(
        makeEntry(`poison-pending:${next.turns}:${cell}`, `☠️ ${cardName} subira -1 sur toutes ses stats jusqu a la fin du match.`, 'debuff'),
      )
    }

    if ((previousEffects?.insectEntryStacks ?? 0) < nextEffects.insectEntryStacks) {
      entries.push(makeEntry(`insect:${next.turns}:${cell}`, `🐞 ${cardName} gagne essaim +${nextEffects.insectEntryStacks}.`, 'buff'))
    }

    if (!previousEffects?.dragonApplied && nextEffects.dragonApplied) {
      entries.push(makeEntry(`dragon:${next.turns}:${cell}`, `🐉 ${cardName} réorganise ses stats.`, 'info'))
    }
  }

  const moveElementId = getCard(move.cardId).elementId
  if (entries.length === 0 && isOnPoseElement(moveElementId) && nextElementState.usedOnPoseByActor[move.actor][moveElementId]) {
    entries.push(makeEntry(`generic:${next.turns}:${move.actor}:${move.cardId}`, '✨ Effet de type appliqué.', 'info'))
  }

  return entries
}
