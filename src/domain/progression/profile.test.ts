import { beforeEach, describe, expect, test } from 'bun:test'
import { starterDeck, starterOwnedCardIds } from '../cards/decks'
import { cardPool } from '../cards/cardPool'
import {
  createDefaultProfile,
  createResetProfile,
  createStoredProfile,
  deleteStoredProfile,
  listStoredProfiles,
  loadProfile,
  PROFILE_STORAGE_KEY,
  saveProfile,
  switchStoredProfile,
} from './profile'

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

function fillToEight(seedCards: string[], ownedCardIds: string[]): string[] {
  const next: string[] = []
  for (const cardId of [...seedCards, ...ownedCardIds]) {
    if (!next.includes(cardId)) {
      next.push(cardId)
    }
    if (next.length >= 8) {
      break
    }
  }
  return next
}

describe('profile persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('creates a default profile on first launch', () => {
    const profile = loadProfile()

    expect(profile.version).toBe(12)
    expect(profile.playerName).toBe('Joueur')
    expect(profile.gold).toBe(100)
    expect(profile.ownedCardIds).toEqual(starterOwnedCardIds)
    expect(profile.cardCopiesById).toEqual(copiesFor(starterOwnedCardIds))
    expect(profile.shinyCardCopiesById).toEqual({})
    expect(profile.packInventoryByRarity).toEqual(emptyPackInventory())
    expect(profile.selectedDeckSlotId).toBe('slot-1')
    expect(profile.deckSlots).toEqual([
      {
        id: 'slot-1',
        name: 'Deck 1',
        mode: '4x4',
        cards: starterDeck,
        cards4x4: fillToEight(starterDeck, starterOwnedCardIds),
        rules: { same: false, plus: false },
      },
      {
        id: 'slot-2',
        name: 'Deck 2',
        mode: '4x4',
        cards: [],
        cards4x4: fillToEight([], starterOwnedCardIds),
        rules: { same: false, plus: false },
      },
      {
        id: 'slot-3',
        name: 'Deck 3',
        mode: '4x4',
        cards: [],
        cards4x4: fillToEight([], starterOwnedCardIds),
        rules: { same: false, plus: false },
      },
    ])
    expect(Object.keys(profile.missions)).toEqual([
      'm1_type_specialist',
      'm2_combo_practitioner',
      'm3_corner_tactician',
    ])
    expect(profile.achievementProgress).toEqual({
      matchesPlayed: 0,
      matchesWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      cardsAcquired: 0,
      goldEarned: 0,
      packsPurchased: 0,
      packsOpened: 0,
      specialPacksOpened: 0,
      missionsCompleted: 0,
      baseTutorialsCompleted: 0,
      elementTutorialsCompleted: 0,
      rankedMatchesPlayed: 0,
      rankedWins: 0,
      deckEdits: 0,
      shinyPulled: 0,
      shinyCrafted: 0,
    })
    expect(profile.missionRewardsGrantedById).toEqual({})
    expect(profile.achievementRewardsClaimedById).toEqual({})
    expect(profile.rankedByMode['4x4']).toEqual({
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
    expect(profile.rankedByMode['3x3']).toEqual(profile.rankedByMode['4x4'])
    expect(profile.settings.audioEnabled).toBe(true)
    expect(profile.specialPackPity).toEqual({ legendaryFocusChancePercent: 1 })
  })

  test('createResetProfile gives 6 common, 2 uncommon, 1 rare, 1 epic starter cards', () => {
    const profile = createResetProfile()

    expect(profile.ownedCardIds).toHaveLength(10)
    expect(new Set(profile.ownedCardIds).size).toBe(10)
    expect(Object.keys(profile.cardCopiesById)).toHaveLength(10)
    expect(Object.values(profile.cardCopiesById)).toEqual(Array(10).fill(1))
    expect(profile.shinyCardCopiesById).toEqual({})

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
    expect(profile.deckSlots[0].cards4x4).toHaveLength(8)
    expect(profile.deckSlots[0].cards.every((cardId) => profile.ownedCardIds.includes(cardId))).toBe(true)
    expect(profile.deckSlots[0].cards4x4.every((cardId) => profile.ownedCardIds.includes(cardId))).toBe(true)
    expect(profile.rankedByMode['4x4'].tier).toBe('iron')
    expect(profile.rankedByMode['4x4'].lp).toBe(0)
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
      rankedByMode: {
        ...profile.rankedByMode,
        '4x4': {
          ...profile.rankedByMode['4x4'],
          tier: 'silver',
          division: 'I',
          lp: 88,
        },
      },
      selectedDeckSlotId: 'slot-2' as const,
      deckSlots: [
        {
          id: 'slot-1' as const,
          name: 'Deck 1',
          mode: '4x4' as const,
          cards: starterDeck,
          cards4x4: fillToEight(starterDeck, starterOwnedCardIds),
          rules: { same: false, plus: false },
        },
        {
          id: 'slot-2' as const,
          name: 'Ranked',
          mode: '4x4' as const,
          cards: slotTwoCards,
          cards4x4: fillToEight(slotTwoCards, starterOwnedCardIds),
          rules: { same: true, plus: false },
        },
        {
          id: 'slot-3' as const,
          name: 'Alt',
          mode: '4x4' as const,
          cards: [],
          cards4x4: fillToEight([], starterOwnedCardIds),
          rules: { same: false, plus: true },
        },
      ],
    }

    saveProfile(updated)

    expect(loadProfile()).toEqual(updated)
  })

  test('does not retroactively unlock achievements on load when post-reset counters are empty', () => {
    const profile = createDefaultProfile()
    profile.gold = 220
    profile.stats.played = 10
    profile.stats.won = 5
    profile.stats.streak = 3
    profile.stats.bestStreak = 3
    profile.missions.m2_combo_practitioner.progress = 6
    profile.missions.m2_combo_practitioner.completed = true
    profile.missions.m2_combo_practitioner.claimed = true
    profile.ownedCardIds = cardPool.slice(0, 30).map((card) => card.id)
    profile.cardCopiesById = copiesFor(profile.ownedCardIds)
    profile.achievements = []

    saveProfile(profile)
    const loaded = loadProfile()

    const unlockedIds = loaded.achievements.map((entry) => entry.id)
    expect(unlockedIds).toEqual([])
    expect(loaded.achievementProgress).toEqual({
      matchesPlayed: 0,
      matchesWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      cardsAcquired: 0,
      goldEarned: 0,
      packsPurchased: 0,
      packsOpened: 0,
      specialPacksOpened: 0,
      missionsCompleted: 0,
      baseTutorialsCompleted: 0,
      elementTutorialsCompleted: 0,
      rankedMatchesPlayed: 0,
      rankedWins: 0,
      deckEdits: 0,
      shinyPulled: 0,
      shinyCrafted: 0,
    })
  })

  test('migrates a v5 profile to v12, initializes missions, and resets ranked state', () => {
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
      achievements: [{ id: 'match_1', unlockedAt: '2026-02-22T00:00:00.000Z' }],
      rankRewardsClaimed: ['R1', 'R2'],
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v5))

    const migrated = loadProfile()

    expect(migrated.version).toBe(12)
    expect(migrated.gold).toBe(420)
    expect(migrated.stats).toEqual(v5.stats)
    expect(migrated.deckSlots[0].cards4x4).toEqual(fillToEight(v5.deckSlots[0].cards, starterOwnedCardIds))
    expect(migrated.deckSlots[1].cards4x4).toEqual(fillToEight(v5.deckSlots[1].cards, starterOwnedCardIds))
    expect(migrated.deckSlots[2].cards4x4).toEqual(fillToEight(v5.deckSlots[2].cards, starterOwnedCardIds))
    expect(migrated.deckSlots[0].mode).toBe('4x4')
    expect(migrated.deckSlots[1].mode).toBe('4x4')
    expect(migrated.deckSlots[2].mode).toBe('4x4')
    expect(Object.keys(migrated.missions)).toHaveLength(3)
    expect(migrated.rankedByMode['4x4']).toEqual({
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
    expect(migrated.rankedByMode['3x3']).toEqual(migrated.rankedByMode['4x4'])

    const persisted = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '{}') as { version?: number }
    expect(persisted.version).toBe(12)
    expect(migrated.settings.audioEnabled).toBe(true)
    expect(migrated.shinyCardCopiesById).toEqual({})
    expect(migrated.achievementProgress).toEqual({
      matchesPlayed: 0,
      matchesWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      cardsAcquired: 0,
      goldEarned: 0,
      packsPurchased: 0,
      packsOpened: 0,
      specialPacksOpened: 0,
      missionsCompleted: 0,
      baseTutorialsCompleted: 0,
      elementTutorialsCompleted: 0,
      rankedMatchesPlayed: 0,
      rankedWins: 0,
      deckEdits: 0,
      shinyPulled: 0,
      shinyCrafted: 0,
    })
    expect(migrated.missionRewardsGrantedById).toEqual({})
    expect(migrated.achievementRewardsClaimedById).toEqual({})
  })

  test('migrates a v2 profile to v12 and preserves deck/stat data', () => {
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
      achievements: [{ id: 'match_1', unlockedAt: '2026-02-22T00:00:00.000Z' }],
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v2))

    const migrated = loadProfile()

    expect(migrated.version).toBe(12)
    expect(migrated.gold).toBe(175)
    expect(migrated.ownedCardIds).toEqual(v2.ownedCardIds)
    expect(migrated.stats).toEqual(v2.stats)
    expect(migrated.selectedDeckSlotId).toBe('slot-1')
    expect(migrated.deckSlots[0].rules).toEqual({ same: true, plus: false })
    expect(migrated.deckSlots[0].cards4x4).toEqual(fillToEight(v2.deckSlots[0].cards, v2Owned))
    expect(migrated.deckSlots[0].mode).toBe('4x4')
    expect(migrated.cardCopiesById).toEqual(copiesFor(v2Owned))
    expect(migrated.shinyCardCopiesById).toEqual({})
    expect(migrated.packInventoryByRarity).toEqual(emptyPackInventory())
    expect(migrated.rankedByMode['4x4'].tier).toBe('iron')
  })

  test('migrates a v6 profile without playerName and keeps existing progression data', () => {
    const base = createDefaultProfile()
    const legacyV6 = {
      version: 6 as const,
      gold: 333,
      ownedCardIds: [...base.ownedCardIds],
      cardCopiesById: { ...base.cardCopiesById },
      packInventoryByRarity: { ...base.packInventoryByRarity },
      deckSlots: base.deckSlots.map((slot) => ({
        id: slot.id,
        name: slot.name,
        cards: [...slot.cards],
        rules: { ...slot.rules },
      })),
      selectedDeckSlotId: base.selectedDeckSlotId,
      stats: {
        ...base.stats,
        played: 4,
        won: 3,
      },
      achievements: [...base.achievements],
      ranked: { ...base.rankedByMode['4x4'] },
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(legacyV6))

    const migrated = loadProfile()

    expect(migrated.version).toBe(12)
    expect(migrated.playerName).toBe('Joueur')
    expect(migrated.gold).toBe(333)
    expect(migrated.stats.played).toBe(4)
    expect(migrated.stats.won).toBe(3)
  })

  test('migrates a legacy profile without cards4x4 by generating 8-card mode decks', () => {
    const base = createDefaultProfile()
    const legacy = {
      ...base,
      deckSlots: base.deckSlots.map((slot) => ({
        id: slot.id,
        name: slot.name,
        cards: [...slot.cards],
        rules: { ...slot.rules },
      })),
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(legacy))

    const migrated = loadProfile()
    expect(migrated.deckSlots[0].cards4x4).toEqual(fillToEight(migrated.deckSlots[0].cards, migrated.ownedCardIds))
    expect(migrated.deckSlots[1].cards4x4).toEqual(fillToEight(migrated.deckSlots[1].cards, migrated.ownedCardIds))
    expect(migrated.deckSlots[2].cards4x4).toEqual(fillToEight(migrated.deckSlots[2].cards, migrated.ownedCardIds))
    expect(migrated.deckSlots[0].mode).toBe('4x4')
    expect(migrated.deckSlots[1].mode).toBe('4x4')
    expect(migrated.deckSlots[2].mode).toBe('4x4')
  })

  test('hydrates missing legendary focus pity state on loaded legacy profile', () => {
    const base = createDefaultProfile()
    const legacyWithoutPity = { ...base }
    delete (legacyWithoutPity as { specialPackPity?: unknown }).specialPackPity
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(legacyWithoutPity))

    const loaded = loadProfile()
    expect(loaded.specialPackPity).toEqual({ legendaryFocusChancePercent: 1 })
  })

  test('normalizes invalid slot mode to 4x4 on load', () => {
    const base = createDefaultProfile()
    const corrupted = {
      ...base,
      deckSlots: base.deckSlots.map((slot, index) => ({
        ...slot,
        mode: index === 1 ? 'invalid-mode' : slot.mode,
      })),
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(corrupted))

    const migrated = loadProfile()
    expect(migrated.deckSlots[0].mode).toBe('4x4')
    expect(migrated.deckSlots[1].mode).toBe('4x4')
    expect(migrated.deckSlots[2].mode).toBe('4x4')
  })

  test('falls back to default profile on corrupt JSON', () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, '{broken json')

    const profile = loadProfile()

    expect(profile).toEqual(createDefaultProfile())
  })

  test('creates a second stored profile and can switch back to the original', () => {
    const original = loadProfile()
    original.playerName = 'Host'
    saveProfile(original)
    const originalId = listStoredProfiles().activeProfileId

    const created = createStoredProfile('Alice')
    expect(created.valid).toBe(true)
    expect(loadProfile().playerName).toBe('Alice')

    const profiles = listStoredProfiles()
    expect(profiles.profiles).toHaveLength(2)
    expect(profiles.profiles.find((profile) => profile.playerName === 'Alice')?.isActive).toBe(true)

    switchStoredProfile(originalId)
    expect(loadProfile().playerName).toBe('Host')
  })

  test('rejects stored profile creation when name is invalid', () => {
    loadProfile()

    const created = createStoredProfile('   ')

    expect(created.valid).toBe(false)
    expect(listStoredProfiles().profiles).toHaveLength(1)
  })

  test('prevents deleting the last remaining stored profile', () => {
    loadProfile()
    const onlyProfileId = listStoredProfiles().activeProfileId

    const deleted = deleteStoredProfile(onlyProfileId)

    expect(deleted.valid).toBe(false)
    expect(deleted.reason).toMatch(/at least one/i)
    expect(listStoredProfiles().profiles).toHaveLength(1)
  })

  test('deletes a non-active stored profile and keeps active one loaded', () => {
    const host = loadProfile()
    host.playerName = 'Host'
    saveProfile(host)
    const hostId = listStoredProfiles().activeProfileId

    expect(createStoredProfile('Bob').valid).toBe(true)
    switchStoredProfile(hostId)

    const bobId = listStoredProfiles().profiles.find((profile) => profile.playerName === 'Bob')?.id
    expect(bobId).toBeDefined()

    const deleted = deleteStoredProfile(bobId!)

    expect(deleted.valid).toBe(true)
    expect(listStoredProfiles().profiles.find((profile) => profile.id === bobId)).toBeUndefined()
    expect(loadProfile().playerName).toBe('Host')
  })

  test('default profile initializes independent ranked ladders for 3x3 and 4x4', () => {
    const profile = loadProfile()
    expect(profile.version).toBe(12)
    expect(profile.rankedByMode['3x3']).toEqual({
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
    expect(profile.rankedByMode['4x4']).toEqual(profile.rankedByMode['3x3'])
  })

  test('migrates v8 profile to v12 and forces audio on', () => {
    const v8Profile = {
      ...createDefaultProfile(),
      version: 8 as const,
      settings: { audioEnabled: false as const },
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v8Profile))
    const loaded = loadProfile()

    expect(loaded.version).toBe(12)
    expect(loaded.settings.audioEnabled).toBe(true)
    expect(loaded.shinyCardCopiesById).toEqual({})
  })

  test('migrates v9 profile to v12 by adding shiny inventory', () => {
    const v9Profile = {
      ...createDefaultProfile(),
      version: 9 as const,
    }
    delete (v9Profile as { shinyCardCopiesById?: unknown }).shinyCardCopiesById

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v9Profile))
    const loaded = loadProfile()

    expect(loaded.version).toBe(12)
    expect(loaded.shinyCardCopiesById).toEqual({})
  })

  test('migrates v10 profile to v12 with strict reset and preserved mission reward history', () => {
    const v10Profile = {
      ...createDefaultProfile(),
      version: 10 as const,
      achievements: [{ id: 'match_1' as const, unlockedAt: '2026-02-22T00:00:00.000Z' }],
      missions: {
        ...createDefaultProfile().missions,
        m1_type_specialist: {
          id: 'm1_type_specialist' as const,
          progress: 5,
          target: 5,
          completed: true,
          claimed: true,
        },
      },
      tutorialProgress: {
        baseCompleted: true,
        completedElementById: { feu: true },
      },
    }
    delete (v10Profile as { achievementProgress?: unknown }).achievementProgress
    delete (v10Profile as { missionRewardsGrantedById?: unknown }).missionRewardsGrantedById

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v10Profile))
    const loaded = loadProfile()

    expect(loaded.version).toBe(12)
    expect(loaded.achievements).toEqual([])
    expect(loaded.missions).toEqual(createDefaultProfile().missions)
    expect(loaded.tutorialProgress).toEqual({ baseCompleted: false, completedElementById: {} })
    expect(loaded.missionRewardsGrantedById).toEqual({ m1_type_specialist: true })
    expect(loaded.achievementProgress.matchesPlayed).toBe(0)
    expect(loaded.achievementProgress.shinyCrafted).toBe(0)
    expect(loaded.achievementRewardsClaimedById).toEqual({})
  })

  test('migrates v7 profile ranked into both v12 ladders', () => {
    const legacyV7 = {
      ...createDefaultProfile(),
      version: 7 as const,
      settings: { audioEnabled: false as const },
      ranked: {
        tier: 'gold' as const,
        division: 'II' as const,
        lp: 42,
        wins: 7,
        losses: 3,
        draws: 1,
        matchesPlayed: 11,
        resultStreak: { type: 'win' as const, count: 2 },
        demotionShieldLosses: 1,
      },
    }
    delete (legacyV7 as { rankedByMode?: unknown }).rankedByMode

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(legacyV7))
    const loaded = loadProfile()

    expect(loaded.version).toBe(12)
    expect(loaded.rankedByMode['3x3']).toEqual(legacyV7.ranked)
    expect(loaded.rankedByMode['4x4']).toEqual(legacyV7.ranked)
    expect(loaded.settings.audioEnabled).toBe(true)
  })

  test('migrates v11 profile to v12 and keeps unlocked achievements claimable', () => {
    const v11 = {
      ...createDefaultProfile(),
      version: 11 as const,
      achievements: [
        { id: 'match_1' as const, unlockedAt: '2026-03-02T00:00:00.000Z' },
        { id: 'win_1' as const, unlockedAt: '2026-03-02T00:00:01.000Z' },
      ],
    }
    delete (v11 as { achievementRewardsClaimedById?: unknown }).achievementRewardsClaimedById

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(v11))
    const loaded = loadProfile()

    expect(loaded.version).toBe(12)
    expect(loaded.achievements).toEqual(v11.achievements)
    expect(loaded.achievementRewardsClaimedById).toEqual({})
  })

  test('sanitizes invalid achievement reward claim ids on load', () => {
    const corrupted = createDefaultProfile()
    ;(corrupted as unknown as { achievementRewardsClaimedById: Record<string, unknown> }).achievementRewardsClaimedById = {
      match_1: true,
      invalid_achievement: true,
      win_1: 'yes',
    }
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(corrupted))

    const loaded = loadProfile()

    expect(loaded.achievementRewardsClaimedById).toEqual({ match_1: true })
  })

  test('converts legacy emerald tier to diamond on load without resetting progression', () => {
    const legacy = createDefaultProfile()
    legacy.rankedByMode['3x3'] = {
      ...legacy.rankedByMode['3x3'],
      tier: 'diamond',
      division: 'II',
      lp: 33,
      wins: 10,
      losses: 4,
      draws: 1,
      matchesPlayed: 15,
      resultStreak: { type: 'win', count: 2 },
      demotionShieldLosses: 1,
    }
    legacy.rankedByMode['4x4'] = {
      ...legacy.rankedByMode['4x4'],
      tier: 'diamond',
      division: 'I',
      lp: 12,
      wins: 8,
      losses: 6,
      draws: 0,
      matchesPlayed: 14,
      resultStreak: { type: 'loss', count: 1 },
      demotionShieldLosses: 0,
    }

    const rawLegacy = JSON.parse(JSON.stringify(legacy)) as Record<string, unknown>
    ;((rawLegacy.rankedByMode as Record<string, unknown>)['3x3'] as Record<string, unknown>).tier = 'emerald'
    ;((rawLegacy.rankedByMode as Record<string, unknown>)['4x4'] as Record<string, unknown>).tier = 'emerald'

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(rawLegacy))
    const loaded = loadProfile()

    expect(loaded.rankedByMode['3x3'].tier).toBe('diamond')
    expect(loaded.rankedByMode['3x3'].division).toBe('II')
    expect(loaded.rankedByMode['3x3'].lp).toBe(33)
    expect(loaded.rankedByMode['4x4'].tier).toBe('diamond')
    expect(loaded.rankedByMode['4x4'].division).toBe('I')
    expect(loaded.rankedByMode['4x4'].lp).toBe(12)
  })

  test('converts legacy master and grandmaster tiers to challenger on load', () => {
    const legacy = createDefaultProfile()
    const rawLegacy = JSON.parse(JSON.stringify(legacy)) as Record<string, unknown>
    ;((rawLegacy.rankedByMode as Record<string, unknown>)['3x3'] as Record<string, unknown>).tier = 'master'
    ;((rawLegacy.rankedByMode as Record<string, unknown>)['3x3'] as Record<string, unknown>).division = null
    ;((rawLegacy.rankedByMode as Record<string, unknown>)['4x4'] as Record<string, unknown>).tier = 'grandmaster'
    ;((rawLegacy.rankedByMode as Record<string, unknown>)['4x4'] as Record<string, unknown>).division = null

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(rawLegacy))
    const loaded = loadProfile()

    expect(loaded.rankedByMode['3x3'].tier).toBe('challenger')
    expect(loaded.rankedByMode['3x3'].division).toBe(null)
    expect(loaded.rankedByMode['4x4'].tier).toBe('challenger')
    expect(loaded.rankedByMode['4x4'].division).toBe(null)
  })
})
