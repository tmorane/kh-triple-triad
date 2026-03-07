import { describe, expect, test } from 'bun:test'
import { createDefaultProfile } from './profile'
import { applyMatchMissions, claimCompletedMission } from './missions'

describe('applyMatchMissions', () => {
  test('progresses type specialist from player victories only', () => {
    const profile = createDefaultProfile()

    const first = applyMatchMissions(
      profile,
      {
        winner: 'player',
        playerPrimarySynergyActive: false,
        playerSecondarySynergyActive: true,
        playerSamePlusTriggers: 0,
        playerCornerPlays: 0,
      },
      101,
    )

    expect(first.profile.missions.m1_type_specialist.progress).toBe(1)
  })

  test('completes combo practitioner without auto-claiming reward', () => {
    const profile = createDefaultProfile()

    const first = applyMatchMissions(
      profile,
      {
        winner: 'player',
        playerPrimarySynergyActive: false,
        playerSecondarySynergyActive: false,
        playerSamePlusTriggers: 6,
        playerCornerPlays: 0,
      },
      102,
    )

    expect(first.completedMissionIds).toContain('m2_combo_practitioner')
    expect(first.profile.missions.m2_combo_practitioner.completed).toBe(true)
    expect(first.profile.missions.m2_combo_practitioner.claimed).toBe(false)
    expect(first.profile.packInventoryByRarity.rare).toBe(profile.packInventoryByRarity.rare)
    expect(first.profile.achievementProgress.missionsCompleted).toBe(1)
  })

  test('claims completed mission reward and immediately replaces it with a fresh mission', () => {
    const profile = createDefaultProfile()
    profile.missions.m2_combo_practitioner.progress = 6
    profile.missions.m2_combo_practitioner.completed = true
    profile.missions.m2_combo_practitioner.claimed = false

    const claimed = claimCompletedMission(profile, 'm2_combo_practitioner', 204)

    expect(claimed.claimed).toBe(true)
    expect(claimed.profile.packInventoryByRarity.rare).toBe(profile.packInventoryByRarity.rare + 1)
    expect(claimed.profile.missions.m2_combo_practitioner).toEqual({
      id: 'm2_combo_practitioner',
      progress: 0,
      target: 6,
      completed: false,
      claimed: false,
    })
  })

  test('refreshes an already-claimed mission without granting reward again', () => {
    const profile = createDefaultProfile()
    profile.missions.m2_combo_practitioner.progress = 6
    profile.missions.m2_combo_practitioner.completed = true
    profile.missions.m2_combo_practitioner.claimed = true
    const beforeRarePacks = profile.packInventoryByRarity.rare

    const refreshed = claimCompletedMission(profile, 'm2_combo_practitioner', 205)

    expect(refreshed.claimed).toBe(true)
    expect(refreshed.profile.packInventoryByRarity.rare).toBe(beforeRarePacks)
    expect(refreshed.profile.missions.m2_combo_practitioner.completed).toBe(false)
    expect(refreshed.profile.missions.m2_combo_practitioner.progress).toBe(0)
  })

  test('blocks reward once when migration marked mission as already granted before reset', () => {
    const profile = createDefaultProfile()
    profile.missions.m1_type_specialist.progress = 5
    profile.missions.m1_type_specialist.completed = true
    profile.missions.m1_type_specialist.claimed = false
    profile.missionRewardsGrantedById.m1_type_specialist = true

    const firstClaim = claimCompletedMission(profile, 'm1_type_specialist', 901)
    expect(firstClaim.claimed).toBe(true)
    expect(firstClaim.profile.gold).toBe(profile.gold)
    expect(firstClaim.profile.missionRewardsGrantedById.m1_type_specialist).toBeUndefined()

    firstClaim.profile.missions.m1_type_specialist.progress = 5
    firstClaim.profile.missions.m1_type_specialist.completed = true
    firstClaim.profile.missions.m1_type_specialist.claimed = false

    const secondClaim = claimCompletedMission(firstClaim.profile, 'm1_type_specialist', 902)
    expect(secondClaim.profile.gold).toBe(firstClaim.profile.gold + 120)
  })

  test('does not claim mission that is not completed', () => {
    const profile = createDefaultProfile()

    const result = claimCompletedMission(profile, 'm1_type_specialist', 206)

    expect(result.claimed).toBe(false)
    expect(result.profile).toBe(profile)
  })

  test('claiming corner tactician reward prefers non-owned card when available', () => {
    const profile = createDefaultProfile()
    profile.missions.m3_corner_tactician.progress = 12
    profile.missions.m3_corner_tactician.completed = true
    profile.missions.m3_corner_tactician.claimed = false

    const beforeOwned = new Set(profile.ownedCardIds)
    const result = claimCompletedMission(profile, 'm3_corner_tactician', 104)

    expect(result.claimed).toBe(true)
    const newOwned = result.profile.ownedCardIds.find((cardId) => !beforeOwned.has(cardId))
    expect(newOwned).toBeTruthy()
    if (newOwned) {
      expect(result.profile.cardCopiesById[newOwned]).toBeGreaterThanOrEqual(1)
    }
  })
})
