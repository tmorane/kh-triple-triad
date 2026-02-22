import { cardPool } from './cardPool'
import type { CardId, DeckSlot, DeckSlotId, PlayerProfile, Rarity } from '../types'

function getStarterCardsFromPool(): {
  starterOwnedCardIds: CardId[]
  starterDeck: CardId[]
  cpuDeckRotation: CardId[][]
} {
  const commonIds = cardPool.filter((card) => card.rarity === 'common').map((card) => card.id)
  const uncommonIds = cardPool.filter((card) => card.rarity === 'uncommon').map((card) => card.id)
  const rareIds = cardPool.filter((card) => card.rarity === 'rare').map((card) => card.id)

  if (commonIds.length < 10 || uncommonIds.length < 5 || rareIds.length < 5) {
    throw new Error('Card pool does not contain enough cards to build starter and CPU decks.')
  }

  return {
    starterOwnedCardIds: commonIds.slice(0, 10),
    starterDeck: commonIds.slice(0, 5),
    cpuDeckRotation: [commonIds.slice(5, 10), uncommonIds.slice(0, 5), rareIds.slice(0, 5)],
  }
}

const starterConfig = getStarterCardsFromPool()

export const starterOwnedCardIds: CardId[] = starterConfig.starterOwnedCardIds

export const starterDeck: CardId[] = starterConfig.starterDeck

const cpuDeckRotation: CardId[][] = starterConfig.cpuDeckRotation

const resetStarterRarityCounts: ReadonlyArray<{ rarity: Rarity; count: number }> = [
  { rarity: 'common', count: 6 },
  { rarity: 'uncommon', count: 2 },
  { rarity: 'rare', count: 1 },
  { rarity: 'epic', count: 1 },
]

function getRandomIndex(max: number, random: () => number): number {
  const raw = random()
  const safe = Number.isFinite(raw) ? Math.abs(raw) : 0
  return Math.floor(safe * max) % max
}

function pickRandomDistinct(cardIds: CardId[], count: number, random: () => number): CardId[] {
  if (cardIds.length < count) {
    throw new Error('Card pool does not contain enough cards for randomized reset starter selection.')
  }

  const remaining = [...cardIds]
  const picked: CardId[] = []
  while (picked.length < count) {
    const index = getRandomIndex(remaining.length, random)
    const [next] = remaining.splice(index, 1)
    picked.push(next)
  }

  return picked
}

function shuffleCardIds(cardIds: CardId[], random: () => number): CardId[] {
  const shuffled = [...cardIds]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIndex(index + 1, random)
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }
  return shuffled
}

export function createResetStarterCards(random: () => number = Math.random): {
  starterOwnedCardIds: CardId[]
  starterDeck: CardId[]
} {
  const pickedByRarity = new Map<Rarity, CardId[]>()

  for (const { rarity, count } of resetStarterRarityCounts) {
    const candidates = cardPool.filter((card) => card.rarity === rarity).map((card) => card.id)
    pickedByRarity.set(rarity, pickRandomDistinct(candidates, count, random))
  }

  const commonCards = pickedByRarity.get('common') ?? []
  const uncommonCards = pickedByRarity.get('uncommon') ?? []
  const rareCards = pickedByRarity.get('rare') ?? []
  const epicCards = pickedByRarity.get('epic') ?? []
  const ownedCardIds = shuffleCardIds([...commonCards, ...uncommonCards, ...rareCards, ...epicCards], random)

  return {
    starterOwnedCardIds: ownedCardIds,
    starterDeck: commonCards.slice(0, 5),
  }
}

export function getCpuDeckForMatch(matchIndex: number): CardId[] {
  const slot = matchIndex % cpuDeckRotation.length
  return [...cpuDeckRotation[slot]]
}

export function getDeckSlot(profile: PlayerProfile, slotId: DeckSlotId): DeckSlot {
  return profile.deckSlots.find((slot) => slot.id === slotId) ?? profile.deckSlots[0]
}

export function getSelectedDeckSlot(profile: PlayerProfile): DeckSlot {
  return getDeckSlot(profile, profile.selectedDeckSlotId)
}

export function toggleCardInDeck(deck: CardId[], cardId: CardId): CardId[] {
  if (deck.includes(cardId)) {
    return deck.filter((id) => id !== cardId)
  }
  if (deck.length >= 5) {
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
  return deck.length === 5 && new Set(deck).size === 5
}

export function isDeckSubsetOfOwned(deck: CardId[], ownedCardIds: CardId[]): boolean {
  const owned = new Set(ownedCardIds)
  return deck.every((cardId) => owned.has(cardId))
}

export function validateDeck(deck: CardId[], ownedCardIds: CardId[]): { valid: boolean; reason?: string } {
  if (!hasExactlyFiveUniqueCards(deck)) {
    return { valid: false, reason: 'Deck must contain exactly five unique cards.' }
  }
  if (!isDeckSubsetOfOwned(deck, ownedCardIds)) {
    return { valid: false, reason: 'Deck includes cards not in collection.' }
  }
  return { valid: true }
}
