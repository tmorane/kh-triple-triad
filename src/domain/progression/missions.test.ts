import { describe, expect, test } from 'bun:test'
import { createInitialMissionsProgress, missionIds } from './missionCatalog'
import { applyCardsAcquiredMissions, applyMatchMissions, claimCompletedMission } from './missions'
import { createDefaultProfile } from './profile'

describe('mission catalog', () => {
  test('creates six mission slots by default', () => {
    const missions = createInitialMissionsProgress()
    expect(Object.keys(missions)).toHaveLength(6)
    expect(missionIds.every((missionId) => missionId in missions)).toBe(true)
  })
})

describe('applyMatchMissions', () => {
  test('progresses win mission on player victories in normal/ranked only', () => {
    const profile = createDefaultProfile()

    const playerWin = applyMatchMissions(
      profile,
      {
        queue: 'normal',
        winner: 'player',
        openRuleEnabled: true,
        playerCornerPlays: 0,
      },
      101,
    )
    expect(playerWin.profile.missions.m1_type_specialist.progress).toBe(1)

    const tutorial = applyMatchMissions(
      profile,
      {
        queue: 'tutorial',
        winner: 'player',
        openRuleEnabled: false,
        playerCornerPlays: 4,
      },
      102,
    )
    expect(tutorial.profile.missions.m1_type_specialist.progress).toBe(0)
    expect(tutorial.profile.missions.m2_combo_practitioner.progress).toBe(0)
  })

  test('progresses hidden mission only when rule is hidden', () => {
    const profile = createDefaultProfile()

    const hidden = applyMatchMissions(
      profile,
      {
        queue: 'ranked',
        winner: 'draw',
        openRuleEnabled: false,
        playerCornerPlays: 0,
      },
      103,
    )
    expect(hidden.profile.missions.m2_combo_practitioner.progress).toBe(1)

    const open = applyMatchMissions(
      profile,
      {
        queue: 'ranked',
        winner: 'player',
        openRuleEnabled: true,
        playerCornerPlays: 0,
      },
      104,
    )
    expect(open.profile.missions.m2_combo_practitioner.progress).toBe(0)
  })

  test('resets strict streak on non-victory before completion and freezes once completed', () => {
    const profile = createDefaultProfile()
    profile.missions.b1_win_streak.progress = 4

    const reset = applyMatchMissions(
      profile,
      {
        queue: 'normal',
        winner: 'draw',
        openRuleEnabled: true,
        playerCornerPlays: 0,
      },
      105,
    )
    expect(reset.profile.missions.b1_win_streak.progress).toBe(0)
    expect(reset.profile.missions.b1_win_streak.completed).toBe(false)

    const completedProfile = createDefaultProfile()
    completedProfile.missions.b1_win_streak.progress = 5
    completedProfile.missions.b1_win_streak.completed = true

    const frozen = applyMatchMissions(
      completedProfile,
      {
        queue: 'normal',
        winner: 'cpu',
        openRuleEnabled: false,
        playerCornerPlays: 0,
      },
      106,
    )
    expect(frozen.profile.missions.b1_win_streak.progress).toBe(5)
    expect(frozen.profile.missions.b1_win_streak.completed).toBe(true)
  })

  test('tracks corner plays and match count missions', () => {
    const profile = createDefaultProfile()

    const result = applyMatchMissions(
      profile,
      {
        queue: 'normal',
        winner: 'cpu',
        openRuleEnabled: true,
        playerCornerPlays: 3,
      },
      107,
    )

    expect(result.profile.missions.m3_corner_tactician.progress).toBe(3)
    expect(result.profile.missions.b2_match_grinder.progress).toBe(1)
  })
})

describe('applyCardsAcquiredMissions', () => {
  test('progresses collection hunter from cards acquired delta and completes once', () => {
    const profile = createDefaultProfile()

    const first = applyCardsAcquiredMissions(profile, 11)
    expect(first.profile.missions.b3_collection_hunter.progress).toBe(11)
    expect(first.profile.missions.b3_collection_hunter.completed).toBe(false)

    const second = applyCardsAcquiredMissions(first.profile, 40)
    expect(second.profile.missions.b3_collection_hunter.progress).toBe(30)
    expect(second.profile.missions.b3_collection_hunter.completed).toBe(true)
    expect(second.profile.achievementProgress.missionsCompleted).toBe(1)
  })
})

describe('claimCompletedMission', () => {
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
