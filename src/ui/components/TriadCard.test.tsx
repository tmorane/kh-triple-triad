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

const xemnasCard: CardDef = {
  id: 'c999',
  name: 'Xemnas',
  top: 7,
  right: 8,
  bottom: 7,
  left: 8,
  rarity: 'legendary',
  categoryId: 'boss_kh',
  elementId: 'tenebres',
}

describe('TriadCard splashart', () => {
  test('renders splashart image for an owned card', () => {
    const { container } = render(<TriadCard card={ombreCard} context="collection-list" owned />)

    const image = container.querySelector<HTMLImageElement>('.triad-card__art-image')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toContain('/splashart/Ombre.webp')
  })

  test('renders type logo badge for owned card', () => {
    const { container } = render(<TriadCard card={ombreCard} context="collection-list" owned />)

    const badge = container.querySelector('.triad-card__type-badge')
    const logo = container.querySelector<HTMLImageElement>('.triad-card__type-logo')

    expect(badge).not.toBeNull()
    expect(badge).toHaveClass('triad-card__type-badge--sans_coeur')
    expect(logo).not.toBeNull()
    expect(logo?.getAttribute('src')).toBe('/logos-types/sans-coeur.webp')
  })

  test('hides type logo badge for locked card', () => {
    const { container } = render(<TriadCard card={ombreCard} context="collection-list" owned={false} />)

    expect(container.querySelector('.triad-card__type-badge')).toBeNull()
    expect(container.querySelector('.triad-card__type-logo')).toBeNull()
  })

  test('maps boss card type to r8 logo', () => {
    const { container } = render(<TriadCard card={xemnasCard} context="collection-list" owned />)

    const badge = container.querySelector('.triad-card__type-badge')
    const logo = container.querySelector<HTMLImageElement>('.triad-card__type-logo')

    expect(badge).not.toBeNull()
    expect(badge).toHaveClass('triad-card__type-badge--r8')
    expect(logo?.getAttribute('src')).toBe('/logos-types/humain.png')
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
})
