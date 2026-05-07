import type { RankedTierId } from '../domain/types'

const rankEmblemFormatByTier: Record<RankedTierId, 'svg'> = {
  iron: 'svg',
  bronze: 'svg',
  silver: 'svg',
  gold: 'svg',
  platinum: 'svg',
  diamond: 'svg',
  challenger: 'svg',
}

export function getRankEmblemSrc(tier: RankedTierId): string {
  return `/ranks/${tier}.${rankEmblemFormatByTier[tier]}`
}
