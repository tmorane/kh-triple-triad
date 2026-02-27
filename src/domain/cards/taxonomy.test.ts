import { describe, expect, test } from 'vitest'
import {
  cardCategoryIds,
  cardElementIds,
  cardTypeByCategoryId,
  cardTypeIds,
  getElementLabel,
  getTypeIdByCategory,
  getTypeLabel,
} from './taxonomy'

describe('taxonomy', () => {
  test('exposes only the 4 canonical category ids', () => {
    expect(cardCategoryIds).toEqual(['sans_coeur', 'simili', 'nescient', 'humain'])
  })

  test('exposes only the 4 canonical type ids', () => {
    expect(cardTypeIds).toEqual(['sans_coeur', 'simili', 'nescient', 'humain'])
  })

  test('exposes pokemon element ids present in the source spreadsheet', () => {
    expect(cardElementIds).toEqual([
      'normal',
      'feu',
      'eau',
      'plante',
      'electrik',
      'glace',
      'combat',
      'poison',
      'sol',
      'vol',
      'psy',
      'insecte',
      'roche',
      'spectre',
      'dragon',
    ])
  })

  test('maps category to the same type id', () => {
    for (const categoryId of cardCategoryIds) {
      expect(cardTypeByCategoryId[categoryId]).toBe(categoryId)
      expect(getTypeIdByCategory(categoryId)).toBe(categoryId)
    }
  })

  test('exposes readable labels for each type', () => {
    expect(getTypeLabel('sans_coeur')).toBe('Obscur')
    expect(getTypeLabel('simili')).toBe('Psy')
    expect(getTypeLabel('nescient')).toBe('Combat')
    expect(getTypeLabel('humain')).toBe('Nature')
  })

  test('exposes readable labels for pokemon elements', () => {
    expect(getElementLabel('normal')).toBe('Normal')
    expect(getElementLabel('electrik')).toBe('Electrik')
    expect(getElementLabel('vol')).toBe('Vol')
    expect(getElementLabel('dragon')).toBe('Dragon')
  })
})
