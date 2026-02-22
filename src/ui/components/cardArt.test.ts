import { describe, expect, test } from 'vitest'
import { getCardArtCandidates } from './cardArt'

describe('getCardArtCandidates', () => {
  test('starts with the exact card name to match Splashart filenames', () => {
    const candidates = getCardArtCandidates('Ombre')

    expect(candidates[0]).toBe('/splashart/Ombre.webp')
  })
})
