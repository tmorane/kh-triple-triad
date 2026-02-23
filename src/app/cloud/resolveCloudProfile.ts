import type { PlayerProfile } from '../../domain/types'

export interface CloudProfileResolution {
  profile: PlayerProfile
  shouldUploadLocal: boolean
  source: 'local' | 'cloud'
}

export function resolveProfileForCloudSession(
  localProfile: PlayerProfile,
  cloudProfile: PlayerProfile | null,
): CloudProfileResolution {
  if (cloudProfile) {
    return {
      profile: cloudProfile,
      shouldUploadLocal: false,
      source: 'cloud',
    }
  }

  return {
    profile: localProfile,
    shouldUploadLocal: true,
    source: 'local',
  }
}
