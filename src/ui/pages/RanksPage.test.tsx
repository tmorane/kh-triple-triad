import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { RanksPage } from './RanksPage'

function renderRanksPage() {
  return render(
    <MemoryRouter>
      <RanksPage />
    </MemoryRouter>,
  )
}

describe('RanksPage', () => {
  test('renders all ranked tiers with emblem and division model', () => {
    renderRanksPage()

    const tiers = [
      'Iron',
      'Bronze',
      'Silver',
      'Gold',
      'Platinum',
      'Emerald',
      'Diamond',
      'Master',
      'Grandmaster',
      'Challenger',
    ]

    for (const tier of tiers) {
      expect(screen.getByRole('heading', { name: tier })).toBeInTheDocument()
    }

    expect(screen.getAllByTestId(/^ranks-tier-/)).toHaveLength(10)
    expect(screen.getByTestId('ranks-tier-iron')).toHaveTextContent('Divisions IV, III, II, I')
    expect(screen.getByTestId('ranks-tier-diamond')).toHaveTextContent('Divisions IV, III, II, I')
    expect(screen.getByTestId('ranks-tier-master')).toHaveTextContent('Apex tier (no divisions)')
    expect(screen.getByTestId('ranks-tier-challenger')).toHaveTextContent('Apex tier (no divisions)')
    expect(screen.getByRole('img', { name: 'Iron rank emblem' })).toHaveAttribute('src', '/ranks/iron.svg')
    expect(screen.getByRole('img', { name: 'Challenger rank emblem' })).toHaveAttribute('src', '/ranks/challenger.svg')
  })

  test('renders ranked LP rules summary', () => {
    renderRanksPage()

    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('+20 / +25 / +30 LP')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('-20 / -25 / -30 LP')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Draw: 0 LP')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Promotion at 100 LP with carry')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Demotion shield: 3 losses after promotion')
    expect(screen.getByTestId('ranks-open-only-note')).toHaveTextContent('Ranked queue always uses Open only')
  })
})
