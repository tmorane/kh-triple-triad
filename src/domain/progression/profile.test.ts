import { beforeEach, describe, expect, test } from 'vitest'
import { starterDeck, starterOwnedCardIds } from '../cards/decks'
import { cardPool } from '../cards/cardPool'
import { createDefaultProfile, createResetProfile, loadProfile, PROFILE_STORAGE_KEY, saveProfile } from './profile'

function copiesFor(cardIds: string[]): Record<string, number> {
  return Object.fromEntries(cardIds.map((cardId) => [cardId, 1]))
}

function emptyPackInventory() {
  return {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  }
}

describe('profile persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('creates a default profile on first launch', () => {
    const profile = loadProfile()

    expect(profile.version).toBe(5)
    expect(profile.gold).toBe(100)
    expect(profile.ownedCardIds).toEqual(starterOwnedCardIds)
    expect(profile.cardCopiesById).toEqual(copiesFor(starterOwnedCardIds))
    expect(profile.packInventoryByRarity).toEqual(emptyPackInventory())
    expect(profile.rankRewardsClaimed).toEqual([])
    expect(profile.selectedDeckSlotId).toBe('slot-1')
    expect(profile.deckSlots).toEqual([
      {
        id: 'slot-1',
        name: 'Deck 1',
        cards: starterDeck,
        rules: { same: false, plus: false },
      },
      {
        id: 'slot-2',
        name: 'Deck 2',
        cards: [],
        rules: { same: false, plus: false },
      },
      {
        id: 'slot-3',
        name: 'Deck 3',
        cards: [],
        rules: { same: false, plus: false },
      },
    ])
    expect(profile.settings.audioEnabled).toBe(false)
  })

  test('createResetProfile gives 6 common, 2 uncommon, 1 rare, 1 epic starter cards', () => {
    const profile = createResetProfile()

    expect(profile.ownedCardIds).toHaveLength(10)
    expect(new Set(profile.ownedCardIds).size).toBe(10)
    expect(Object.keys(profile.cardCopiesById)).toHaveLength(10)
    expect(Object.values(profile.cardCopiesById)).toEqual(Array(10).fill(1))
    expect(profile.rankRewardsClaimed).toEqual([])

    const rarityCounts = profile.ownedCardIds.reduce(
      (counts, cardId) => {
        const rarity = cardPool.find((card) => card.id === cardId)?.rarity
        if (!rarity) {
          return counts
        }
        counts[rarity] += 1
        return counts
      },
      { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
    )

    expect(rarityCounts).toEqual({
      common: 6,
      uncommon: 2,
      rare: 1,
      epic: 1,
      legendary: 0,
    })

    expect(profile.deckSlots[0].cards).toHaveLength(5)
    expect(profile.deckSlots[0].cards.every((cardId) => profile.ownedCardIds.includes(cardId))).toBe(true)
  })

  test('returns exactly what was saved on reload', () => {
    const profile = createDefaultProfile()
    const slotTwoCards = starterOwnedCardIds.slice(5, 10)
    const updated: ReturnType<typeof createDefaultProfile> = {
      ...profile,
      gold: 120,
      stats: {
        played: 0,
        won: 0,
        streak: 0,
        bestStreak: 0,
      },
      selectedDeckSlotId: 'slot-2' as const,
      deckSlots: [
        {
          id: 'slot-1' as const,
          name: 'Deck 1',
          cards: starterDeck,
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-2' as const,
          name: 'Ranked',
          cards: slotTwoCards,
          rules: { same: true, plus: false },
        },
        {
          id: 'slot-3' as const,
          name: 'Alt',
          cards: [],
          rules: { same: false, plus: true },
        },
      ],
    }

    saveProfile(updated)

    expect(loadProfile()).toEqual(updated)
  })

  test('retroactively unlocks achievements on load when snapshot conditions are already met', () => {
    const profile = createDefaultProfile()
    profile.gold = 220
    profile.stats.played = 10
    profile.stats.won = 5
    profile.stats.streak = 3
    profile.stats.bestStreak = 3
    profile.deckSlots[0].rules = { same: true, plus: true }
    profile.ownedCardIds = cardPool.slice(0, 30).map((card) => card.id)
    profile.cardCopiesById = copiesFor(profile.ownedCardIds)
    profile.achievements = []

    saveProfile(profile)
    const loaded = loadProfile()

    const unlockedIds = loaded.achievements.map((entry) => entry.id)
    expect(unlockedIds).toEqual(
      expect.arrayContaining([
        'play_1',
        'play_3',
        'play_5',
        'play_10',
        'first_win',
        'tactician_margin_3',
        'wins_5',
        'streak_2',
        'win_streak_3',
        'owned_15',
        'owned_30',
        'gold_150',
        'gold_200',
        'rule_scholar',
      ]),
    )

    const persisted = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '{}') as {
      achievements?: Array<{ id: string }>
    }
    const persistedIds = persisted.achievements?.map((entry) => entry.id) ?? []
    expect(persistedIds).toEqual(expect.arrayContaining(['play_10', 'wins_5', 'gold_200', 'rule_scholar']))
  })

  test('migrates a v2 profile to v5 and persists migration', () => {
    const v2Owned = starterOwnedCardIds
    const v2 = {
      version: 2,
      gold: 175,
      ownedCardIds: v2Owned,
      deckSlots: [
        {
          id: 'slot-1' as const,
          name: 'Deck 1',
          cards: v2Owned.slice(0, 5),
          rules: { same: true, plus: false },
        },
        {
          id: 'slot-2' as const,
          name: 'Deck 2',
          cards: [],
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-3' as const,
          name: 'Deck 3',
          cards: [],
          rules: { same: false, plus: false },
        },
      ],
      selectedDeckSlotId: 'slot-1' as const,
      stats: { played: 12, won: 8, streak: 2, bestStreak: 3 },
      achievements: [{ id: 'first_win', unlockedAt: '2026-02-22T00:00:00.000Z' }],
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v2))

    const migrated = loadProfile()

    expect(migrated.version).toBe(5)
    expect(migrated.gold).toBe(495)
    expect(migrated.ownedCardIds).toEqual(v2.ownedCardIds)
    expect(migrated.stats).toEqual(v2.stats)
    expect(migrated.settings).toEqual(v2.settings)
    expect(migrated.cardCopiesById).toEqual(copiesFor(v2Owned))
    expect(migrated.packInventoryByRarity).toEqual({ common: 1, uncommon: 1, rare: 0, epic: 0, legendary: 0 })
    expect(migrated.rankRewardsClaimed).toEqual(['R1', 'R2', 'R3', 'R4'])

    const unlockedIdsFromV2 = migrated.achievements.map((entry) => entry.id)
    expect(unlockedIdsFromV2).toEqual(
      expect.arrayContaining([
        'first_win',
        'play_1',
        'play_3',
        'play_5',
        'play_10',
        'tactician_margin_3',
        'wins_5',
        'streak_2',
        'win_streak_3',
        'gold_150',
      ]),
    )

    const persisted = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '{}') as {
      version?: number
      rankRewardsClaimed?: string[]
    }
    expect(persisted.version).toBe(5)
    expect(persisted.rankRewardsClaimed).toEqual(['R1', 'R2', 'R3', 'R4'])
  })

  test('migrates a v1 profile to v5 and persists migration', () => {
    const v1Owned = starterOwnedCardIds
    const v1 = {
      version: 1,
      gold: 175,
      ownedCardIds: v1Owned,
      activeDeck: v1Owned.slice(0, 5),
      lastRules: { same: true, plus: false },
      stats: { played: 12, won: 8, streak: 2, bestStreak: 3 },
      achievements: [{ id: 'first_win', unlockedAt: '2026-02-22T00:00:00.000Z' }],
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v1))

    const migrated = loadProfile()

    expect(migrated.version).toBe(5)
    expect(migrated.gold).toBe(495)
    expect(migrated.ownedCardIds).toEqual(v1.ownedCardIds)
    expect(migrated.stats).toEqual(v1.stats)
    expect(migrated.settings).toEqual(v1.settings)
    expect(migrated.selectedDeckSlotId).toBe('slot-1')
    expect(migrated.deckSlots[0]).toEqual({
      id: 'slot-1',
      name: 'Deck 1',
      cards: v1Owned.slice(0, 5),
      rules: { same: true, plus: false },
    })
    expect(migrated.deckSlots[1].cards).toEqual([])
    expect(migrated.deckSlots[2].cards).toEqual([])
    expect(migrated.cardCopiesById).toEqual(copiesFor(v1Owned))
    expect(migrated.packInventoryByRarity).toEqual({ common: 1, uncommon: 1, rare: 0, epic: 0, legendary: 0 })
    expect(migrated.rankRewardsClaimed).toEqual(['R1', 'R2', 'R3', 'R4'])

    const unlockedIdsFromV1 = migrated.achievements.map((entry) => entry.id)
    expect(unlockedIdsFromV1).toEqual(
      expect.arrayContaining([
        'first_win',
        'play_1',
        'play_3',
        'play_5',
        'play_10',
        'tactician_margin_3',
        'wins_5',
        'streak_2',
        'win_streak_3',
        'gold_150',
      ]),
    )

    const persisted = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '{}') as { version?: number }
    expect(persisted.version).toBe(5)
  })

  test('migrates a v3 profile to v5 and replaces legacy collection achievement ids', () => {
    const ownedCardIds = cardPool.slice(0, 45).map((card) => card.id)
    const v3 = {
      version: 3,
      gold: 200,
      ownedCardIds,
      cardCopiesById: copiesFor(ownedCardIds),
      deckSlots: [
        {
          id: 'slot-1' as const,
          name: 'Deck 1',
          cards: ownedCardIds.slice(0, 5),
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-2' as const,
          name: 'Deck 2',
          cards: [],
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-3' as const,
          name: 'Deck 3',
          cards: [],
          rules: { same: false, plus: false },
        },
      ],
      selectedDeckSlotId: 'slot-1' as const,
      stats: { played: 2, won: 1, streak: 1, bestStreak: 1 },
      achievements: [
        { id: 'play_1', unlockedAt: '2026-02-22T00:00:00.000Z' },
        { id: 'owned_20', unlockedAt: '2026-02-22T00:00:00.000Z' },
      ],
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v3))

    const migrated = loadProfile()

    expect(migrated.version).toBe(5)
    expect(migrated.gold).toBe(240)
    expect(migrated.packInventoryByRarity).toEqual(emptyPackInventory())
    expect(migrated.rankRewardsClaimed).toEqual(['R1'])

    const achievementIds = migrated.achievements.map((entry) => entry.id)
    expect(achievementIds).toEqual(expect.arrayContaining(['play_1', 'owned_15', 'owned_30', 'owned_45']))
    expect(achievementIds).not.toContain('owned_20')

    const persisted = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '{}') as { version?: number }
    expect(persisted.version).toBe(5)
  })

  test('migrates a v4 profile to v5 with rankRewardsClaimed initialized', () => {
    const v4 = {
      version: 4,
      gold: 140,
      ownedCardIds: starterOwnedCardIds,
      cardCopiesById: copiesFor(starterOwnedCardIds),
      packInventoryByRarity: emptyPackInventory(),
      deckSlots: [
        {
          id: 'slot-1' as const,
          name: 'Deck 1',
          cards: starterOwnedCardIds.slice(0, 5),
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-2' as const,
          name: 'Deck 2',
          cards: [],
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-3' as const,
          name: 'Deck 3',
          cards: [],
          rules: { same: false, plus: false },
        },
      ],
      selectedDeckSlotId: 'slot-1' as const,
      stats: { played: 0, won: 0, streak: 0, bestStreak: 0 },
      achievements: [],
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v4))

    const migrated = loadProfile()

    expect(migrated.version).toBe(5)
    expect(migrated.gold).toBe(140)
    expect(migrated.rankRewardsClaimed).toEqual([])
  })

  test('grants catch-up rank rewards once when loading a migrated high-rank profile', () => {
    const v4 = {
      version: 4,
      gold: 300,
      ownedCardIds: starterOwnedCardIds,
      cardCopiesById: copiesFor(starterOwnedCardIds),
      packInventoryByRarity: emptyPackInventory(),
      deckSlots: [
        {
          id: 'slot-1' as const,
          name: 'Deck 1',
          cards: starterOwnedCardIds.slice(0, 5),
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-2' as const,
          name: 'Deck 2',
          cards: [],
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-3' as const,
          name: 'Deck 3',
          cards: [],
          rules: { same: false, plus: false },
        },
      ],
      selectedDeckSlotId: 'slot-1' as const,
      stats: { played: 9, won: 6, streak: 0, bestStreak: 6 },
      achievements: [],
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v4))

    const loaded = loadProfile()

    expect(loaded.gold).toBe(620)
    expect(loaded.rankRewardsClaimed).toEqual(['R1', 'R2', 'R3', 'R4'])
    expect(loaded.packInventoryByRarity.common).toBe(1)
    expect(loaded.packInventoryByRarity.uncommon).toBe(1)
  })

  test('reload after catch-up does not grant additional rank rewards', () => {
    const v4 = {
      version: 4,
      gold: 300,
      ownedCardIds: starterOwnedCardIds,
      cardCopiesById: copiesFor(starterOwnedCardIds),
      packInventoryByRarity: emptyPackInventory(),
      deckSlots: [
        {
          id: 'slot-1' as const,
          name: 'Deck 1',
          cards: starterOwnedCardIds.slice(0, 5),
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-2' as const,
          name: 'Deck 2',
          cards: [],
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-3' as const,
          name: 'Deck 3',
          cards: [],
          rules: { same: false, plus: false },
        },
      ],
      selectedDeckSlotId: 'slot-1' as const,
      stats: { played: 9, won: 6, streak: 0, bestStreak: 6 },
      achievements: [],
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v4))

    const first = loadProfile()
    const second = loadProfile()

    expect(second.gold).toBe(first.gold)
    expect(second.rankRewardsClaimed).toEqual(first.rankRewardsClaimed)
    expect(second.packInventoryByRarity).toEqual(first.packInventoryByRarity)
  })

  test('falls back to default profile on corrupt JSON', () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, '{broken json')

    const profile = loadProfile()

    expect(profile).toEqual(createDefaultProfile())
  })
})
