import { cardPool } from '../cards/cardPool'
import type { CardId, PlayerProfile, Rarity } from '../types'
import type { SeededRng } from '../random/seededRng'
import { evaluateAchievements } from './achievements'

export type ShopPackId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface ShopCardPull {
  cardId: CardId
  rarity: Rarity
  isNewOwnership: boolean
  copiesAfter: number
}

export interface ShopPurchaseReceipt {
  packId: ShopPackId
  goldSpent: number
  goldRemaining: number
  packCountAfter: number
}

export interface OpenedPackResult {
  packId: ShopPackId
  remainingPackCount: number
  pulls: [ShopCardPull, ShopCardPull, ShopCardPull]
}

export interface ShopPurchaseProgressionResult {
  profile: PlayerProfile
  receipt: ShopPurchaseReceipt
}

export interface ShopOpenProgressionResult {
  profile: PlayerProfile
  opened: OpenedPackResult
}

const PACK_PRICES: Record<ShopPackId, number> = {
  common: 60,
  uncommon: 120,
  rare: 220,
  epic: 300,
  legendary: 360,
}

export function getPackPrice(packId: ShopPackId): number {
  return PACK_PRICES[packId]
}

export function purchaseShopPack(profile: PlayerProfile, packId: ShopPackId): ShopPurchaseProgressionResult {
  const goldSpent = getPackPrice(packId)
  if (profile.gold < goldSpent) {
    throw new Error('Not enough gold for this pack.')
  }

  const updatedProfile = cloneProfile(profile)
  updatedProfile.gold -= goldSpent
  updatedProfile.packInventoryByRarity[packId] += 1

  return {
    profile: updatedProfile,
    receipt: {
      packId,
      goldSpent,
      goldRemaining: updatedProfile.gold,
      packCountAfter: updatedProfile.packInventoryByRarity[packId],
    },
  }
}

export function openOwnedPack(profile: PlayerProfile, packId: ShopPackId, rng: SeededRng): ShopOpenProgressionResult {
  if (profile.packInventoryByRarity[packId] <= 0) {
    throw new Error('No pack available to open.')
  }

  const updatedProfile = cloneProfile(profile)
  updatedProfile.packInventoryByRarity[packId] -= 1

  const pulls: ShopCardPull[] = []
  for (let index = 0; index < 3; index += 1) {
    const cardId = chooseWeightedCard(packId, updatedProfile.cardCopiesById, rng)
    const existingCopies = updatedProfile.cardCopiesById[cardId] ?? 0
    const copiesAfter = existingCopies + 1
    const isNewOwnership = existingCopies === 0

    updatedProfile.cardCopiesById[cardId] = copiesAfter

    if (isNewOwnership && !updatedProfile.ownedCardIds.includes(cardId)) {
      updatedProfile.ownedCardIds.push(cardId)
    }

    pulls.push({
      cardId,
      rarity: packId,
      isNewOwnership,
      copiesAfter,
    })
  }

  const unlocked = evaluateAchievements(updatedProfile)
  if (unlocked.length > 0) {
    updatedProfile.achievements.push(...unlocked)
  }

  return {
    profile: updatedProfile,
    opened: {
      packId,
      remainingPackCount: updatedProfile.packInventoryByRarity[packId],
      pulls: pulls as [ShopCardPull, ShopCardPull, ShopCardPull],
    },
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

function chooseWeightedCard(packId: ShopPackId, cardCopiesById: Record<CardId, number>, rng: SeededRng): CardId {
  const candidates = cardPool.filter((card) => card.rarity === packId)
  if (candidates.length === 0) {
    throw new Error(`No cards found for pack rarity: ${packId}`)
  }

  let totalWeight = 0
  const weightedCandidates = candidates.map((card) => {
    const copies = cardCopiesById[card.id] ?? 0
    const weight = copies === 0 ? 3 : 1
    totalWeight += weight
    return { cardId: card.id, weight }
  })

  let roll = rng.nextInt(totalWeight)
  for (const candidate of weightedCandidates) {
    if (roll < candidate.weight) {
      return candidate.cardId
    }
    roll -= candidate.weight
  }

  return weightedCandidates[weightedCandidates.length - 1]!.cardId
}
