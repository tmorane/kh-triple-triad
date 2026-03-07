import { describe, expect, test } from 'bun:test'
import { createDefaultProfile } from './profile'
import { achievementCatalog } from './achievements'
import { BASE_SHINY_CRAFT_COST, craftShinyCard, getShinyCraftCost } from './shiny'

describe('shiny crafting', () => {
  test('getShinyCraftCost returns 50 by default', () => {
    const profile = createDefaultProfile()
    expect(getShinyCraftCost(profile)).toBe(BASE_SHINY_CRAFT_COST)
  })

  test('getShinyCraftCost returns 25 when all achievements are unlocked', () => {
    const profile = createDefaultProfile()
    profile.achievements = achievementCatalog.map((achievement, index) => ({
      id: achievement.id,
      unlockedAt: `2026-03-02T00:00:${index.toString().padStart(2, '0')}.000Z`,
    }))

    expect(getShinyCraftCost(profile)).toBe(25)
  })

  test('craftShinyCard converts 50 normal copies into 1 shiny copy of the same card', () => {
    const profile = createDefaultProfile()
    profile.cardCopiesById.c01 = 50

    const crafted = craftShinyCard(profile, 'c01')

    expect(crafted.cardCopiesById.c01).toBeUndefined()
    expect(crafted.shinyCardCopiesById.c01).toBe(1)
    expect(crafted.ownedCardIds).toContain('c01')
  })

  test('craftShinyCard increments existing shiny stack', () => {
    const profile = createDefaultProfile()
    profile.cardCopiesById.c01 = 50
    profile.shinyCardCopiesById.c01 = 2

    const crafted = craftShinyCard(profile, 'c01')

    expect(crafted.shinyCardCopiesById.c01).toBe(3)
  })

  test('craftShinyCard rejects crafting when normal copies are below 50', () => {
    const profile = createDefaultProfile()
    profile.cardCopiesById.c01 = 49

    expect(() => craftShinyCard(profile, 'c01')).toThrow('You need at least 50 normal copies to craft a shiny card.')
  })

  test('craftShinyCard uses reduced cost when charm chroma is active', () => {
    const profile = createDefaultProfile()
    profile.achievements = achievementCatalog.map((achievement, index) => ({
      id: achievement.id,
      unlockedAt: `2026-03-02T00:01:${index.toString().padStart(2, '0')}.000Z`,
    }))
    profile.cardCopiesById.c01 = 25

    const crafted = craftShinyCard(profile, 'c01')

    expect(crafted.cardCopiesById.c01).toBeUndefined()
    expect(crafted.shinyCardCopiesById.c01).toBe(1)
  })

  test('craftShinyCard error reflects reduced cost when charm chroma is active', () => {
    const profile = createDefaultProfile()
    profile.achievements = achievementCatalog.map((achievement, index) => ({
      id: achievement.id,
      unlockedAt: `2026-03-02T00:02:${index.toString().padStart(2, '0')}.000Z`,
    }))
    profile.cardCopiesById.c01 = 24

    expect(() => craftShinyCard(profile, 'c01')).toThrow('You need at least 25 normal copies to craft a shiny card.')
  })
})
