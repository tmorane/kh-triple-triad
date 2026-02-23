import { describe, expect, test } from 'vitest'
import { cardPool } from './cardPool'
import { resolveDeckTypeSynergy } from './typeSynergy'

function pickCardIdsByCategory(categoryId: 'sans_coeur' | 'simili' | 'nescient' | 'humain', count: number): string[] {
  const ids = cardPool.filter((card) => card.categoryId === categoryId).slice(0, count).map((card) => card.id)
  if (ids.length < count) {
    throw new Error(`Not enough cards in category ${categoryId}`)
  }
  return ids
}

describe('resolveDeckTypeSynergy', () => {
  test('resolves primary + secondary for 3+2 split', () => {
    const deck = [...pickCardIdsByCategory('sans_coeur', 3), ...pickCardIdsByCategory('simili', 2)]
    const result = resolveDeckTypeSynergy(deck)

    expect(result.primaryTypeId).toBe('sans_coeur')
    expect(result.secondaryTypeId).toBe('simili')
  })

  test('does not resolve secondary for 4+1 split', () => {
    const deck = [...pickCardIdsByCategory('sans_coeur', 4), ...pickCardIdsByCategory('simili', 1)]
    const result = resolveDeckTypeSynergy(deck)

    expect(result.primaryTypeId).toBe('sans_coeur')
    expect(result.secondaryTypeId).toBeNull()
  })

  test('does not resolve secondary for 5+0 split', () => {
    const result = resolveDeckTypeSynergy(pickCardIdsByCategory('sans_coeur', 5))

    expect(result.primaryTypeId).toBe('sans_coeur')
    expect(result.secondaryTypeId).toBeNull()
  })

  test('returns no synergies when no type reaches 3+', () => {
    const deck = [
      ...pickCardIdsByCategory('sans_coeur', 2),
      ...pickCardIdsByCategory('simili', 2),
      ...pickCardIdsByCategory('nescient', 1),
    ]
    const result = resolveDeckTypeSynergy(deck)

    expect(result.primaryTypeId).toBeNull()
    expect(result.secondaryTypeId).toBeNull()
  })

  test('secondary only accepts sans_coeur/simili/nescient types', () => {
    const deck = [...pickCardIdsByCategory('sans_coeur', 3), ...pickCardIdsByCategory('humain', 2)]
    const result = resolveDeckTypeSynergy(deck)

    expect(result.primaryTypeId).toBe('sans_coeur')
    expect(result.secondaryTypeId).toBeNull()
  })

  test('countsByType exposes only the 4 canonical keys', () => {
    const result = resolveDeckTypeSynergy(pickCardIdsByCategory('humain', 5))

    expect(Object.keys(result.countsByType).sort()).toEqual(['humain', 'nescient', 'sans_coeur', 'simili'])
  })
})
