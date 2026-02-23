import { describe, expect, test } from 'vitest'
import { resolveDeckTypeSynergy } from './typeSynergy'

describe('resolveDeckTypeSynergy', () => {
  test('resolves primary + secondary for 3+2 split', () => {
    const result = resolveDeckTypeSynergy(['c21', 'c22', 'c23', 'c84', 'c85'])

    expect(result.primaryTypeId).toBe('sans_coeur')
    expect(result.secondaryTypeId).toBe('simili')
  })

  test('does not resolve secondary for 4+1 split', () => {
    const result = resolveDeckTypeSynergy(['c21', 'c22', 'c23', 'c24', 'c84'])

    expect(result.primaryTypeId).toBe('sans_coeur')
    expect(result.secondaryTypeId).toBeNull()
  })

  test('does not resolve secondary for 5+0 split', () => {
    const result = resolveDeckTypeSynergy(['c21', 'c22', 'c23', 'c24', 'c25'])

    expect(result.primaryTypeId).toBe('sans_coeur')
    expect(result.secondaryTypeId).toBeNull()
  })

  test('returns no synergies when no type reaches 3+', () => {
    const result = resolveDeckTypeSynergy(['c21', 'c22', 'c84', 'c85', 'c13'])

    expect(result.primaryTypeId).toBeNull()
    expect(result.secondaryTypeId).toBeNull()
  })

  test('secondary only accepts sans_coeur/simili/nescient types', () => {
    const result = resolveDeckTypeSynergy(['c21', 'c22', 'c23', 'c01', 'c02'])

    expect(result.primaryTypeId).toBe('sans_coeur')
    expect(result.secondaryTypeId).toBeNull()
  })
})
