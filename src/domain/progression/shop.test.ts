import { describe, expect, test } from 'vitest'
import { cardPool } from '../cards/cardPool'
import { createSeededRng, type SeededRng } from '../random/seededRng'
import type { PlayerProfile } from '../types'
import { createDefaultProfile } from './profile'
import { getPackPrice, openOwnedPack, purchaseShopPack } from './shop'

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
    expect(getPackPrice('legendary')).toBe(360)
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

  test('openOwnedPack pulls only cards from selected rarity pool', () => {
    const profile = createDefaultProfile()
    profile.packInventoryByRarity.legendary = 1

    const result = openOwnedPack(profile, 'legendary', createSeededRng(19))

    expect(result.opened.pulls).toHaveLength(3)
    for (const pull of result.opened.pulls) {
      expect(pull.rarity).toBe('legendary')
      const card = cardPool.find((entry) => entry.id === pull.cardId)
      expect(card?.rarity).toBe('legendary')
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

    const result = openOwnedPack(profile, 'rare', createFixedIntRng([0, 0, 0]))

    expect(result.opened.pulls[0].cardId).toBe(firstRareCardId)
    expect(result.opened.pulls[0].isNewOwnership).toBe(true)
    expect(result.opened.pulls[1].cardId).toBe(firstRareCardId)
    expect(result.opened.pulls[1].isNewOwnership).toBe(false)
    expect(result.opened.pulls[2].cardId).toBe(firstRareCardId)
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

    const result = openOwnedPack(cloneProfile(base), 'rare', createFixedIntRng([6, 0, 0]))

    expect(result.opened.pulls[0].cardId).toBe(weightedTarget)
    expect(result.opened.pulls[0].isNewOwnership).toBe(true)
  })
})
