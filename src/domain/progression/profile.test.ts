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

    expect(profile.version).toBe(6)
    expect(profile.playerName).toBe('Joueur')
    expect(profile.gold).toBe(100)
    expect(profile.ownedCardIds).toEqual(starterOwnedCardIds)
    expect(profile.cardCopiesById).toEqual(copiesFor(starterOwnedCardIds))
    expect(profile.packInventoryByRarity).toEqual(emptyPackInventory())
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
    expect(profile.ranked).toEqual({
      tier: 'iron',
      division: 'IV',
      lp: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      matchesPlayed: 0,
      resultStreak: { type: 'none', count: 0 },
      demotionShieldLosses: 0,
    })
    expect(profile.settings.audioEnabled).toBe(false)
  })

  test('createResetProfile gives 6 common, 2 uncommon, 1 rare, 1 epic starter cards', () => {
    const profile = createResetProfile()

    expect(profile.ownedCardIds).toHaveLength(10)
    expect(new Set(profile.ownedCardIds).size).toBe(10)
    expect(Object.keys(profile.cardCopiesById)).toHaveLength(10)
    expect(Object.values(profile.cardCopiesById)).toEqual(Array(10).fill(1))

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
    expect(profile.ranked.tier).toBe('iron')
    expect(profile.ranked.lp).toBe(0)
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
      ranked: {
        ...profile.ranked,
        tier: 'silver',
        division: 'I',
        lp: 88,
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
  })

  test('migrates a v5 profile to v6 and resets ranked state', () => {
    const v5 = {
      version: 5,
      gold: 420,
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
      stats: { played: 12, won: 8, streak: 2, bestStreak: 3 },
      achievements: [{ id: 'first_win', unlockedAt: '2026-02-22T00:00:00.000Z' }],
      rankRewardsClaimed: ['R1', 'R2'],
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v5))

    const migrated = loadProfile()

    expect(migrated.version).toBe(6)
    expect(migrated.gold).toBe(420)
    expect(migrated.stats).toEqual(v5.stats)
    expect(migrated.ranked).toEqual({
      tier: 'iron',
      division: 'IV',
      lp: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      matchesPlayed: 0,
      resultStreak: { type: 'none', count: 0 },
      demotionShieldLosses: 0,
    })

    const persisted = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '{}') as { version?: number }
    expect(persisted.version).toBe(6)
  })

  test('migrates a v2 profile to v6 and preserves deck/stat data', () => {
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

    expect(migrated.version).toBe(6)
    expect(migrated.gold).toBe(175)
    expect(migrated.ownedCardIds).toEqual(v2.ownedCardIds)
    expect(migrated.stats).toEqual(v2.stats)
    expect(migrated.selectedDeckSlotId).toBe('slot-1')
    expect(migrated.deckSlots[0].rules).toEqual({ same: true, plus: false })
    expect(migrated.cardCopiesById).toEqual(copiesFor(v2Owned))
    expect(migrated.packInventoryByRarity).toEqual(emptyPackInventory())
    expect(migrated.ranked.tier).toBe('iron')
  })

  test('migrates a v6 profile without playerName and keeps existing progression data', () => {
    const base = createDefaultProfile()
    const legacyV6 = Object.fromEntries(Object.entries(base).filter(([key]) => key !== 'playerName')) as Omit<
      typeof base,
      'playerName'
    >
    legacyV6.gold = 333
    legacyV6.stats.played = 4
    legacyV6.stats.won = 3

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(legacyV6))

    const migrated = loadProfile()

    expect(migrated.version).toBe(6)
    expect(migrated.playerName).toBe('Joueur')
    expect(migrated.gold).toBe(333)
    expect(migrated.stats.played).toBe(4)
    expect(migrated.stats.won).toBe(3)
  })

  test('falls back to default profile on corrupt JSON', () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, '{broken json')

    const profile = loadProfile()

    expect(profile).toEqual(createDefaultProfile())
  })
})
