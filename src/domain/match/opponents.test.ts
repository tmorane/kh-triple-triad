import { describe, expect, test } from 'vitest'
import { cardPool, getCard } from '../cards/cardPool'
import { createDefaultProfile } from '../progression/profile'
import type { OpponentLevel } from './opponents'
import {
  buildAutoPlayerDeck,
  buildCpuOpponent,
  buildCpuOpponentForLevel,
  computeDeckScore,
  getCpuOpponentPreviewForLevel,
  getOpponentLevelForProfile,
  getOpponentLevelInfo,
  opponentLevelConfigs,
} from './opponents'

function makeProfileAtTier(tierId: ReturnType<typeof createDefaultProfile>['ranked']['tier']) {
  const profile = createDefaultProfile()
  profile.ranked.tier = tierId
  profile.ranked.division =
    tierId === 'master' || tierId === 'grandmaster' || tierId === 'challenger' ? null : 'IV'
  return profile
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

describe('opponents', () => {
  test('maps ranked tiers to opponent levels 1..8', () => {
    const expectedByTier: Array<{ tierId: ReturnType<typeof createDefaultProfile>['ranked']['tier']; level: OpponentLevel }> = [
      { tierId: 'iron', level: 1 },
      { tierId: 'bronze', level: 2 },
      { tierId: 'silver', level: 3 },
      { tierId: 'gold', level: 4 },
      { tierId: 'platinum', level: 5 },
      { tierId: 'emerald', level: 6 },
      { tierId: 'diamond', level: 7 },
      { tierId: 'master', level: 8 },
      { tierId: 'grandmaster', level: 8 },
      { tierId: 'challenger', level: 8 },
    ]

    for (const { tierId, level } of expectedByTier) {
      const profile = makeProfileAtTier(tierId)
      expect(getOpponentLevelForProfile(profile)).toBe(level)
    }
  })

  test('builds 5 unique CPU cards with score near target and inside configured range', () => {
    const profile = createDefaultProfile()
    const playerDeck = profile.deckSlots[0].cards
    const opponent = buildCpuOpponent(profile, playerDeck, 2026)

    expect(opponent.deck).toHaveLength(5)
    expect(new Set(opponent.deck).size).toBe(5)
    expect(opponent.deckScore).toBeGreaterThanOrEqual(opponent.scoreRange.min)
    expect(opponent.deckScore).toBeLessThanOrEqual(opponent.scoreRange.max)
    expect(Math.abs(opponent.deckScore - opponent.adaptiveTargetScore)).toBeLessThanOrEqual(3)
  })

  test('builds CPU opponent for an explicitly selected level', () => {
    const playerDeck = createDefaultProfile().deckSlots[0].cards
    const opponent = buildCpuOpponentForLevel(8, playerDeck, 3030)

    expect(opponent.level).toBe(8)
    expect(opponent.tierId).toBe('master')
    expect(opponent.aiProfile).toBe('expert')
    expect(opponent.scoreRange).toEqual({ min: 150, max: 178 })
    expect(opponent.deck).toHaveLength(5)
    expect(new Set(opponent.deck).size).toBe(5)
    expect(opponent.deckScore).toBeGreaterThanOrEqual(opponent.scoreRange.min)
    expect(opponent.deckScore).toBeLessThanOrEqual(opponent.scoreRange.max)
  })

  test('returns preview config for an explicitly selected level', () => {
    const playerDeck = createDefaultProfile().deckSlots[0].cards
    const preview = getCpuOpponentPreviewForLevel(6, playerDeck)

    expect(preview.level).toBe(6)
    expect(preview.tierId).toBe('emerald')
    expect(preview.aiProfile).toBe('expert')
    expect(preview.scoreRange).toEqual({ min: 104, max: 128 })
    expect(preview.winGoldBonus).toBe(20)
    expect(preview.adaptiveTargetScore).toBeGreaterThanOrEqual(preview.scoreRange.min)
    expect(preview.adaptiveTargetScore).toBeLessThanOrEqual(preview.scoreRange.max)
  })

  test('returns rich level info for setup chips metadata', () => {
    const info = getOpponentLevelInfo(7)

    expect(info.level).toBe(7)
    expect(info.tierId).toBe('diamond')
    expect(info.aiProfile).toBe('expert')
    expect(info.scoreRange).toEqual({ min: 132, max: 158 })
    expect(info.winGoldBonus).toBe(24)
    expect(info.rarityWeights).toEqual({ epic: 0.65, legendary: 0.35 })
  })

  test('only uses allowed rarities for each level config', () => {
    const playerProfile = createDefaultProfile()
    const playerDeck = playerProfile.deckSlots[0].cards

    for (const config of opponentLevelConfigs) {
      const profile = makeProfileAtTier(config.tierId)
      const opponent = buildCpuOpponent(profile, playerDeck, config.level * 11)
      const allowedRarities = new Set(Object.keys(config.rarityWeights))

      for (const cardId of opponent.deck) {
        expect(allowedRarities.has(getCard(cardId).rarity)).toBe(true)
      }
    }
  })

  test('is deterministic for identical inputs and seed', () => {
    const profile = makeProfileAtTier('emerald')
    const playerDeck = ['c41', 'c42', 'c43', 'c44', 'c45']

    const a = buildCpuOpponent(profile, playerDeck, 123456)
    const b = buildCpuOpponent(profile, playerDeck, 123456)

    expect(a).toEqual(b)
  })

  test('increases median CPU deck score from L1 to L8', () => {
    const playerDeck = createDefaultProfile().deckSlots[0].cards
    const mediansByLevel: number[] = []

    for (let level = 1 as OpponentLevel; level <= 8; level = (level + 1) as OpponentLevel) {
      const config = opponentLevelConfigs[level - 1]
      const profile = makeProfileAtTier(config.tierId)
      const samples: number[] = []
      for (let seed = 1; seed <= 21; seed += 1) {
        samples.push(buildCpuOpponent(profile, playerDeck, seed).deckScore)
      }
      mediansByLevel.push(median(samples))
    }

    expect(mediansByLevel).toEqual([...mediansByLevel].sort((left, right) => left - right))
  })

  test('computeDeckScore sums all four sides across 5 cards', () => {
    const deck = ['c106', 'c107', 'c108', 'c109', 'c110']
    const expected = deck.reduce((sum, cardId) => {
      const card = getCard(cardId)
      return sum + card.top + card.right + card.bottom + card.left
    }, 0)

    expect(computeDeckScore(deck)).toBe(expected)
  })

  test('buildAutoPlayerDeck creates a random unique deck inside opponent range', () => {
    const level4Range = opponentLevelConfigs.find((entry) => entry.level === 4)?.scoreRange
    expect(level4Range).toBeTruthy()
    if (!level4Range) {
      return
    }

    const ownedCardIds = cardPool.map((card) => card.id)
    const deckA = buildAutoPlayerDeck(level4Range, 8080, '3x3', ownedCardIds)
    const deckB = buildAutoPlayerDeck(level4Range, 9090, '3x3', ownedCardIds)
    const scoreA = computeDeckScore(deckA)

    expect(deckA).toHaveLength(5)
    expect(new Set(deckA).size).toBe(5)
    expect(deckA.every((cardId) => ownedCardIds.includes(cardId))).toBe(true)
    expect(scoreA).toBeGreaterThanOrEqual(level4Range.min)
    expect(scoreA).toBeLessThanOrEqual(level4Range.max)
    expect(deckA).not.toEqual(deckB)
  })

  test('buildAutoPlayerDeck stays within owned cards when owned pool is constrained', () => {
    const level4Range = opponentLevelConfigs.find((entry) => entry.level === 4)?.scoreRange
    expect(level4Range).toBeTruthy()
    if (!level4Range) {
      return
    }

    const ownedCardIds = createDefaultProfile().ownedCardIds
    const deck = buildAutoPlayerDeck(level4Range, 8080, '3x3', ownedCardIds)

    expect(deck).toHaveLength(5)
    expect(new Set(deck).size).toBe(5)
    expect(deck.every((cardId) => ownedCardIds.includes(cardId))).toBe(true)
  })

  test('buildAutoPlayerDeck throws when owned collection is smaller than deck size', () => {
    const level4Range = opponentLevelConfigs.find((entry) => entry.level === 4)?.scoreRange
    expect(level4Range).toBeTruthy()
    if (!level4Range) {
      return
    }

    const insufficientOwned = createDefaultProfile().ownedCardIds.slice(0, 7)
    expect(() => buildAutoPlayerDeck(level4Range, 2026, '4x4', insufficientOwned)).toThrow(
      'Auto Deck requires at least 8 owned cards for 4x4.',
    )
  })
})
