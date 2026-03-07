import { describe, expect, test } from 'bun:test'
import { createDefaultProfile } from '../../domain/progression/profile'
import { resolveProfileForCloudSession } from './resolveCloudProfile'

describe('resolveProfileForCloudSession', () => {
  test('prefers cloud profile when available', () => {
    const localProfile = createDefaultProfile()
    localProfile.playerName = 'Local'
    const cloudProfile = createDefaultProfile()
    cloudProfile.playerName = 'Cloud'

    const resolved = resolveProfileForCloudSession(localProfile, cloudProfile)

    expect(resolved.profile.playerName).toBe('Cloud')
    expect(resolved.shouldUploadLocal).toBe(false)
    expect(resolved.source).toBe('cloud')
  })

  test('keeps local profile and requires upload when cloud profile is missing', () => {
    const localProfile = createDefaultProfile()
    localProfile.playerName = 'Local'

    const resolved = resolveProfileForCloudSession(localProfile, null)

    expect(resolved.profile.playerName).toBe('Local')
    expect(resolved.shouldUploadLocal).toBe(true)
    expect(resolved.source).toBe('local')
  })
})
