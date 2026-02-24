import type { PlayerProfile } from '../types'
import type { ShopPackId } from '../progression/shop'

export interface TowerCheckpointPackReward {
  packId: ShopPackId
  amount: number
}

export interface TowerCheckpointRewardSummary {
  floor: number
  packs: TowerCheckpointPackReward[]
  grantsFloor100Badge: boolean
}

function resolveBaseCheckpointPack(floor: number): ShopPackId | null {
  if (floor === 10 || floor === 20) {
    return 'uncommon'
  }

  if (floor === 30 || floor === 40 || floor === 50) {
    return 'rare'
  }

  if (floor === 60 || floor === 70 || floor === 80) {
    return 'epic'
  }

  if (floor === 90 || floor === 100) {
    return 'legendary'
  }

  return null
}

export function resolveTowerCheckpointRewards(floor: number, checkpointPackBonus: number): TowerCheckpointRewardSummary {
  const basePack = resolveBaseCheckpointPack(floor)
  if (!basePack) {
    return {
      floor,
      packs: [],
      grantsFloor100Badge: false,
    }
  }

  const extraAmount = Math.max(0, Math.floor(checkpointPackBonus))
  const baseAmount = floor === 100 ? 2 : 1

  return {
    floor,
    packs: [
      {
        packId: basePack,
        amount: baseAmount + extraAmount,
      },
    ],
    grantsFloor100Badge: floor === 100,
  }
}

export function applyTowerCheckpointRewards(
  profile: PlayerProfile,
  floor: number,
  checkpointPackBonus: number,
): { profile: PlayerProfile; summary: TowerCheckpointRewardSummary } {
  const summary = resolveTowerCheckpointRewards(floor, checkpointPackBonus)
  if (summary.packs.length === 0) {
    return { profile, summary }
  }

  const next: PlayerProfile = {
    ...profile,
    packInventoryByRarity: { ...profile.packInventoryByRarity },
  }

  for (const reward of summary.packs) {
    next.packInventoryByRarity[reward.packId] += reward.amount
  }

  return {
    profile: next,
    summary,
  }
}
