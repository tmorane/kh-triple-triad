import type { TowerRelicId, TowerRelicInventory } from './types'

interface TowerRelicDefinition {
  id: TowerRelicId
  title: string
  description: string
}

export interface TowerRelicEffects {
  goldMultiplier: number
  forcePlayerStart: boolean
  bossScoreReduction: number
  nonBossScoreReduction: number
  checkpointPackBonus: number
  swapOfferChoiceCount: 3 | 4
  scoreBonusModifier: number
}

const towerRelicDefinitions: ReadonlyArray<TowerRelicDefinition> = [
  {
    id: 'golden_pass',
    title: 'Golden Pass',
    description: '+15% gold in Tower (caps at +60%).',
  },
  {
    id: 'initiative_core',
    title: 'Initiative Core',
    description: 'You always start first in Tower fights.',
  },
  {
    id: 'boss_breaker',
    title: 'Boss Breaker',
    description: 'Reduce boss score spike by 3.',
  },
  {
    id: 'stabilizer',
    title: 'Stabilizer',
    description: 'Reduce non-boss score bonus by 1.',
  },
  {
    id: 'deep_pockets',
    title: 'Deep Pockets',
    description: '+1 extra pack on each checkpoint chest.',
  },
  {
    id: 'draft_chisel',
    title: 'Draft Chisel',
    description: 'Swap offers show 4 cards instead of 3.',
  },
  {
    id: 'high_risk_token',
    title: 'High Risk Token',
    description: '+30% Tower gold, but +2 enemy score bonus.',
  },
]

const towerRelicById = Object.fromEntries(towerRelicDefinitions.map((relic) => [relic.id, relic])) as Record<
  TowerRelicId,
  TowerRelicDefinition
>

const towerRelicIds: TowerRelicId[] = towerRelicDefinitions.map((relic) => relic.id)

export function listTowerRelicIds(): TowerRelicId[] {
  return [...towerRelicIds]
}

export function getTowerRelicDefinition(id: TowerRelicId): TowerRelicDefinition {
  return towerRelicById[id]
}

export function createEmptyTowerRelicInventory(): TowerRelicInventory {
  return {
    golden_pass: 0,
    initiative_core: 0,
    boss_breaker: 0,
    stabilizer: 0,
    deep_pockets: 0,
    draft_chisel: 0,
    high_risk_token: 0,
  }
}

export function resolveTowerRelicEffects(relics: TowerRelicInventory): TowerRelicEffects {
  const goldenPassBonus = Math.min((relics.golden_pass ?? 0) * 0.15, 0.6)
  const highRiskGoldBonus = (relics.high_risk_token ?? 0) * 0.3
  const forcePlayerStart = (relics.initiative_core ?? 0) > 0
  const bossScoreReduction = Math.max(0, relics.boss_breaker ?? 0) * 3
  const nonBossScoreReduction = Math.max(0, relics.stabilizer ?? 0)
  const checkpointPackBonus = Math.max(0, relics.deep_pockets ?? 0)
  const swapOfferChoiceCount: 3 | 4 = (relics.draft_chisel ?? 0) > 0 ? 4 : 3
  const scoreBonusModifier = Math.max(0, relics.high_risk_token ?? 0) * 2

  return {
    goldMultiplier: 1 + goldenPassBonus + highRiskGoldBonus,
    forcePlayerStart,
    bossScoreReduction,
    nonBossScoreReduction,
    checkpointPackBonus,
    swapOfferChoiceCount,
    scoreBonusModifier,
  }
}
