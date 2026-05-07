import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'bun:test'
import * as cloudLadderStore from '../../app/cloud/cloudLadderStore'
import { PROFILE_STORAGE_KEY } from '../../domain/progression/profile'
import { RanksPage } from './RanksPage'

vi.mock('../../app/cloud/cloudLadderStore', () => ({
  fetchOwnedCardsLadder: vi.fn(async () => []),
  fetchPeakRankLadder: vi.fn(async () => []),
  isGlobalLadderEnabled: vi.fn(() => true),
}))

function renderRanksPage() {
  return render(
    <MemoryRouter>
      <RanksPage />
    </MemoryRouter>,
  )
}

function writeStoredProfileRevision(playerName: string) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ playerName }))
}

function readStoredPlayerName(): string {
  const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '{}') as { playerName?: string }
  return saved.playerName ?? 'Joueur'
}

function createLocalLadderEntry() {
  return {
    userId: 'local-player',
    playerName: readStoredPlayerName(),
    ownedCardsCount: 5,
    peakRankScore: 0,
    peakRankLabel: 'Iron IV',
    updatedAt: '2026-05-07T12:00:00.000Z',
  }
}

describe('RanksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(cloudLadderStore.isGlobalLadderEnabled).mockReturnValue(false)
    vi.mocked(cloudLadderStore.fetchPeakRankLadder).mockResolvedValue([])
    vi.mocked(cloudLadderStore.fetchOwnedCardsLadder).mockResolvedValue([])
  })

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

  test('renders global ladders for rank and captured pokemon', async () => {
    vi.mocked(cloudLadderStore.isGlobalLadderEnabled).mockReturnValue(true)
    vi.mocked(cloudLadderStore.fetchPeakRankLadder).mockResolvedValue([
      {
        userId: 'rank-1',
        playerName: 'Sora',
        ownedCardsCount: 152,
        peakRankScore: 6085,
        peakRankLabel: 'Challenger',
        updatedAt: '2026-02-19T08:00:00.000Z',
      },
      {
        userId: 'rank-2',
        playerName: 'Riku',
        ownedCardsCount: 139,
        peakRankScore: 5071,
        peakRankLabel: 'Diamond I',
        updatedAt: '2026-02-18T08:00:00.000Z',
      },
    ])
    vi.mocked(cloudLadderStore.fetchOwnedCardsLadder).mockResolvedValue([
      {
        userId: 'owned-1',
        playerName: 'Kairi',
        ownedCardsCount: 200,
        peakRankScore: 5000,
        peakRankLabel: 'Diamond IV',
        updatedAt: '2026-02-17T08:00:00.000Z',
      },
      {
        userId: 'owned-2',
        playerName: 'Aqua',
        ownedCardsCount: 127,
        peakRankScore: 5000,
        peakRankLabel: 'Diamond IV',
        updatedAt: '2026-02-16T08:00:00.000Z',
      },
    ])

    renderRanksPage()

    expect(await screen.findByRole('heading', { name: 'Classements globaux' })).toBeInTheDocument()
    expect(cloudLadderStore.fetchPeakRankLadder).toHaveBeenCalledWith('3x3', 10)
    expect(cloudLadderStore.fetchOwnedCardsLadder).toHaveBeenCalledWith(10)
    expect(screen.getByTestId('ranks-rank-ladder')).toHaveTextContent('Sora')
    expect(screen.getByTestId('ranks-rank-ladder')).toHaveTextContent('Challenger')
    expect(screen.getByTestId('ranks-owned-ladder')).toHaveTextContent('Kairi')
    expect(screen.getByTestId('ranks-owned-ladder')).toHaveTextContent('200 Pokémon')
  })

  test('refreshes local ladders when the stored player name changes', async () => {
    vi.mocked(cloudLadderStore.isGlobalLadderEnabled).mockReturnValue(true)
    vi.mocked(cloudLadderStore.fetchPeakRankLadder).mockImplementation(async () => [createLocalLadderEntry()])
    vi.mocked(cloudLadderStore.fetchOwnedCardsLadder).mockImplementation(async () => [createLocalLadderEntry()])
    writeStoredProfileRevision('Joueur')

    const { rerender } = renderRanksPage()

    expect(await screen.findByTestId('ranks-rank-ladder')).toHaveTextContent('Joueur')
    expect(screen.getByTestId('ranks-owned-ladder')).toHaveTextContent('Joueur')

    writeStoredProfileRevision('Aqua')
    rerender(
      <MemoryRouter>
        <RanksPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(cloudLadderStore.fetchPeakRankLadder).toHaveBeenCalledTimes(2))
    expect(screen.getByTestId('ranks-rank-ladder')).toHaveTextContent('Aqua')
    expect(screen.getByTestId('ranks-owned-ladder')).toHaveTextContent('Aqua')
  })
})
