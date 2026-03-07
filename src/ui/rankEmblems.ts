import type { RankedTierId } from '../domain/types'

const rankEmblemFormatByTier: Record<RankedTierId, 'png' | 'svg'> = {
  iron: 'png',
  bronze: 'png',
  silver: 'png',
  gold: 'png',
  platinum: 'png',
  diamond: 'png',
  challenger: 'png',
}

export function getRankEmblemSrc(tier: RankedTierId): string {
  return `/ranks/${tier}.${rankEmblemFormatByTier[tier]}`
}
