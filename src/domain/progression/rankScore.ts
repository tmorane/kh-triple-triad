import type { RankedDivision, RankedTierId } from '../types'

const tierOrder: RankedTierId[] = [
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'challenger',
]

const divisionOrder: RankedDivision[] = ['IV', 'III', 'II', 'I']

const tierNames: Record<RankedTierId, string> = {
  iron: 'Iron',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  challenger: 'Challenger',
}

export function formatRankLabel(tier: RankedTierId, division: RankedDivision | null): string {
  const tierLabel = tierNames[tier]
  if (division) {
    return `${tierLabel} ${division}`
  }
  return tierLabel
}

export function getRankScore(tier: RankedTierId, division: RankedDivision | null, lp: number): number {
  const tierIndex = tierOrder.indexOf(tier)
  if (tierIndex === -1) {
    throw new Error(`Unsupported rank tier: ${tier}`)
  }

  const divisionIndex = division ? divisionOrder.indexOf(division) : 0
  if (division && divisionIndex === -1) {
    throw new Error(`Unsupported rank division: ${division}`)
  }

  const safeLp = Math.max(0, Math.min(99, Math.floor(lp)))
  return tierIndex * 1000 + divisionIndex * 100 + safeLp
}
