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

const apexDeckBonusByTier: Record<'master' | 'grandmaster' | 'challenger', number> = {
  master: 0,
  grandmaster: 3,
  challenger: 6,
}

const apexWinLpBonusByTier: Record<'master' | 'grandmaster' | 'challenger', number> = {
  master: 0,
  grandmaster: 1,
  challenger: 2,
}

function isApexTier(tier: RankedTierId): tier is 'master' | 'grandmaster' | 'challenger' {
  return tier === 'master' || tier === 'grandmaster' || tier === 'challenger'
}

export function getRankedDeckScoreBonus(tier: RankedTierId, division: RankedDivision | null): number {
  if (isApexTier(tier)) {
    return apexDeckBonusByTier[tier]
  }

  return division ? divisionDeckBonusByDivision[division] : 0
}

export function getRankedWinLpBonus(tier: RankedTierId, division: RankedDivision | null): number {
  if (isApexTier(tier)) {
    return apexWinLpBonusByTier[tier]
  }

  return division ? divisionWinLpBonusByDivision[division] : 0
}
