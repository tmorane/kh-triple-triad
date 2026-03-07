import { achievementCatalog } from './achievements'
import type { AchievementId, PlayerProfile } from '../types'

export function listClaimableAchievementRewardIds(profile: PlayerProfile): AchievementId[] {
  const claimed = profile.achievementRewardsClaimedById
  const unlocked = new Set(profile.achievements.map((entry) => entry.id))
  const claimable: AchievementId[] = []

  for (const achievement of achievementCatalog) {
    if (!unlocked.has(achievement.id)) {
      continue
    }
    if (claimed[achievement.id] === true) {
      continue
    }
    claimable.push(achievement.id)
  }

  return claimable
}

export function claimAllAchievementRewards(
  profile: PlayerProfile,
): { profile: PlayerProfile; claimedIds: AchievementId[]; grantedCommonPacks: number } {
  const claimedIds = listClaimableAchievementRewardIds(profile)
  if (claimedIds.length === 0) {
    return { profile, claimedIds: [], grantedCommonPacks: 0 }
  }

  const nextProfile: PlayerProfile = {
    ...profile,
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    achievementRewardsClaimedById: { ...profile.achievementRewardsClaimedById },
  }

  for (const achievementId of claimedIds) {
    nextProfile.achievementRewardsClaimedById[achievementId] = true
  }

  nextProfile.packInventoryByRarity.common += claimedIds.length

  return {
    profile: nextProfile,
    claimedIds,
    grantedCommonPacks: claimedIds.length,
  }
}

export function hasUnlockedAllAchievements(profile: PlayerProfile): boolean {
  const unlocked = new Set(profile.achievements.map((entry) => entry.id))
  if (unlocked.size !== achievementCatalog.length) {
    return false
  }

  for (const achievement of achievementCatalog) {
    if (!unlocked.has(achievement.id)) {
      return false
    }
  }

  return true
}
