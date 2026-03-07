import { describe, expect, test } from 'bun:test'
import { cardPool, getCard } from './cardPool'
import {
  getCpuDeckForMatch,
  getDeckForMode,
  starterOwnedCardIds,
  toggleCardInDeck,
  validateDeck,
} from './decks'
import type { DeckSlot } from '../types'

describe('decks helpers', () => {
  test('returns deck by selected mode', () => {
    const slot: DeckSlot = {
      id: 'slot-1',
      name: 'Deck 1',
      mode: '4x4',
      cards: starterOwnedCardIds.slice(0, 5),
      cards4x4: starterOwnedCardIds.slice(0, 8),
      rules: { same: false, plus: false },
    }

    expect(getDeckForMode(slot, '3x3')).toEqual(slot.cards)
    expect(getDeckForMode(slot, '4x4')).toEqual(slot.cards4x4)
  })

  test('toggleCardInDeck enforces max size cap', () => {
    const fullDeck = starterOwnedCardIds.slice(0, 5)

    expect(toggleCardInDeck(fullDeck, starterOwnedCardIds[5]!, 5)).toEqual(fullDeck)
    expect(toggleCardInDeck(fullDeck, starterOwnedCardIds[4]!, 5)).toEqual(starterOwnedCardIds.slice(0, 4))
  })

  test('validateDeck uses 3x3 and 4x4 size requirements', () => {
    const owned = [...starterOwnedCardIds]

    const valid3x3 = owned.slice(0, 5)
    const valid4x4 = owned.slice(0, 8)

    expect(validateDeck(valid3x3, owned, '3x3')).toEqual({ valid: true })
    expect(validateDeck(valid4x4, owned, '4x4')).toEqual({ valid: true })

    expect(validateDeck(owned.slice(0, 4), owned, '3x3')).toEqual({
      valid: false,
      reason: 'Deck must contain exactly 5 unique cards.',
    })
    expect(validateDeck(owned.slice(0, 7), owned, '4x4')).toEqual({
      valid: false,
      reason: 'Deck must contain exactly 8 unique cards.',
    })
  })

  test('validateDeck rejects cards not in the owned list', () => {
    const owned = [...starterOwnedCardIds]
    const nonOwned = cardPool.find((card) => !owned.includes(card.id))?.id
    expect(nonOwned).toBeTruthy()
    if (!nonOwned) {
      return
    }

    const deck = [...owned.slice(0, 4), nonOwned]
    expect(validateDeck(deck, owned, '3x3')).toEqual({
      valid: false,
      reason: 'Deck includes cards not in collection.',
    })
  })

  test('cpu deck rotation returns mode-sized unique decks', () => {
    const cpu3x3 = getCpuDeckForMatch(0, '3x3')
    const cpu4x4 = getCpuDeckForMatch(0, '4x4')

    expect(cpu3x3).toHaveLength(5)
    expect(new Set(cpu3x3).size).toBe(5)
    expect(cpu4x4).toHaveLength(8)
    expect(new Set(cpu4x4).size).toBe(8)

    expect(cpu3x3.every((cardId) => !!getCard(cardId))).toBe(true)
    expect(cpu4x4.every((cardId) => !!getCard(cardId))).toBe(true)
  })
})
