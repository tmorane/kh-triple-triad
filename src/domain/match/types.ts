import type { Actor, CardId, MatchConfig, MatchMetrics, MatchTypeSynergyState, Move, RuleSet } from '../types'

export interface BoardSlot {
  cardId: CardId
  owner: Actor
}

export interface MatchState {
  config: MatchConfig
  rules: RuleSet
  typeSynergy: MatchTypeSynergyState
  metrics: MatchMetrics
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
