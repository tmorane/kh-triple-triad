import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import * as cloudLadderStore from '../../app/cloud/cloudLadderStore'
import { RanksPage } from './RanksPage'

vi.mock('../../app/cloud/cloudLadderStore', () => ({
  isGlobalLadderEnabled: vi.fn(() => false),
  fetchOwnedCardsLadder: vi.fn(async () => []),
  fetchPeakRankLadder: vi.fn(async () => []),
}))

function renderRanksPage() {
  return render(
    <MemoryRouter>
      <RanksPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cloudLadderStore.isGlobalLadderEnabled).mockReturnValue(false)
  vi.mocked(cloudLadderStore.fetchOwnedCardsLadder).mockResolvedValue([])
  vi.mocked(cloudLadderStore.fetchPeakRankLadder).mockResolvedValue([])
})

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

  test('shows ladder disabled note when global ladders are disabled', () => {
    renderRanksPage()

    expect(screen.getByTestId('ranks-ladder-disabled-note')).toHaveTextContent(
      'Global ladders are unavailable until cloud auth is configured.',
    )
  })

  test('renders both global ladders when global ladder mode is enabled (mock without cloud)', async () => {
    vi.mocked(cloudLadderStore.isGlobalLadderEnabled).mockReturnValue(true)
    vi.mocked(cloudLadderStore.fetchOwnedCardsLadder).mockResolvedValue([
      {
        userId: 'u-1',
        playerName: 'Alice',
        ownedCardsCount: 120,
        peakRankScore: 6123,
        peakRankLabel: 'Diamond II',
        updatedAt: '2026-02-23T12:00:00.000Z',
      },
    ])
    vi.mocked(cloudLadderStore.fetchPeakRankLadder).mockResolvedValue([
      {
        userId: 'u-1',
        playerName: 'Alice',
        ownedCardsCount: 120,
        peakRankScore: 6123,
        peakRankLabel: 'Diamond II',
        updatedAt: '2026-02-23T12:00:00.000Z',
      },
    ])

    renderRanksPage()

    await waitFor(() => {
      expect(screen.getByTestId('ranks-owned-ladder')).toBeInTheDocument()
    })

    expect(screen.getByTestId('ranks-owned-ladder')).toHaveTextContent('Alice')
    expect(screen.getByTestId('ranks-owned-ladder')).toHaveTextContent('120')
    expect(screen.getByTestId('ranks-peak-ladder')).toHaveTextContent('Diamond II')
  })
})
