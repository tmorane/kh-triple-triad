import { describe, expect, test } from 'vitest'
import { resolveStartingTurn } from './startingTurn'

describe('resolveStartingTurn', () => {
  test('is deterministic for the same seed', () => {
    expect(resolveStartingTurn(2026)).toBe(resolveStartingTurn(2026))
  })

  test('produces both player and cpu outcomes across different seeds', () => {
    const outcomes = new Set(Array.from({ length: 32 }, (_, seed) => resolveStartingTurn(seed)))

    expect(outcomes).toEqual(new Set(['player', 'cpu']))
  })
})
