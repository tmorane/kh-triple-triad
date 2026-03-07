import { render } from '@testing-library/react'
import { describe, expect, test } from 'bun:test'
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

const longNameCard: CardDef = {
  id: 'c110',
  name: 'Hypnomade',
  top: 4,
  right: 5,
  bottom: 5,
  left: 5,
  rarity: 'rare',
  categoryId: 'simili',
  elementId: 'psy',
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

  test('renders type logo badge for owned card and hides it for locked card', () => {
    const { container, rerender } = render(<TriadCard card={aboCard} context="collection-list" owned />)

    const badge = container.querySelector('[data-testid="triad-card-type-badge"]')
    const logo = container.querySelector<HTMLImageElement>('[data-testid="triad-card-type-logo"]')
    expect(badge).not.toBeNull()
    expect(logo).not.toBeNull()
    expect(logo?.getAttribute('src')).toContain('/logos-elements/poison.png')

    rerender(<TriadCard card={aboCard} context="collection-list" owned={false} />)
    expect(container.querySelector('[data-testid="triad-card-type-badge"]')).toBeNull()
    expect(container.querySelector('[data-testid="triad-card-type-logo"]')).toBeNull()
    const lockedRoot = container.querySelector('.triad-card')
    expect(lockedRoot).not.toHaveClass('triad-card--element-poison')
    expect(container.querySelector('.triad-card__rarity')).toBeNull()
  })

  test('adds element class on card root in collection detail context', () => {
    const { container, rerender } = render(<TriadCard card={aboCard} context="collection-detail" owned />)

    const cardRoot = container.querySelector('.triad-card')
    expect(cardRoot).not.toBeNull()
    expect(cardRoot).toHaveClass('triad-card--element-poison')

    rerender(<TriadCard card={longNameCard} context="collection-detail" owned />)
    expect(cardRoot).toHaveClass('triad-card--element-psy')
    expect(cardRoot).not.toHaveClass('triad-card--element-poison')
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

  test('renders stat overrides and trend classes when provided', () => {
    const { container } = render(
      <TriadCard
        card={aboCard}
        context="hand-player"
        owned
        statOverrides={{ top: 1, right: 1, bottom: 1, left: 2 }}
        statTrends={{ top: 'debuff', right: 'debuff', bottom: 'debuff', left: 'neutral' }}
      />,
    )

    const topStat = container.querySelector('.triad-card__stat--top')
    const rightStat = container.querySelector('.triad-card__stat--right')
    const leftStat = container.querySelector('.triad-card__stat--left')
    expect(topStat).toHaveTextContent('1')
    expect(topStat).toHaveClass('effect-stat--debuff')
    expect(rightStat).toHaveTextContent('1')
    expect(rightStat).toHaveClass('effect-stat--debuff')
    expect(leftStat).toHaveTextContent('2')
    expect(leftStat).toHaveClass('effect-stat--neutral')
  })

  test('adds shiny class and badge when shiny prop is enabled', () => {
    const { container, rerender } = render(<TriadCard card={aboCard} context="collection-detail" owned shiny />)

    const cardRoot = container.querySelector('.triad-card')
    expect(cardRoot).not.toBeNull()
    expect(cardRoot).toHaveClass('is-shiny')
    expect(container.querySelector('[data-testid="triad-card-shiny-pill"]')).toHaveAttribute('aria-label', 'Shiny card')

    rerender(<TriadCard card={aboCard} context="collection-detail" owned shiny={false} />)
    expect(cardRoot).not.toHaveClass('is-shiny')
    expect(container.querySelector('[data-testid="triad-card-shiny-pill"]')).toBeNull()
  })

  test('uses shiny splashart path when the card is shiny', () => {
    const { container } = render(<TriadCard card={aboCard} context="collection-list" owned shiny />)

    const image = container.querySelector<HTMLImageElement>('.triad-card__art-image')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toContain('/splashart-shiny/Abo_Shiny.png')
  })

  test('fragment-silhouette mode renders art for locked card', () => {
    const { container } = render(
      <TriadCard card={aboCard} context="collection-list" owned={false} displayMode="fragment-silhouette" />,
    )

    const image = container.querySelector<HTMLImageElement>('.triad-card__art-image')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toContain('/splashart/Abo.png')
    expect(container.querySelector('.triad-card__frame')).toBeNull()
  })
})
