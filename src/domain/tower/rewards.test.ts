import { describe, expect, test } from 'vitest'
import { createDefaultProfile } from '../progression/profile'
import { applyTowerCheckpointRewards, resolveTowerCheckpointRewards } from './rewards'

describe('tower checkpoint rewards', () => {
  test('maps checkpoint floors to expected pack rarity', () => {
    expect(resolveTowerCheckpointRewards(10, 0).packs).toEqual([{ packId: 'uncommon', amount: 1 }])
    expect(resolveTowerCheckpointRewards(30, 0).packs).toEqual([{ packId: 'rare', amount: 1 }])
    expect(resolveTowerCheckpointRewards(60, 0).packs).toEqual([{ packId: 'epic', amount: 1 }])
    expect(resolveTowerCheckpointRewards(90, 0).packs).toEqual([{ packId: 'legendary', amount: 1 }])
    expect(resolveTowerCheckpointRewards(100, 0).packs).toEqual([{ packId: 'legendary', amount: 2 }])
  })

  test('applies deep pockets bonus to checkpoint packs', () => {
    const summary = resolveTowerCheckpointRewards(40, 2)
    expect(summary.packs).toEqual([{ packId: 'rare', amount: 3 }])
  })

  test('adds checkpoint packs directly to profile inventory', () => {
    const profile = createDefaultProfile()
    const result = applyTowerCheckpointRewards(profile, 70, 1)

    expect(result.profile.packInventoryByRarity.epic).toBe(profile.packInventoryByRarity.epic + 2)
  })
})
