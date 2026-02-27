import { describe, expect, test } from 'vitest'
import { cardCategoryIds, cardElementIds } from './taxonomy'
import { cardPool } from './cardPool'

describe('card pool integrity', () => {
  test('contains uniquely identified cards with contiguous stable ids', () => {
    expect(cardPool.length).toBe(151)

    const ids = cardPool.map((card) => card.id)
    expect(new Set(ids).size).toBe(cardPool.length)

    for (let index = 0; index < ids.length; index += 1) {
      expect(ids[index]).toBe(`c${String(index + 1).padStart(2, '0')}`)
    }
  })

  test('contains at least one card in each rarity', () => {
    const counts = cardPool.reduce<Record<string, number>>((acc, card) => {
      acc[card.rarity] = (acc[card.rarity] ?? 0) + 1
      return acc
    }, {})

    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
    for (const rarity of rarities) {
      expect(counts[rarity] ?? 0).toBeGreaterThan(0)
    }

    const total = rarities.reduce((sum, rarity) => sum + (counts[rarity] ?? 0), 0)
    expect(total).toBe(cardPool.length)
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

  test('maps key pokemon cards from the spreadsheet to stable ids', () => {
    expect(cardPool.find((card) => card.id === 'c01')).toMatchObject({
      id: 'c01',
      name: 'Bulbizarre',
      rarity: 'common',
      top: 2,
      right: 3,
      bottom: 2,
      left: 2,
      categoryId: 'humain',
      elementId: 'plante',
    })

    expect(cardPool.find((card) => card.id === 'c75')).toMatchObject({
      id: 'c75',
      name: 'Onix',
      rarity: 'uncommon',
      top: 4,
      right: 2,
      bottom: 4,
      left: 3,
      categoryId: 'nescient',
      elementId: 'roche',
    })

    expect(cardPool.find((card) => card.id === 'c151')).toMatchObject({
      id: 'c151',
      name: 'Mew',
      rarity: 'legendary',
      top: 8,
      right: 8,
      bottom: 8,
      left: 8,
      categoryId: 'simili',
      elementId: 'psy',
    })
  })
})
