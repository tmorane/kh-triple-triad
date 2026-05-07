import type { Actor } from '../types'

export type CombatPhase = 'pose' | 'power' | 'duel' | 'result' | 'cpu'

export interface CombatPhaseInput {
  status: 'active' | 'finished'
  turn: Actor
  powerTargeting: boolean
  duelActive: boolean
  resultActive: boolean
  starterRevealComplete: boolean
}

export function resolveCombatPhase(input: CombatPhaseInput): CombatPhase {
  if (input.status === 'finished') {
    return 'result'
  }
  if (input.duelActive) {
    return 'duel'
  }
  if (input.resultActive) {
    return 'result'
  }
  if (input.powerTargeting) {
    return 'power'
  }
  if (!input.starterRevealComplete || input.turn === 'cpu') {
    return 'cpu'
  }
  return 'pose'
}
