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

const humainCard: CardDef = {
  id: 'c999',
  name: 'Dresseur',
  top: 7,
  right: 8,
  bottom: 7,
  left: 8,
  rarity: 'legendary',
  categoryId: 'humain',
  elementId: 'tenebres',
}

const longNameCard: CardDef = {
  id: 'c110',
  name: 'Hypnomade',
  top: 4,
  right: 5,
  bottom: 5,
  left: 5,
  rarity: 'rare',
  categoryId: 'simili',
  elementId: 'illusion',
}

const aboCard: CardDef = {
  id: 'c11',
  name: 'Abo',
  top: 2,
  right: 1,
  bottom: 2,
  left: 3,
  rarity: 'common',
  categoryId: 'sans_coeur',
  elementId: 'poison',
}

describe('TriadCard splashart', () => {
  test('renders splashart image for an owned card', () => {
    const { container } = render(<TriadCard card={ombreCard} context="collection-list" owned />)

    const image = container.querySelector<HTMLImageElement>('.triad-card__art-image')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toContain('/splashart/Ombre.png')
  })

  test('renders type logo badge for owned card', () => {
    const { container } = render(<TriadCard card={ombreCard} context="collection-list" owned />)

    const badge = container.querySelector('.triad-card__type-badge')
    const logo = container.querySelector<HTMLImageElement>('.triad-card__type-logo')

    expect(badge).not.toBeNull()
    expect(badge).toHaveClass('triad-card__type-badge--sans_coeur')
    expect(logo).not.toBeNull()
    expect(logo?.getAttribute('src')).toBe('/logos-types/obscur.png')
  })

  test('hides type logo badge for locked card', () => {
    const { container } = render(<TriadCard card={ombreCard} context="collection-list" owned={false} />)

    expect(container.querySelector('.triad-card__type-badge')).toBeNull()
    expect(container.querySelector('.triad-card__type-logo')).toBeNull()
  })

  test('maps humain card type to humain logo', () => {
    const { container } = render(<TriadCard card={humainCard} context="collection-list" owned />)

    const badge = container.querySelector('.triad-card__type-badge')
    const logo = container.querySelector<HTMLImageElement>('.triad-card__type-logo')

    expect(badge).not.toBeNull()
    expect(badge).toHaveClass('triad-card__type-badge--humain')
    expect(logo?.getAttribute('src')).toBe('/logos-types/nature.png')
  })

  test('applies NEW collision classes per variant', () => {
    const { container, rerender } = render(
      <TriadCard card={ombreCard} context="collection-list" owned showNew newBadgeVariant="default" />,
    )
    const cardRoot = container.querySelector('.triad-card')

    expect(cardRoot).not.toBeNull()
    expect(cardRoot).toHaveClass('has-new-pill')
    expect(cardRoot).toHaveClass('has-new-pill--default')

    rerender(<TriadCard card={ombreCard} context="collection-list" owned showNew newBadgeVariant="reveal" />)
    expect(cardRoot).toHaveClass('has-new-pill')
    expect(cardRoot).toHaveClass('has-new-pill--reveal')
    expect(cardRoot).not.toHaveClass('has-new-pill--default')

    rerender(<TriadCard card={ombreCard} context="collection-list" owned showNew newBadgeVariant="claim" />)
    expect(cardRoot).toHaveClass('has-new-pill')
    expect(cardRoot).toHaveClass('has-new-pill--claim')
    expect(cardRoot).not.toHaveClass('has-new-pill--reveal')
  })

  test('uses compact name class for long setup card names', () => {
    const { container } = render(<TriadCard card={longNameCard} context="setup" owned />)

    const name = container.querySelector('.triad-card__name')
    expect(name).not.toBeNull()
    expect(name).toHaveClass('triad-card__name--compact')
    expect(name).toHaveTextContent('Hypnomade')
  })

  test('renders real pokedex number instead of internal card id', () => {
    const { container } = render(<TriadCard card={aboCard} context="collection-list" owned />)

    const id = container.querySelector('.triad-card__id')
    expect(id).not.toBeNull()
    expect(id).toHaveTextContent('#023')
  })
})
