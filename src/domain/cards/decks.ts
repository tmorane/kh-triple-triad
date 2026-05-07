import { cardPool } from './cardPool'
import type { CardId, DeckSlot, DeckSlotId, MatchMode, PlayerProfile } from '../types'
import { getModeSpec } from '../match/modeSpec'

const fixedStarterDeck: CardId[] = ['c02', 'c03', 'c01', 'c12', 'c87']

function getStarterCardsFromPool(): {
  starterOwnedCardIds: CardId[]
  starterDeck: CardId[]
  cpuDeckRotation3x3: CardId[][]
  cpuDeckRotation4x4: CardId[][]
} {
  const commonIds = cardPool.filter((card) => card.rarity === 'common').map((card) => card.id)
  const uncommonIds = cardPool.filter((card) => card.rarity === 'uncommon').map((card) => card.id)
  const rareIds = cardPool.filter((card) => card.rarity === 'rare').map((card) => card.id)

  if (commonIds.length < 17 || uncommonIds.length < 8 || rareIds.length < 5) {
    throw new Error('Card pool does not contain enough cards to build starter and CPU decks.')
  }

  const missingStarterCards = fixedStarterDeck.filter((cardId) => !cardPool.some((card) => card.id === cardId))
  if (missingStarterCards.length > 0) {
    throw new Error(`Card pool is missing fixed starter cards: ${missingStarterCards.join(', ')}.`)
  }

  return {
    starterOwnedCardIds: fixedStarterDeck,
    starterDeck: fixedStarterDeck,
    cpuDeckRotation3x3: [commonIds.slice(5, 10), uncommonIds.slice(0, 5), rareIds.slice(0, 5)],
    cpuDeckRotation4x4: [
      commonIds.slice(5, 13),
      [...commonIds.slice(13, 17), ...uncommonIds.slice(0, 4)],
      [...uncommonIds.slice(4, 8), ...rareIds.slice(0, 4)],
    ],
  }
}

const starterConfig = getStarterCardsFromPool()

export const starterOwnedCardIds: CardId[] = starterConfig.starterOwnedCardIds

export const starterDeck: CardId[] = starterConfig.starterDeck

const cpuDeckRotationByMode: Record<MatchMode, CardId[][]> = {
  '3x3': starterConfig.cpuDeckRotation3x3,
  '4x4': starterConfig.cpuDeckRotation4x4,
}

export function createResetStarterCards(): {
  starterOwnedCardIds: CardId[]
  starterDeck: CardId[]
} {
  return {
    starterOwnedCardIds: fixedStarterDeck,
    starterDeck: fixedStarterDeck,
  }
}

export function getCpuDeckForMatch(matchIndex: number, mode: MatchMode): CardId[] {
  const rotation = cpuDeckRotationByMode[mode]
  const slot = matchIndex % rotation.length
  return [...rotation[slot]]
}

export function getDeckSlot(profile: PlayerProfile, slotId: DeckSlotId): DeckSlot {
  return profile.deckSlots.find((slot) => slot.id === slotId) ?? profile.deckSlots[0]
}

export function getSelectedDeckSlot(profile: PlayerProfile): DeckSlot {
  return getDeckSlot(profile, profile.selectedDeckSlotId)
}

export function getDeckForMode(slot: DeckSlot, mode: MatchMode): CardId[] {
  return mode === '4x4' ? slot.cards4x4 : slot.cards
}

export function toggleCardInDeck(deck: CardId[], cardId: CardId, maxSize = 5): CardId[] {
  if (deck.includes(cardId)) {
    return deck.filter((id) => id !== cardId)
  }
  if (deck.length >= maxSize) {
    return deck
  }
  return [...deck, cardId]
}

export function isDeckNameValid(name: string): { valid: boolean; reason?: string } {
  const normalized = name.trim()
  if (normalized.length < 1 || normalized.length > 20) {
    return { valid: false, reason: 'Deck name must be between 1 and 20 characters.' }
  }
  return { valid: true }
}

export function hasExactlyFiveUniqueCards(deck: CardId[]): boolean {
  return hasExactlyDeckSizeUniqueCards(deck, 5)
}

export function hasExactlyDeckSizeUniqueCards(deck: CardId[], deckSize: number): boolean {
  return deck.length === deckSize && new Set(deck).size === deckSize
}

export function isDeckSubsetOfOwned(deck: CardId[], ownedCardIds: CardId[]): boolean {
  const owned = new Set(ownedCardIds)
  return deck.every((cardId) => owned.has(cardId))
}

export function validateDeck(deck: CardId[], ownedCardIds: CardId[], mode: MatchMode): { valid: boolean; reason?: string } {
  const modeSpec = getModeSpec(mode)
  if (!hasExactlyDeckSizeUniqueCards(deck, modeSpec.deckSize)) {
    return { valid: false, reason: `Deck must contain exactly ${modeSpec.deckSize} unique cards.` }
  }
  if (!isDeckSubsetOfOwned(deck, ownedCardIds)) {
    return { valid: false, reason: 'Deck includes cards not in collection.' }
  }
  return { valid: true }
}
