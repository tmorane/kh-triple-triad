import { describe, expect, test } from 'vitest'
import type { PlayerProfile } from '../types'
import { createDefaultProfile } from './profile'
import { applyRankRewards, computeRankState, rankTiers } from './ranks'

function profileWithRecord(played: number, won: number): PlayerProfile {
  const profile = createDefaultProfile()
  profile.stats.played = played
  profile.stats.won = won
  profile.stats.streak = 0
  profile.stats.bestStreak = won
  profile.rankRewardsClaimed = []
  return profile
}

describe('rank progression rewards', () => {
  test('maps rank boundaries to the expected tiers', () => {
    expect(rankTiers.map((tier) => tier.id)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'])

    expect(computeRankState(profileWithRecord(0, 0)).currentRank.id).toBe('R1')
    expect(computeRankState(profileWithRecord(1, 0)).currentRank.id).toBe('R1')
    expect(computeRankState(profileWithRecord(3, 0)).currentRank.id).toBe('R2')
    expect(computeRankState(profileWithRecord(6, 2)).currentRank.id).toBe('R3')
    expect(computeRankState(profileWithRecord(9, 6)).currentRank.id).toBe('R4')
    expect(computeRankState(profileWithRecord(12, 12)).currentRank.id).toBe('R5')
    expect(computeRankState(profileWithRecord(17, 16)).currentRank.id).toBe('R6')
    expect(computeRankState(profileWithRecord(22, 22)).currentRank.id).toBe('R7')
    expect(computeRankState(profileWithRecord(28, 28)).currentRank.id).toBe('R8')
  })

  test('grants all rewards once when the profile reaches max rank', () => {
    const profile = profileWithRecord(28, 28)

    const applied = applyRankRewards(profile)

    expect(applied.granted.map((entry) => entry.rankId)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'])
    expect(applied.profile.gold).toBe(profile.gold + 1590)
    expect(applied.profile.packInventoryByRarity).toEqual({
      common: 1,
      uncommon: 1,
      rare: 1,
      epic: 1,
      legendary: 1,
    })
    expect(applied.profile.rankRewardsClaimed).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'])
  })

  test('does not duplicate rewards when applied multiple times', () => {
    const profile = profileWithRecord(12, 12)
    const first = applyRankRewards(profile)
    const second = applyRankRewards(first.profile)

    expect(first.granted.map((entry) => entry.rankId)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5'])
    expect(second.granted).toEqual([])
    expect(second.profile.gold).toBe(first.profile.gold)
    expect(second.profile.rankRewardsClaimed).toEqual(first.profile.rankRewardsClaimed)
  })

  test('retroactively grants only missing reached ranks once', () => {
    const profile = profileWithRecord(12, 12)
    profile.rankRewardsClaimed = ['R1', 'R3']

    const applied = applyRankRewards(profile)

    expect(applied.granted.map((entry) => entry.rankId)).toEqual(['R2', 'R4', 'R5'])
    expect(applied.profile.gold).toBe(profile.gold + 370)
    expect(applied.profile.packInventoryByRarity.common).toBe(1)
    expect(applied.profile.packInventoryByRarity.uncommon).toBe(1)
    expect(applied.profile.rankRewardsClaimed).toEqual(['R1', 'R3', 'R2', 'R4', 'R5'])
  })

  test('increments the correct pack rarity when rank reward includes packs', () => {
    const profile = profileWithRecord(28, 28)
    profile.packInventoryByRarity = {
      common: 4,
      uncommon: 3,
      rare: 2,
      epic: 1,
      legendary: 0,
    }
    profile.rankRewardsClaimed = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']

    const applied = applyRankRewards(profile)

    expect(applied.granted.map((entry) => entry.rankId)).toEqual(['R7', 'R8'])
    expect(applied.profile.packInventoryByRarity).toEqual({
      common: 4,
      uncommon: 3,
      rare: 2,
      epic: 2,
      legendary: 1,
    })
  })

  test('stays idempotent at max rank when everything is already claimed', () => {
    const profile = profileWithRecord(28, 28)
    profile.rankRewardsClaimed = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']
    profile.gold = 999

    const applied = applyRankRewards(profile)

    expect(applied.granted).toEqual([])
    expect(applied.profile.gold).toBe(999)
    expect(applied.profile.rankRewardsClaimed).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'])
  })
})
