import { describe, expect, test } from 'bun:test'
import { ELEMENT_EFFECT_ORDERED_IDS, getElementEffectText } from './elementEffectsCatalog'

describe('elementEffectsCatalog', () => {
  test('returns non-empty visual copy for every gameplay element', () => {
    for (const elementId of ELEMENT_EFFECT_ORDERED_IDS) {
      const text = getElementEffectText(elementId)
      expect(text.trim().length).toBeGreaterThan(0)
    }
  })

  test('uses a visual marker prefix and keeps copy length compact', () => {
    for (const elementId of ELEMENT_EFFECT_ORDERED_IDS) {
      const text = getElementEffectText(elementId)
      const firstToken = text.trim().split(' ')[0] ?? ''
      expect(firstToken).not.toMatch(/^[A-Za-z0-9]/)
      expect(text.length).toBeLessThanOrEqual(95)
    }
  })

  test('supports plain variant without visual marker for accessibility labels', () => {
    for (const elementId of ELEMENT_EFFECT_ORDERED_IDS) {
      const text = getElementEffectText(elementId, 'plain')
      const firstToken = text.trim().split(' ')[0] ?? ''
      expect(text.trim().length).toBeGreaterThan(0)
      expect(firstToken).not.toMatch(/[\p{Extended_Pictographic}]/u)
    }
  })
})
