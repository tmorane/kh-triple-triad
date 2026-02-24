import type { CardId, RuleSet } from '../types'

export type TowerRelicId =
  | 'golden_pass'
  | 'initiative_core'
  | 'boss_breaker'
  | 'stabilizer'
  | 'deep_pockets'
  | 'draft_chisel'
  | 'high_risk_token'

export type TowerRelicInventory = Record<TowerRelicId, number>

export interface TowerFloorSpec {
  floor: number
  boss: boolean
  rules: RuleSet
  scoreBonus: number
  rewardMultiplier: number
  opponentLevel: number
}

export interface TowerProgressState {
  bestFloor: number
  checkpointFloor: number
  highestClearedFloor: number
  clearedFloor100: boolean
}

export interface TowerRelicChoice {
  id: TowerRelicId
  title: string
  description: string
}

export interface TowerSwapChoice {
  cardId: CardId
  title: string
  description: string
}

interface TowerRewardOfferBase {
  floor: number
  kind: 'relic' | 'swap'
}

export interface TowerRelicRewardOffer extends TowerRewardOfferBase {
  kind: 'relic'
  choices: [TowerRelicChoice, TowerRelicChoice, TowerRelicChoice]
}

export interface TowerSwapRewardOffer extends TowerRewardOfferBase {
  kind: 'swap'
  choices: TowerSwapChoice[]
}

export type TowerRewardOffer = TowerRelicRewardOffer | TowerSwapRewardOffer

export interface TowerRunState {
  mode: '4x4'
  floor: number
  checkpointFloor: number
  deck: CardId[]
  relics: TowerRelicInventory
  pendingRewards: TowerRewardOffer[]
  seed: number
}

export interface TowerMatchSummary {
  floor: number
  checkpointFloor: number
  status: 'continue' | 'failed' | 'cleared'
  pendingReward: TowerRewardOffer | null
  nextFloor: number | null
}
