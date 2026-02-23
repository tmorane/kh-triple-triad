import type { MatchMode } from '../types'

export interface MatchModeSpec {
  boardSize: number
  cellCount: number
  deckSize: number
}

export const DEFAULT_MATCH_MODE: MatchMode = '4x4'

const modeSpecs: Record<MatchMode, MatchModeSpec> = {
  '3x3': {
    boardSize: 3,
    cellCount: 9,
    deckSize: 5,
  },
  '4x4': {
    boardSize: 4,
    cellCount: 16,
    deckSize: 8,
  },
}

export function getModeSpec(mode: MatchMode): MatchModeSpec {
  return modeSpecs[mode]
}
