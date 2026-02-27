import { describe, expect, test } from 'vitest'
import { createDefaultProfile } from './profile'
import { craftShinyCard } from './shiny'

describe('shiny crafting', () => {
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
})
