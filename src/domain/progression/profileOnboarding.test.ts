import { beforeEach, describe, expect, test } from 'bun:test'
import {
  createDefaultProfile,
  createStoredProfile,
  listStoredProfilesForLadder,
  loadProfile,
  parseStoredProfileSnapshot,
  shouldRequestPlayerName,
} from './profile'

describe('profile player name onboarding', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('new local profiles ask for a player name before publishing a ladder identity', () => {
    const profile = loadProfile()

    expect(profile.playerName).toBe('Joueur')
    expect(profile.hasChosenPlayerName).toBe(false)
    expect(shouldRequestPlayerName(profile)).toBe(true)
  })

  test('profiles created with an explicit name are ready for the ladder', () => {
    expect(createStoredProfile('Aqua').valid).toBe(true)

    const profile = loadProfile()

    expect(profile.playerName).toBe('Aqua')
    expect(profile.hasChosenPlayerName).toBe(true)
    expect(shouldRequestPlayerName(profile)).toBe(false)
    expect(listStoredProfilesForLadder().some((entry) => entry.playerName === 'Aqua')).toBe(true)
  })

  test('migrates existing custom v12 names as already chosen', () => {
    const legacyProfile = createDefaultProfile()
    legacyProfile.playerName = 'Ventus'
    delete (legacyProfile as { hasChosenPlayerName?: boolean }).hasChosenPlayerName

    const migrated = parseStoredProfileSnapshot(legacyProfile)

    expect(migrated?.playerName).toBe('Ventus')
    expect(migrated?.hasChosenPlayerName).toBe(true)
    expect(migrated ? shouldRequestPlayerName(migrated) : true).toBe(false)
  })
})
