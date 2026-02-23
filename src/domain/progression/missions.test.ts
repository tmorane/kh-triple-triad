import { describe, expect, test } from 'vitest'
import { createDefaultProfile } from './profile'
import { applyMatchMissions } from './missions'

describe('applyMatchMissions', () => {
  test('progresses type specialist from wins with primary synergy and secondary bonus link', () => {
    const profile = createDefaultProfile()

    const first = applyMatchMissions(
      profile,
      {
        winner: 'player',
        playerPrimarySynergyActive: true,
        playerSecondarySynergyActive: true,
        playerSamePlusTriggers: 0,
        playerCornerPlays: 0,
      },
      101,
    )

    expect(first.profile.missions.m1_type_specialist.progress).toBe(2)
  })

  test('completes combo practitioner once and grants exactly one rare pack reward', () => {
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
    expect(first.profile.missions.m2_combo_practitioner.claimed).toBe(true)
    expect(first.profile.packInventoryByRarity.rare).toBe(profile.packInventoryByRarity.rare + 1)

    const second = applyMatchMissions(
      first.profile,
      {
        winner: 'player',
        playerPrimarySynergyActive: false,
        playerSecondarySynergyActive: false,
        playerSamePlusTriggers: 10,
        playerCornerPlays: 0,
      },
      103,
    )

    expect(second.profile.packInventoryByRarity.rare).toBe(first.profile.packInventoryByRarity.rare)
  })

  test('corner tactician card reward prefers non-owned card when available', () => {
    const profile = createDefaultProfile()

    const beforeOwned = new Set(profile.ownedCardIds)
    const result = applyMatchMissions(
      profile,
      {
        winner: 'player',
        playerPrimarySynergyActive: false,
        playerSecondarySynergyActive: false,
        playerSamePlusTriggers: 0,
        playerCornerPlays: 12,
      },
      104,
    )

    expect(result.completedMissionIds).toContain('m3_corner_tactician')
    expect(result.profile.missions.m3_corner_tactician.claimed).toBe(true)
    const newOwned = result.profile.ownedCardIds.find((cardId) => !beforeOwned.has(cardId))
    expect(newOwned).toBeTruthy()
    if (newOwned) {
      expect(result.profile.cardCopiesById[newOwned]).toBeGreaterThanOrEqual(1)
    }
  })
})
