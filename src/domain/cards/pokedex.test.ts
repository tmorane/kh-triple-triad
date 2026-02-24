import { describe, expect, test } from 'vitest'
import { formatCardPokedexNumber, getCardPokedexNumber } from './pokedex'

describe('pokedex helpers', () => {
  test('maps pokemon names to their real pokedex numbers', () => {
    expect(getCardPokedexNumber({ id: 'c11', name: 'Abo' })).toBe(23)
    expect(getCardPokedexNumber({ id: 'c52', name: 'Herbizarre' })).toBe(2)
    expect(getCardPokedexNumber({ id: 'c115', name: 'M. Mime' })).toBe(122)
    expect(getCardPokedexNumber({ id: 'c14', name: 'Nidoran♀' })).toBe(29)
  })

  test('formats pokedex numbers with leading zeroes', () => {
    expect(formatCardPokedexNumber({ id: 'c11', name: 'Abo' })).toBe('#023')
    expect(formatCardPokedexNumber({ id: 'c150', name: 'Mewtwo' })).toBe('#150')
  })

  test('falls back to card id number when card name is not in pokedex mapping', () => {
    expect(getCardPokedexNumber({ id: 'c106', name: 'Ombre' })).toBe(106)
    expect(formatCardPokedexNumber({ id: 'c106', name: 'Ombre' })).toBe('#106')
  })
})
