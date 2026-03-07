import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'bun:test'
import { DeckSynergyGuide } from './DeckSynergyGuide'

const counts = {
  sans_coeur: 3,
  simili: 2,
  nescient: 1,
  humain: 0,
} as const

describe('DeckSynergyGuide', () => {
  test('renders all four type buttons with counters', () => {
    render(
      <DeckSynergyGuide
        countsByType={counts}
        primaryTypeId="sans_coeur"
        secondaryTypeId="simili"
        testIdPrefix="guide"
      />,
    )

    expect(screen.getByTestId('guide-type-sans_coeur')).toHaveTextContent('Obscur')
    expect(screen.getByTestId('guide-type-sans_coeur')).toHaveTextContent('x3')
    expect(screen.getByTestId('guide-type-simili')).toHaveTextContent('Psy')
    expect(screen.getByTestId('guide-type-simili')).toHaveTextContent('x2')
    expect(screen.getByTestId('guide-type-nescient')).toHaveTextContent('Combat')
    expect(screen.getByTestId('guide-type-nescient')).toHaveTextContent('x1')
    expect(screen.getByTestId('guide-type-humain')).toHaveTextContent('Nature')
    expect(screen.getByTestId('guide-type-humain')).toHaveTextContent('x0')
  })

  test('defaults detail panel to active primary type', () => {
    render(
      <DeckSynergyGuide
        countsByType={counts}
        primaryTypeId="sans_coeur"
        secondaryTypeId="simili"
        testIdPrefix="guide"
      />,
    )

    expect(screen.getByTestId('guide-detail-title')).toHaveTextContent('Obscur')
    expect(screen.getByTestId('guide-detail-primary')).toHaveTextContent('Primaire')
    expect(screen.getByTestId('guide-detail-secondary')).toHaveTextContent('Secondaire')
  })

  test('hover updates the displayed type details on desktop interaction', async () => {
    const user = userEvent.setup()
    render(
      <DeckSynergyGuide
        countsByType={counts}
        primaryTypeId="sans_coeur"
        secondaryTypeId="simili"
        testIdPrefix="guide"
      />,
    )

    await user.hover(screen.getByTestId('guide-type-nescient'))
    expect(screen.getByTestId('guide-detail-title')).toHaveTextContent('Combat')
    expect(screen.getByTestId('guide-detail-primary')).toHaveTextContent('Main cachee')

    await user.unhover(screen.getByTestId('guide-type-nescient'))
    expect(screen.getByTestId('guide-detail-title')).toHaveTextContent('Obscur')
  })

  test('click toggles detail visibility for tap/mobile fallback', async () => {
    const user = userEvent.setup()
    render(
      <DeckSynergyGuide
        countsByType={counts}
        primaryTypeId={null}
        secondaryTypeId={null}
        testIdPrefix="guide"
      />,
    )

    await user.click(screen.getByTestId('guide-type-simili'))
    expect(screen.getByTestId('guide-detail-title')).toHaveTextContent('Psy')

    await user.click(screen.getByTestId('guide-type-simili'))
    expect(screen.getByTestId('guide-detail-empty')).toBeInTheDocument()
  })

  test('marks primary and secondary active states distinctly', () => {
    render(
      <DeckSynergyGuide
        countsByType={counts}
        primaryTypeId="sans_coeur"
        secondaryTypeId="simili"
        testIdPrefix="guide"
      />,
    )

    expect(screen.getByTestId('guide-type-sans_coeur')).toHaveClass('is-primary-active')
    expect(screen.getByTestId('guide-type-simili')).toHaveClass('is-secondary-active')
    expect(screen.getByTestId('guide-type-humain')).toHaveClass('is-empty')
  })
})
