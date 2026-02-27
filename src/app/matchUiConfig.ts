import type { MatchMode } from '../domain/types'

export const IS_4X4_UI_ENABLED = false
export const IS_TOWER_UI_ENABLED = IS_4X4_UI_ENABLED

export const VISIBLE_MATCH_MODES: MatchMode[] = IS_4X4_UI_ENABLED ? ['3x3', '4x4'] : ['3x3']
export const PRIMARY_MATCH_MODE: MatchMode = VISIBLE_MATCH_MODES[0] ?? '3x3'
