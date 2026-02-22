import type { PlayerProfile, RankId, Rarity } from '../types'

export interface RankTier {
  id: RankId
  name: string
  minScore: number
}

export interface RankReward {
  gold: number
  packs: Partial<Record<Rarity, number>>
}

export interface RankRewardGrant {
  rankId: RankId
  rankName: string
  reward: RankReward
}

export interface RankState {
  score: number
  currentRank: RankTier
  nextRank: RankTier | null
  reachedRankIds: RankId[]
  progressToNext: number
}

const RANK_SCORE_PER_MATCH = 100
const RANK_SCORE_PER_WIN = 50

export const rankTiers: RankTier[] = [
  { id: 'R1', name: 'Rookie Duelist', minScore: 100 },
  { id: 'R2', name: 'Twilight Cadet', minScore: 300 },
  { id: 'R3', name: 'Keyblade Scout', minScore: 700 },
  { id: 'R4', name: 'Radiant Vanguard', minScore: 1200 },
  { id: 'R5', name: 'Wayfinder Knight', minScore: 1800 },
  { id: 'R6', name: 'Master Defender', minScore: 2500 },
  { id: 'R7', name: 'Realm Guardian', minScore: 3300 },
  { id: 'R8', name: 'Kingdom Legend', minScore: 4200 },
]

export const rankRewardCatalog: Record<RankId, RankReward> = {
  R1: { gold: 40, packs: {} },
  R2: { gold: 60, packs: { common: 1 } },
  R3: { gold: 90, packs: {} },
  R4: { gold: 130, packs: { uncommon: 1 } },
  R5: { gold: 180, packs: {} },
  R6: { gold: 250, packs: { rare: 1 } },
  R7: { gold: 340, packs: { epic: 1 } },
  R8: { gold: 500, packs: { legendary: 1 } },
}

export function computeRankState(profile: PlayerProfile): RankState {
  const score = computeRankScore(profile)
  const reachedRankIds = rankTiers.filter((tier) => score >= tier.minScore).map((tier) => tier.id)

  const currentRank =
    rankTiers
      .slice()
      .reverse()
      .find((tier) => score >= tier.minScore) ?? rankTiers[0]

  const nextRank = rankTiers.find((tier) => tier.minScore > score) ?? null

  let progressToNext = 1
  if (nextRank) {
    const distanceToNext = nextRank.minScore - currentRank.minScore
    if (distanceToNext > 0) {
      progressToNext = clamp((score - currentRank.minScore) / distanceToNext, 0, 1)
    } else {
      progressToNext = 0
    }
  }

  return {
    score,
    currentRank,
    nextRank,
    reachedRankIds,
    progressToNext,
  }
}

export function applyRankRewards(profile: PlayerProfile): { profile: PlayerProfile; granted: RankRewardGrant[] } {
  const updatedProfile = cloneProfile(profile)
  const rankState = computeRankState(updatedProfile)
  const claimed = new Set<RankId>(updatedProfile.rankRewardsClaimed)
  const granted: RankRewardGrant[] = []

  for (const rankId of rankState.reachedRankIds) {
    if (claimed.has(rankId)) {
      continue
    }

    const reward = rankRewardCatalog[rankId]
    updatedProfile.gold += reward.gold

    for (const [rarity, count] of Object.entries(reward.packs) as Array<[Rarity, number | undefined]>) {
      if (!count || count <= 0) {
        continue
      }
      updatedProfile.packInventoryByRarity[rarity] += count
    }

    claimed.add(rankId)

    granted.push({
      rankId,
      rankName: rankTiers.find((tier) => tier.id === rankId)?.name ?? rankId,
      reward: copyRankReward(reward),
    })
  }

  updatedProfile.rankRewardsClaimed = [...claimed]

  return {
    profile: updatedProfile,
    granted,
  }
}

function computeRankScore(profile: PlayerProfile): number {
  const base = profile.stats.played * RANK_SCORE_PER_MATCH + profile.stats.won * RANK_SCORE_PER_WIN
  return Math.max(0, Math.floor(base))
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

function copyRankReward(reward: RankReward): RankReward {
  return {
    gold: reward.gold,
    packs: { ...reward.packs },
  }
}

function cloneProfile(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: profile.deckSlots.map((slot) => ({
      ...slot,
      cards: [...slot.cards],
      rules: { ...slot.rules },
    })) as PlayerProfile['deckSlots'],
    stats: { ...profile.stats },
    achievements: [...profile.achievements],
    rankRewardsClaimed: [...profile.rankRewardsClaimed],
    settings: { ...profile.settings },
  }
}
