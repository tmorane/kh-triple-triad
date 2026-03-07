import { describe, expect, test } from 'bun:test'
import { createDefaultProfile } from './profile'
import { achievementCatalog } from './achievements'
import { claimAllAchievementRewards, hasUnlockedAllAchievements, listClaimableAchievementRewardIds } from './achievementRewards'

describe('achievement rewards', () => {
  test('lists unlocked and unclaimed achievements as claimable rewards', () => {
    const profile = createDefaultProfile()
    profile.achievements = [
      { id: 'match_1', unlockedAt: '2026-03-02T00:00:00.000Z' },
      { id: 'win_1', unlockedAt: '2026-03-02T00:00:01.000Z' },
      { id: 'gold_250', unlockedAt: '2026-03-02T00:00:02.000Z' },
    ]
    profile.achievementRewardsClaimedById = {
      win_1: true,
    }

    const claimable = listClaimableAchievementRewardIds(profile)

    expect(claimable).toEqual(['match_1', 'gold_250'])
  })

  test('claimAllAchievementRewards grants one common pack per claimable achievement and marks them claimed', () => {
    const profile = createDefaultProfile()
    profile.achievements = [
      { id: 'match_1', unlockedAt: '2026-03-02T00:00:00.000Z' },
      { id: 'win_1', unlockedAt: '2026-03-02T00:00:01.000Z' },
      { id: 'gold_250', unlockedAt: '2026-03-02T00:00:02.000Z' },
    ]
    profile.packInventoryByRarity.common = 2

    const claimed = claimAllAchievementRewards(profile)

    expect(claimed.claimedIds).toEqual(['match_1', 'win_1', 'gold_250'])
    expect(claimed.grantedCommonPacks).toBe(3)
    expect(claimed.profile.packInventoryByRarity.common).toBe(5)
    expect(claimed.profile.achievementRewardsClaimedById).toEqual({
      match_1: true,
      win_1: true,
      gold_250: true,
    })
  })

  test('claimAllAchievementRewards is idempotent on second call', () => {
    const profile = createDefaultProfile()
    profile.achievements = [{ id: 'match_1', unlockedAt: '2026-03-02T00:00:00.000Z' }]

    const first = claimAllAchievementRewards(profile)
    const second = claimAllAchievementRewards(first.profile)

    expect(first.grantedCommonPacks).toBe(1)
    expect(second.grantedCommonPacks).toBe(0)
    expect(second.claimedIds).toEqual([])
    expect(second.profile.packInventoryByRarity.common).toBe(first.profile.packInventoryByRarity.common)
  })

  test('hasUnlockedAllAchievements is true only when all catalog achievements are unlocked', () => {
    const profile = createDefaultProfile()
    profile.achievements = achievementCatalog
      .slice(0, achievementCatalog.length - 1)
      .map((achievement, index) => ({ id: achievement.id, unlockedAt: `2026-03-02T00:00:${index.toString().padStart(2, '0')}.000Z` }))

    expect(hasUnlockedAllAchievements(profile)).toBe(false)

    const completed = createDefaultProfile()
    completed.achievements = achievementCatalog.map((achievement, index) => ({
      id: achievement.id,
      unlockedAt: `2026-03-02T00:01:${index.toString().padStart(2, '0')}.000Z`,
    }))

    expect(hasUnlockedAllAchievements(completed)).toBe(true)
  })
})
