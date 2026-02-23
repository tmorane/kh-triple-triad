import { describe, expect, test, vi } from 'vitest'
import { cardPool } from '../cards/cardPool'
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
    profile.stats.played = 75
    profile.stats.won = 60
    profile.stats.bestStreak = 10
    profile.stats.streak = 10
    profile.gold = 1000
    profile.ownedCardIds = cardPool.map((card) => card.id)
    profile.deckSlots[2].rules = { same: true, plus: true }
    profile.cardCopiesById = Object.fromEntries(profile.ownedCardIds.map((cardId) => [cardId, 1]))

    const unlocked = evaluateAchievements(profile)

    expect(unlocked).toHaveLength(40)
    expect(unlocked.some((entry) => entry.id === 'rule_scholar')).toBe(true)
    expect(unlocked.some((entry) => entry.id === 'owned_150')).toBe(true)
    expect(unlocked.some((entry) => entry.id === 'gold_1000')).toBe(true)
    expect(unlocked.some((entry) => entry.id === 'wins_60')).toBe(true)
  })

  test('does not return already unlocked achievements', () => {
    const profile = createDefaultProfile()
    profile.stats.played = 5
    profile.stats.won = 3
    profile.achievements = [
      { id: 'play_1', unlockedAt: '2026-02-22T00:00:00.000Z' },
      { id: 'first_win', unlockedAt: '2026-02-22T00:00:00.000Z' },
    ]

    const unlocked = evaluateAchievements(profile)
    const unlockedIds = unlocked.map((entry) => entry.id)

    expect(unlockedIds).not.toContain('play_1')
    expect(unlockedIds).not.toContain('first_win')
    expect(unlockedIds).toContain('play_3')
    expect(unlockedIds).toContain('play_5')
    expect(unlockedIds).toContain('tactician_margin_3')
  })

  test('unlocks rule scholar when any deck slot has same and plus enabled', () => {
    const profile = createDefaultProfile()
    profile.deckSlots[1].rules = { same: true, plus: true }

    const unlocked = evaluateAchievements(profile)

    expect(unlocked.some((entry) => entry.id === 'rule_scholar')).toBe(true)
  })

  test('uses card pool size for final collection achievement', async () => {
    vi.resetModules()
    vi.doMock('../cards/cardPool', () => ({
      cardPool: Array.from({ length: 151 }, (_, index) => ({
        id: `c${String(index + 1).padStart(2, '0')}`,
      })),
    }))

    const { achievementCatalog: mockedCatalog } = await import('./achievements')
    const fullCollection = mockedCatalog.find((achievement) => achievement.id === 'owned_150')

    expect(fullCollection).toBeTruthy()
    expect(fullCollection?.condition).toBe('Own all 151 cards')
    expect(fullCollection?.check({ ownedCardIds: Array.from({ length: 150 }, (_, index) => `c${index + 1}`) } as never)).toBe(
      false,
    )
    expect(fullCollection?.check({ ownedCardIds: Array.from({ length: 151 }, (_, index) => `c${index + 1}`) } as never)).toBe(
      true,
    )

    vi.doUnmock('../cards/cardPool')
    vi.resetModules()
  })
})
