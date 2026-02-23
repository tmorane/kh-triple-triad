import { describe, expect, test } from 'vitest'
import { getCardArtCandidates } from './cardArt'

describe('getCardArtCandidates', () => {
  test('starts with the exact card name to match Splashart filenames', () => {
    const candidates = getCardArtCandidates('Ombre')

    expect(candidates[0]).toBe('/splashart/Ombre.webp')
  })

  test('includes known alias for Minute Bombe splashart filename', () => {
    const candidates = getCardArtCandidates('Minute Bombe')

    expect(candidates).toContain('/splashart/Bombe%20Minute.png')
  })

  test('includes known alias for Surveillant splashart filename', () => {
    const candidates = getCardArtCandidates('Surveillant')

    expect(candidates).toContain('/splashart/Robot%20de%20Surveillance.png')
  })
})
