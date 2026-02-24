import { describe, expect, test } from 'vitest'
import { cardPool } from '../cards/cardPool'
import { createSeededRng, type SeededRng } from '../random/seededRng'
import type { PlayerProfile } from '../types'
import { createDefaultProfile } from './profile'
import {
  getPackDropRates,
  getPackPrice,
  getSpecialPackPrice,
  openOwnedPacks,
  openOwnedPack,
  purchaseAndOpenSpecialPack,
  purchaseShopPacks,
  purchaseShopPack,
} from './shop'

function cloneProfile(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: profile.deckSlots.map((slot) => ({
      ...slot,
      cards: [...slot.cards],
      cards4x4: [...slot.cards4x4],
      rules: { ...slot.rules },
    })) as PlayerProfile['deckSlots'],
    stats: { ...profile.stats },
    achievements: [...profile.achievements],
    rankedByMode: {
      '3x3': {
        ...profile.rankedByMode['3x3'],
        resultStreak: { ...profile.rankedByMode['3x3'].resultStreak },
      },
      '4x4': {
        ...profile.rankedByMode['4x4'],
        resultStreak: { ...profile.rankedByMode['4x4'].resultStreak },
      },
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
  const legendaryPool = cardPool.filter((card) => card.rarity === 'legendary').map((card) => card.id)

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

  test('purchaseShopPacks rejects invalid quantities', () => {
    const profile = createDefaultProfile()

    expect(() => purchaseShopPacks(profile, 'common', 0)).toThrow('Pack quantity must be an integer greater than 0.')
    expect(() => purchaseShopPacks(profile, 'common', -1)).toThrow('Pack quantity must be an integer greater than 0.')
    expect(() => purchaseShopPacks(profile, 'common', 1.5)).toThrow('Pack quantity must be an integer greater than 0.')
  })

  test('purchaseShopPacks multiplies cost and increments inventory by quantity', () => {
    const profile = createDefaultProfile()
    profile.gold = 180

    const result = purchaseShopPacks(profile, 'common', 3)

    expect(result.receipt.goldSpent).toBe(180)
    expect(result.receipt.goldRemaining).toBe(0)
    expect(result.receipt.packCountAfter).toBe(3)
    expect(result.profile.gold).toBe(0)
    expect(result.profile.packInventoryByRarity.common).toBe(3)
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
      common: 11,
      uncommon: 22,
      rare: 44,
      epic: 20,
      legendary: 3,
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

  test('openOwnedPacks rejects opening more packs than available', () => {
    const profile = createDefaultProfile()
    profile.packInventoryByRarity.rare = 1

    expect(() => openOwnedPacks(profile, 'rare', 2, createSeededRng(7))).toThrow('Not enough packs available to open.')
  })

  test('openOwnedPacks opens quantity and returns 3 pulls per opened pack', () => {
    const profile = createDefaultProfile()
    profile.packInventoryByRarity.common = 4

    const result = openOwnedPacks(profile, 'common', 3, createSeededRng(17))

    expect(result.opened.openedCount).toBe(3)
    expect(result.opened.pulls).toHaveLength(9)
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

  test('uses configured special pack prices', () => {
    expect(getSpecialPackPrice('sans_coeur_focus')).toBe(220)
    expect(getSpecialPackPrice('simili_focus')).toBe(220)
    expect(getSpecialPackPrice('legendary_focus')).toBe(900)
  })

  test('purchaseAndOpenSpecialPack rejects purchases when gold is below special pack price', () => {
    const profile = createDefaultProfile()
    profile.gold = getSpecialPackPrice('sans_coeur_focus') - 1

    expect(() =>
      purchaseAndOpenSpecialPack(profile, { packId: 'sans_coeur_focus' }, createSeededRng(17)),
    ).toThrow('Not enough gold for this special pack.')
  })

  test('sans_coeur_focus pulls only Obscur cards', () => {
    const profile = createDefaultProfile()
    profile.gold = 2000

    const result = purchaseAndOpenSpecialPack(profile, { packId: 'sans_coeur_focus' }, createSeededRng(21))

    expect(result.profile.gold).toBe(1780)
    expect(result.opened.pulls).toHaveLength(3)
    for (const pull of result.opened.pulls) {
      const card = cardPool.find((entry) => entry.id === pull.cardId)
      expect(card?.categoryId).toBe('sans_coeur')
    }
  })

  test('sans_coeur_focus can roll a 1% legendary Obscur pull', () => {
    const profile = createDefaultProfile()
    profile.gold = 2000

    const result = purchaseAndOpenSpecialPack(
      profile,
      { packId: 'sans_coeur_focus' },
      createFixedIntRng([99, 0, 0, 0, 0, 0]),
    )

    expect(result.opened.pulls[0].rarity).toBe('legendary')
    const firstPullCard = cardPool.find((entry) => entry.id === result.opened.pulls[0].cardId)
    expect(firstPullCard?.categoryId).toBe('sans_coeur')
  })

  test('simili_focus pulls only Psy cards and never unsupported rarities', () => {
    let profile = createDefaultProfile()
    profile.gold = 10000
    const rng = createSeededRng(33)
    const seenRarities = new Set<string>()
    const similiAllowedRarities = new Set(
      cardPool.filter((card) => card.categoryId === 'simili').map((card) => card.rarity),
    )

    for (let index = 0; index < 10; index += 1) {
      const result = purchaseAndOpenSpecialPack(profile, { packId: 'simili_focus' }, rng)
      profile = result.profile
      for (const pull of result.opened.pulls) {
        const card = cardPool.find((entry) => entry.id === pull.cardId)
        expect(card?.categoryId).toBe('simili')
        seenRarities.add(pull.rarity)
      }
    }

    for (const rarity of seenRarities) {
      expect(similiAllowedRarities.has(rarity as (typeof cardPool)[number]['rarity'])).toBe(true)
    }
  })

  test('legendary_focus miss at base 1% increases pity chance to 2%', () => {
    const profile = createDefaultProfile()
    profile.gold = 5000
    profile.specialPackPity = { legendaryFocusChancePercent: 1 }
    const targetLegendaryCardId = legendaryPool[0]

    const result = purchaseAndOpenSpecialPack(
      profile,
      { packId: 'legendary_focus', targetLegendaryCardId },
      createFixedIntRng([1, 0, 0, 0, 0, 0, 0]),
    )

    expect(result.opened.pulls[0].cardId).not.toBe(targetLegendaryCardId)
    expect(result.profile.specialPackPity?.legendaryFocusChancePercent).toBe(2)
  })

  test('legendary_focus hit resets pity chance to 1% and grants target card', () => {
    const profile = createDefaultProfile()
    profile.gold = 5000
    profile.specialPackPity = { legendaryFocusChancePercent: 4 }
    const targetLegendaryCardId = legendaryPool[0]
    const targetCopiesBefore = profile.cardCopiesById[targetLegendaryCardId] ?? 0

    const result = purchaseAndOpenSpecialPack(
      profile,
      { packId: 'legendary_focus', targetLegendaryCardId },
      createFixedIntRng([3, 0, 0, 0, 0, 0]),
    )

    expect(result.opened.pulls[0].cardId).toBe(targetLegendaryCardId)
    expect(result.opened.pulls[0].rarity).toBe('legendary')
    expect(result.profile.cardCopiesById[targetLegendaryCardId]).toBe(targetCopiesBefore + 1)
    expect(result.profile.specialPackPity?.legendaryFocusChancePercent).toBe(1)
  })

  test('legendary_focus pity chance caps at 100% when misses continue', () => {
    const profile = createDefaultProfile()
    profile.gold = 5000
    profile.specialPackPity = { legendaryFocusChancePercent: 99 }
    const targetLegendaryCardId = legendaryPool[0]

    const result = purchaseAndOpenSpecialPack(
      profile,
      { packId: 'legendary_focus', targetLegendaryCardId },
      createFixedIntRng([99, 0, 0, 0, 0, 0, 0]),
    )

    expect(result.opened.pulls[0].cardId).not.toBe(targetLegendaryCardId)
    expect(result.profile.specialPackPity?.legendaryFocusChancePercent).toBe(100)
  })

  test('legendary_focus pulls 2 and 3 are always humain fillers', () => {
    const profile = createDefaultProfile()
    profile.gold = 5000
    const targetLegendaryCardId = legendaryPool[0]

    const result = purchaseAndOpenSpecialPack(
      profile,
      { packId: 'legendary_focus', targetLegendaryCardId },
      createSeededRng(91),
    )

    for (const filler of result.opened.pulls.slice(1)) {
      const card = cardPool.find((entry) => entry.id === filler.cardId)
      expect(card?.categoryId).toBe('humain')
    }
  })

  test('purchaseAndOpenSpecialPack always evaluates achievements after opening', () => {
    const profile = createDefaultProfile()
    profile.gold = 2000
    profile.stats.played = 1
    profile.achievements = []

    const result = purchaseAndOpenSpecialPack(profile, { packId: 'sans_coeur_focus' }, createSeededRng(97))

    expect(result.profile.achievements.some((entry) => entry.id === 'play_1')).toBe(true)
  })

  test('purchaseAndOpenSpecialPack updates copies and NEW ownership flags', () => {
    const profile = createDefaultProfile()
    profile.gold = 2000
    const result = purchaseAndOpenSpecialPack(profile, { packId: 'sans_coeur_focus' }, createSeededRng(101))

    const totalCopiesBefore = Object.values(profile.cardCopiesById).reduce((sum, copies) => sum + copies, 0)
    const totalCopiesAfter = Object.values(result.profile.cardCopiesById).reduce((sum, copies) => sum + copies, 0)
    expect(totalCopiesAfter).toBe(totalCopiesBefore + 3)

    for (const pull of result.opened.pulls) {
      expect(result.profile.cardCopiesById[pull.cardId]).toBeGreaterThanOrEqual(1)
      if (pull.isNewOwnership) {
        expect(result.profile.ownedCardIds.includes(pull.cardId)).toBe(true)
      }
    }
  })
})
