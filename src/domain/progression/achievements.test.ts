import { describe, expect, test } from 'bun:test'
import { createDefaultProfile } from './profile'
import { achievementCatalog, evaluateAchievements, isAchievementId } from './achievements'

describe('achievement progression', () => {
  test('catalog contains exactly forty unique achievements', () => {
    expect(achievementCatalog).toHaveLength(40)

    const ids = achievementCatalog.map((achievement) => achievement.id)
    expect(new Set(ids).size).toBe(40)
    expect(ids.every((id) => isAchievementId(id))).toBe(true)
  })

  test('evaluates unlocks from profile snapshot thresholds', () => {
    const profile = createDefaultProfile()
    profile.achievementProgress = {
      matchesPlayed: 60,
      matchesWon: 50,
      currentStreak: 8,
      bestStreak: 8,
      cardsAcquired: 200,
      goldEarned: 2000,
      packsPurchased: 20,
      packsOpened: 20,
      specialPacksOpened: 10,
      missionsCompleted: 3,
      baseTutorialsCompleted: 1,
      elementTutorialsCompleted: 15,
      rankedMatchesPlayed: 10,
      rankedWins: 20,
      deckEdits: 40,
      shinyPulled: 1,
      shinyCrafted: 5,
    }

    const unlocked = evaluateAchievements(profile)

    expect(unlocked).toHaveLength(40)
    expect(unlocked.some((entry) => entry.id === 'tutorial_elements_15')).toBe(true)
    expect(unlocked.some((entry) => entry.id === 'gold_1000')).toBe(true)
    expect(unlocked.some((entry) => entry.id === 'shiny_craft_5')).toBe(true)
  })

  test('does not return already unlocked achievements', () => {
    const profile = createDefaultProfile()
    profile.achievementProgress.matchesPlayed = 12
    profile.achievementProgress.matchesWon = 10
    profile.achievements = [
      { id: 'match_1', unlockedAt: '2026-02-22T00:00:00.000Z' },
      { id: 'win_1', unlockedAt: '2026-02-22T00:00:00.000Z' },
    ]

    const unlocked = evaluateAchievements(profile)
    const unlockedIds = unlocked.map((entry) => entry.id)

    expect(unlockedIds).not.toContain('match_1')
    expect(unlockedIds).not.toContain('win_1')
    expect(unlockedIds).toContain('match_10')
    expect(unlockedIds).toContain('win_10')
  })

  test('unlocks tutorials and missions achievements from dedicated counters', () => {
    const profile = createDefaultProfile()
    profile.achievementProgress.baseTutorialsCompleted = 1
    profile.achievementProgress.elementTutorialsCompleted = 5
    profile.achievementProgress.missionsCompleted = 2

    const unlocked = evaluateAchievements(profile)

    expect(unlocked.some((entry) => entry.id === 'tutorial_base_1')).toBe(true)
    expect(unlocked.some((entry) => entry.id === 'tutorial_elements_5')).toBe(true)
    expect(unlocked.some((entry) => entry.id === 'missions_2')).toBe(true)
  })

  test('uses cards acquired threshold for final collection achievement', async () => {
    const finalCollection = achievementCatalog.find((achievement) => achievement.id === 'cards_200')

    expect(finalCollection).toBeTruthy()
    expect(finalCollection?.condition).toBe('Acquérir 200 copies de cartes')
    expect(finalCollection?.check({ achievementProgress: { cardsAcquired: 199 } } as never)).toBe(false)
    expect(finalCollection?.check({ achievementProgress: { cardsAcquired: 200 } } as never)).toBe(true)
  })
})
