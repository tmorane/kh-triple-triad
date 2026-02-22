import { describe, expect, test } from 'vitest'
import { cardCategoryIds, cardElementIds } from './taxonomy'
import { cardPool } from './cardPool'

describe('card pool integrity', () => {
  test('contains exactly 150 uniquely identified cards', () => {
    expect(cardPool).toHaveLength(150)
    const ids = cardPool.map((card) => card.id)
    expect(new Set(ids).size).toBe(150)
  })

  test('matches expected rarity distribution', () => {
    const counts = cardPool.reduce<Record<string, number>>((acc, card) => {
      acc[card.rarity] = (acc[card.rarity] ?? 0) + 1
      return acc
    }, {})

    expect(counts.common).toBe(45)
    expect(counts.uncommon).toBe(35)
    expect(counts.rare).toBe(30)
    expect(counts.epic).toBe(25)
    expect(counts.legendary).toBe(15)
  })

  test('uses side values between 1 and 10', () => {
    for (const card of cardPool) {
      expect(card.top).toBeGreaterThanOrEqual(1)
      expect(card.top).toBeLessThanOrEqual(10)
      expect(card.right).toBeGreaterThanOrEqual(1)
      expect(card.right).toBeLessThanOrEqual(10)
      expect(card.bottom).toBeGreaterThanOrEqual(1)
      expect(card.bottom).toBeLessThanOrEqual(10)
      expect(card.left).toBeGreaterThanOrEqual(1)
      expect(card.left).toBeLessThanOrEqual(10)
    }
  })

  test('uses only known taxonomy ids for categories and elements', () => {
    const categoryIdSet = new Set(cardCategoryIds)
    const elementIdSet = new Set(cardElementIds)

    for (const card of cardPool) {
      expect(categoryIdSet.has(card.categoryId)).toBe(true)
      expect(elementIdSet.has(card.elementId)).toBe(true)
    }
  })
})
