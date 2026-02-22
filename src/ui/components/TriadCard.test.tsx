import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { CardDef } from '../../domain/types'
import { TriadCard } from './TriadCard'

const ombreCard: CardDef = {
  id: 'c106',
  name: 'Ombre',
  top: 2,
  right: 2,
  bottom: 3,
  left: 2,
  rarity: 'common',
  categoryId: 'sans_coeur',
  elementId: 'tenebres',
}

describe('TriadCard splashart', () => {
  test('renders splashart image for an owned card', () => {
    const { container } = render(<TriadCard card={ombreCard} context="collection-list" owned />)

    const image = container.querySelector<HTMLImageElement>('.triad-card__art-image')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toContain('/splashart/Ombre.webp')
  })
})
