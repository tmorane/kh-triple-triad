import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'bun:test'
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
      'Fer',
      'Bronze',
      'Argent',
      'Or',
      'Platine',
      'Diamant',
      'Challenger',
    ]

    for (const tier of tiers) {
      expect(screen.getByRole('heading', { name: tier })).toBeInTheDocument()
    }

    expect(screen.getAllByTestId(/^ranks-tier-/)).toHaveLength(7)
    expect(screen.getByTestId('ranks-tier-iron')).toHaveTextContent('Divisions IV, III, II, I')
    expect(screen.getByTestId('ranks-tier-diamond')).toHaveTextContent('Divisions IV, III, II, I')
    expect(screen.getByTestId('ranks-tier-challenger')).toHaveTextContent('Rang sommet (sans divisions)')
    expect(screen.getByRole('img', { name: 'Emblème du rang Fer' })).toHaveAttribute('src', '/ranks/iron.svg')
    expect(screen.getByRole('img', { name: 'Emblème du rang Challenger' })).toHaveAttribute('src', '/ranks/challenger.svg')
  })

  test('renders ranked LP rules summary', () => {
    renderRanksPage()

    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('+30 / +31 / +32 / +33 / +34 / +35')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('-15 / -16 / -17 / -18 / -19 / -20')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Égalité: 0 point')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Promotion à 100 points: BO3')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Matchs de BO3: aucun point gagné ou perdu')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Promotion réussie: ligue suivante +20 points')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Promotion ratée: même ligue, retour à 80 points')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('À 0 point: 2 boucliers, la 3e défaite rétrograde')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Challenger: pas de rétrogradation vers Diamant')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Saison: 2 mois, reset -2 ligues')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Récompenses de ligue: 1 fois par ligue et par saison')
    expect(screen.getByTestId('ranks-open-only-note')).toHaveTextContent('La file classée utilise seulement la règle de visibilité')
  })

  test('hides global ladder connection block for now', () => {
    renderRanksPage()

    expect(screen.queryByRole('heading', { name: 'Classements globaux' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('ranks-ladder-disabled-note')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ranks-owned-ladder')).not.toBeInTheDocument()
  })
})
