import type { Actor, CardElementId, CardId, MatchConfig, MatchMetrics, MatchTypeSynergyState, Move, RuleSet } from '../types'

export interface BoardSlot {
  cardId: CardId
  owner: Actor
}

export interface MatchState {
  config: MatchConfig
  rules: RuleSet
  typeSynergy: MatchTypeSynergyState
  metrics: MatchMetrics
  elementState?: MatchElementState
  turn: Actor
  board: Array<BoardSlot | null>
  hands: Record<Actor, CardId[]>
  turns: number
  status: 'active' | 'finished'
  lastMove: Move | null
}

export interface CaptureResolution {
  state: MatchState
  flippedCells: number[]
  immediateFlips: number
  wasSpecialRuleTrigger: boolean
}

export type ElementMode = 'normal' | 'effects'

export interface SideDelta {
  top: number
  right: number
  bottom: number
  left: number
}

export interface VolatileDebuff {
  actor: Actor
  untilTurn: number
}

export interface ShieldTimer {
  actor: Actor
  untilTurn: number
}

export interface CardBoardEffects {
  permanentDelta: SideDelta
  burnTicksRemaining: number
  volatileAllStatsMinusOneUntilEndOfOwnerNextTurn: VolatileDebuff | null
  unflippableUntilEndOfOpponentNextTurn: ShieldTimer | null
  swappedHighLowUntilMatchEnd: boolean
  rockShieldCharges: number
  poisonFirstCombatPending: boolean
  insectEntryStacks: 0 | 1 | 2
  dragonApplied: boolean
}

export interface MatchElementState {
  enabled: boolean
  mode: ElementMode
  strictPowerTargeting: boolean
  usedOnPoseByActor: Record<Actor, Partial<Record<CardElementId, true>>>
  actorTurnCount: Record<Actor, number>
  frozenCellByActor: Partial<Record<Actor, number>>
  floodedCell: number | null
  poisonedHandByActor: Record<Actor, CardId[]>
  boardEffectsByCell: Partial<Record<number, CardBoardEffects>>
}
