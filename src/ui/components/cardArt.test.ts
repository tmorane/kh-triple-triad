import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { getCardArtCandidates } from './cardArt'

describe('getCardArtCandidates', () => {
  test('starts with the exact card name and PNG first to avoid fallback image requests', () => {
    const candidates = getCardArtCandidates('Ombre')

    expect(candidates[0]).toBe('/splashart/Ombre.png')
  })

  test('includes known alias for Minute Bombe splashart filename', () => {
    const candidates = getCardArtCandidates('Minute Bombe')

    expect(candidates).toContain('/splashart/Bombe%20Minute.png')
  })

  test('includes known alias for Surveillant splashart filename', () => {
    const candidates = getCardArtCandidates('Surveillant')

    expect(candidates).toContain('/splashart/Robot%20de%20Surveillance.png')
  })

  test('keeps candidate list compact to avoid excessive failed image requests', () => {
    const candidates = getCardArtCandidates('Larve Rampante')

    expect(candidates.length).toBeLessThanOrEqual(8)
    expect(candidates).not.toContain('/splashart/larve-rampante.webp')
    expect(candidates).not.toContain('/splashart/larve_rampante.webp')
  })

  test('has Larve Rampante splashart file in public assets', () => {
    const absolutePath = resolve(process.cwd(), 'public/splashart/Larve Rampante.webp')

    expect(existsSync(absolutePath)).toBe(true)
  })
})
