import type { RankedDivision, RankedTierId } from '../types'

const divisionDeckBonusByDivision: Record<RankedDivision, number> = {
  IV: 0,
  III: 2,
  II: 4,
  I: 6,
}

const divisionWinLpBonusByDivision: Record<RankedDivision, number> = {
  IV: 0,
  III: 1,
  II: 2,
  I: 3,
}

function isApexTier(tier: RankedTierId): tier is 'challenger' {
  return tier === 'challenger'
}

export function getRankedDeckScoreBonus(tier: RankedTierId, division: RankedDivision | null): number {
  if (isApexTier(tier)) {
    return 6
  }

  return division ? divisionDeckBonusByDivision[division] : 0
}

export function getRankedWinLpBonus(tier: RankedTierId, division: RankedDivision | null): number {
  if (isApexTier(tier)) {
    return 2
  }

  return division ? divisionWinLpBonusByDivision[division] : 0
}
