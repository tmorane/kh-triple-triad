import { getCard } from '../cards/cardPool'
import type { CardId, PlayerProfile, Rarity } from '../types'

export const CARD_FRAGMENT_COST_BY_RARITY: Record<Rarity, number> = {
  common: 3,
  uncommon: 6,
  rare: 10,
  epic: 25,
  legendary: 100,
}

export function getCardFragmentCost(cardId: CardId): number {
  const card = getCard(cardId)
  if (!card) {
    throw new Error(`Unknown card id: ${cardId}`)
  }
  return CARD_FRAGMENT_COST_BY_RARITY[card.rarity]
}

export function getCardFragments(profile: PlayerProfile, cardId: CardId): number {
  return profile.cardFragmentsById[cardId] ?? 0
}

export function canCraftCardFromFragments(profile: PlayerProfile, cardId: CardId): boolean {
  return getCardFragments(profile, cardId) >= getCardFragmentCost(cardId)
}

export function craftCardFromFragments(profile: PlayerProfile, cardId: CardId): PlayerProfile {
  const cost = getCardFragmentCost(cardId)
  const currentFragments = getCardFragments(profile, cardId)
  if (currentFragments < cost) {
    throw new Error('Not enough card fragments to craft this card.')
  }

  const nextProfile: PlayerProfile = {
    ...profile,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    cardFragmentsById: { ...profile.cardFragmentsById },
  }

  const remainingFragments = currentFragments - cost
  if (remainingFragments > 0) {
    nextProfile.cardFragmentsById[cardId] = remainingFragments
  } else {
    delete nextProfile.cardFragmentsById[cardId]
  }

  nextProfile.cardCopiesById[cardId] = (nextProfile.cardCopiesById[cardId] ?? 0) + 1
  if (!nextProfile.ownedCardIds.includes(cardId)) {
    nextProfile.ownedCardIds.push(cardId)
  }

  return nextProfile
}
