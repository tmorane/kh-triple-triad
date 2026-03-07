import { describe, expect, test } from 'bun:test'
import { createDefaultProfile } from './profile'
import { CARD_FRAGMENT_COST_BY_RARITY, craftCardFromFragments, getCardFragmentCost } from './fragments'

describe('card fragments', () => {
  test('exposes expected crafting costs by rarity', () => {
    expect(CARD_FRAGMENT_COST_BY_RARITY).toEqual({
      common: 3,
      uncommon: 6,
      rare: 10,
      epic: 25,
      legendary: 100,
    })

    expect(getCardFragmentCost('c01')).toBe(3)
    expect(getCardFragmentCost('c52')).toBe(6)
    expect(getCardFragmentCost('c92')).toBe(10)
    expect(getCardFragmentCost('c122')).toBe(25)
    expect(getCardFragmentCost('c142')).toBe(100)
  })

  test('craftCardFromFragments consumes threshold fragments and grants 1 normal copy', () => {
    const profile = createDefaultProfile()
    profile.cardFragmentsById.c92 = 10

    const crafted = craftCardFromFragments(profile, 'c92')

    expect(crafted.cardFragmentsById.c92).toBeUndefined()
    expect(crafted.cardCopiesById.c92).toBe(1)
    expect(crafted.ownedCardIds).toContain('c92')
  })

  test('craftCardFromFragments keeps fragment overflow and works for already-owned cards', () => {
    const profile = createDefaultProfile()
    profile.cardFragmentsById.c01 = 4
    const existingCopies = profile.cardCopiesById.c01

    const crafted = craftCardFromFragments(profile, 'c01')

    expect(crafted.cardFragmentsById.c01).toBe(1)
    expect(crafted.cardCopiesById.c01).toBe(existingCopies + 1)
  })

  test('craftCardFromFragments rejects crafting below threshold', () => {
    const profile = createDefaultProfile()
    profile.cardFragmentsById.c92 = 9

    expect(() => craftCardFromFragments(profile, 'c92')).toThrow('Not enough card fragments to craft this card.')
  })
})
