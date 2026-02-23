import { describe, expect, test } from 'vitest'
import { cardPool } from '../cards/cardPool'
import { createSeededRng, type SeededRng } from '../random/seededRng'
import type { PlayerProfile } from '../types'
import { createDefaultProfile } from './profile'
import { getPackDropRates, getPackPrice, openOwnedPack, purchaseShopPack } from './shop'

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
    ranked: {
      ...profile.ranked,
      resultStreak: { ...profile.ranked.resultStreak },
    },
    settings: { ...profile.settings },
  }
}

function createFixedIntRng(values: number[]): SeededRng {
  let index = 0

  return {
    next: () => 0,
    nextInt: (maxExclusive) => {
      if (maxExclusive <= 0) {
        throw new Error('maxExclusive must be greater than 0')
      }
      const value = values[index] ?? 0
      index += 1
      return ((value % maxExclusive) + maxExclusive) % maxExclusive
    },
  }
}

describe('shop progression', () => {
  const rarePool = cardPool.filter((card) => card.rarity === 'rare').map((card) => card.id)
  const commonPool = cardPool.filter((card) => card.rarity === 'common').map((card) => card.id)

  test('purchaseShopPack rejects purchases when gold is below pack price', () => {
    const profile = createDefaultProfile()
    profile.gold = getPackPrice('common') - 1

    expect(() => purchaseShopPack(profile, 'common')).toThrow('Not enough gold for this pack.')
  })

  test('purchaseShopPack deducts exact gold and increments pack inventory', () => {
    const profile = createDefaultProfile()
    const initialOwned = [...profile.ownedCardIds]
    const initialCopies = { ...profile.cardCopiesById }

    const result = purchaseShopPack(profile, 'common')

    expect(result.receipt.goldSpent).toBe(60)
    expect(result.receipt.goldRemaining).toBe(40)
    expect(result.receipt.packCountAfter).toBe(1)
    expect(result.profile.gold).toBe(40)
    expect(result.profile.packInventoryByRarity.common).toBe(1)
    expect(result.profile.ownedCardIds).toEqual(initialOwned)
    expect(result.profile.cardCopiesById).toEqual(initialCopies)
  })

  test('uses configured pack prices', () => {
    expect(getPackPrice('common')).toBe(60)
    expect(getPackPrice('uncommon')).toBe(120)
    expect(getPackPrice('rare')).toBe(220)
    expect(getPackPrice('epic')).toBe(300)
    expect(getPackPrice('legendary')).toBe(360)
  })

  test('exposes configured drop rates for shop packs', () => {
    expect(getPackDropRates('common')).toEqual({
      common: 70,
      uncommon: 22,
      rare: 5,
      epic: 2,
      legendary: 1,
    })
    expect(getPackDropRates('rare')).toEqual({
      common: 15,
      uncommon: 25,
      rare: 35,
      epic: 20,
      legendary: 5,
    })
    expect(getPackDropRates('legendary')).toEqual({
      common: 5,
      uncommon: 10,
      rare: 20,
      epic: 55,
      legendary: 10,
    })
  })

  test('openOwnedPack rejects opening when no pack is owned', () => {
    const profile = createDefaultProfile()

    expect(() => openOwnedPack(profile, 'rare', createSeededRng(19))).toThrow('No pack available to open.')
  })

  test('openOwnedPack decrements pack count and returns exactly three pulls', () => {
    const profile = createDefaultProfile()
    profile.packInventoryByRarity.common = 2

    const result = openOwnedPack(profile, 'common', createSeededRng(11))

    expect(result.opened.pulls).toHaveLength(3)
    expect(result.opened.remainingPackCount).toBe(1)
    expect(result.profile.packInventoryByRarity.common).toBe(1)
  })

  test('openOwnedPack can pull multiple rarities from one common pack', () => {
    const profile = createDefaultProfile()
    profile.packInventoryByRarity.common = 1

    const result = openOwnedPack(profile, 'common', createFixedIntRng([0, 0, 70, 0, 99, 0]))

    expect(result.opened.pulls).toHaveLength(3)
    expect(result.opened.pulls.map((pull) => pull.rarity)).toEqual(['common', 'uncommon', 'legendary'])
  })

  test('openOwnedPack pull rarity always matches dropped card rarity', () => {
    const profile = createDefaultProfile()
    profile.packInventoryByRarity.legendary = 1

    const result = openOwnedPack(profile, 'legendary', createFixedIntRng([0, 0, 99, 0, 50, 0]))

    expect(result.opened.pulls).toHaveLength(3)
    for (const pull of result.opened.pulls) {
      const card = cardPool.find((entry) => entry.id === pull.cardId)
      expect(card?.rarity).toBe(pull.rarity)
    }
  })

  test('openOwnedPack increments copy counts for duplicate pulls without duplicating owned ids', () => {
    const profile = createDefaultProfile()
    profile.packInventoryByRarity.common = 1
    profile.ownedCardIds = [...commonPool]
    profile.cardCopiesById = Object.fromEntries(commonPool.map((cardId) => [cardId, 1]))
    const initialOwnedCount = profile.ownedCardIds.length
    const initialCopies = Object.values(profile.cardCopiesById).reduce((sum, copies) => sum + copies, 0)

    const result = openOwnedPack(profile, 'common', createSeededRng(31))

    expect(result.profile.ownedCardIds).toHaveLength(initialOwnedCount)
    expect(new Set(result.profile.ownedCardIds).size).toBe(initialOwnedCount)

    const totalCopies = Object.values(result.profile.cardCopiesById).reduce((sum, copies) => sum + copies, 0)
    expect(totalCopies).toBe(initialCopies + 3)
    expect(result.opened.pulls.every((pull) => pull.isNewOwnership === false)).toBe(true)
  })

  test('openOwnedPack marks NEW only for first ownership and increments duplicate copies', () => {
    const profile = createDefaultProfile()
    profile.packInventoryByRarity.rare = 1
    const firstRareCardId = rarePool[0]

    const result = openOwnedPack(profile, 'rare', createFixedIntRng([40, 0, 40, 0, 40, 0]))

    expect(result.opened.pulls[0].cardId).toBe(firstRareCardId)
    expect(result.opened.pulls[0].rarity).toBe('rare')
    expect(result.opened.pulls[0].isNewOwnership).toBe(true)
    expect(result.opened.pulls[1].cardId).toBe(firstRareCardId)
    expect(result.opened.pulls[1].rarity).toBe('rare')
    expect(result.opened.pulls[1].isNewOwnership).toBe(false)
    expect(result.opened.pulls[2].cardId).toBe(firstRareCardId)
    expect(result.opened.pulls[2].rarity).toBe('rare')
    expect(result.opened.pulls[2].isNewOwnership).toBe(false)

    expect(result.profile.ownedCardIds.filter((cardId) => cardId === firstRareCardId)).toEqual([firstRareCardId])
    expect(result.profile.cardCopiesById[firstRareCardId]).toBe(3)
  })

  test('openOwnedPack weights missing cards more heavily on the first pull', () => {
    const base = createDefaultProfile()
    base.packInventoryByRarity.rare = 1
    const ownedRareIds = rarePool.slice(0, 4)
    const weightedTarget = rarePool[4]
    base.ownedCardIds = [...ownedRareIds]
    base.cardCopiesById = Object.fromEntries(ownedRareIds.map((cardId) => [cardId, 1]))

    const result = openOwnedPack(cloneProfile(base), 'rare', createFixedIntRng([40, 6]))

    expect(result.opened.pulls[0].cardId).toBe(weightedTarget)
    expect(result.opened.pulls[0].rarity).toBe('rare')
    expect(result.opened.pulls[0].isNewOwnership).toBe(true)
  })
})
