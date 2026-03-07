import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, beforeEach, describe, expect, test, vi } from 'bun:test'
import { __setCloudLadderDependenciesForTests, __setMockLadderEnabledForTests } from '../../app/cloud/cloudLadderStore'
import { RanksPage } from './RanksPage'
const listStoredProfilesForLadderMock = vi.fn(() => [])
const isCloudAuthEnabledMock = vi.fn(() => false)
const getSupabaseClientMock = vi.fn(() => null)

function renderRanksPage() {
  return render(
    <MemoryRouter>
      <RanksPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  listStoredProfilesForLadderMock.mockReturnValue([])
  isCloudAuthEnabledMock.mockReturnValue(false)
  getSupabaseClientMock.mockReturnValue(null)
  __setMockLadderEnabledForTests(false)
  __setCloudLadderDependenciesForTests({
    listStoredProfilesForLadder: listStoredProfilesForLadderMock,
    isCloudAuthEnabled: isCloudAuthEnabledMock,
    getSupabaseClient: getSupabaseClientMock,
  })
})

afterAll(() => {
  __setMockLadderEnabledForTests(null)
  __setCloudLadderDependenciesForTests(null)
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
      'Diamond',
      'Challenger',
    ]

    for (const tier of tiers) {
      expect(screen.getByRole('heading', { name: tier })).toBeInTheDocument()
    }

    expect(screen.getAllByTestId(/^ranks-tier-/)).toHaveLength(7)
    expect(screen.getByTestId('ranks-tier-iron')).toHaveTextContent('Divisions IV, III, II, I')
    expect(screen.getByTestId('ranks-tier-diamond')).toHaveTextContent('Divisions IV, III, II, I')
    expect(screen.getByTestId('ranks-tier-challenger')).toHaveTextContent('Apex tier (no divisions)')
    expect(screen.getByRole('img', { name: 'Iron rank emblem' })).toHaveAttribute('src', '/ranks/iron.png')
    expect(screen.getByRole('img', { name: 'Challenger rank emblem' })).toHaveAttribute('src', '/ranks/challenger.png')
  })

  test('renders ranked LP rules summary', () => {
    renderRanksPage()

    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('+60 / +65 / +70 LP')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('IV +0, III +1, II +2, I +3 LP')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Challenger +2 LP')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('-20 / -25 / -30 LP')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('IV +0, III +2, II +4, I +6 score')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Challenger +6 score')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Draw: 0 LP')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Promotion at 100 LP with carry')
    expect(screen.getByTestId('ranks-rules')).toHaveTextContent('Demotion shield: 3 losses after promotion')
    expect(screen.getByTestId('ranks-open-only-note')).toHaveTextContent('Ranked queue uses visibility rule only')
  })

  test('shows ladder disabled note when global ladders are disabled', () => {
    renderRanksPage()

    expect(screen.getByTestId('ranks-ladder-disabled-note')).toHaveTextContent(
      'Global ladders are unavailable until cloud auth is configured.',
    )
  })

  test('renders owned cards ladder and 3x3 peak ladder when global ladder mode is enabled (mock without cloud)', async () => {
    listStoredProfilesForLadderMock.mockReturnValue([
      {
        id: 'u-1',
        playerName: 'Alice',
        ownedCardsCount: 120,
        rankedByMode: {
          '3x3': { tier: 'diamond', division: 'II', lp: 23 },
          '4x4': { tier: 'diamond', division: 'II', lp: 23 },
        },
        updatedAt: '2026-02-23T12:00:00.000Z',
      },
    ])

    renderRanksPage()

    await waitFor(() => {
      expect(screen.getByTestId('ranks-owned-ladder')).toBeInTheDocument()
    })

    expect(screen.getByTestId('ranks-owned-ladder')).toHaveTextContent('Alice')
    expect(screen.getByTestId('ranks-owned-ladder')).toHaveTextContent('120')
    expect(screen.getByTestId('ranks-peak-ladder-3x3')).toHaveTextContent('Diamond II')
    expect(screen.queryByTestId('ranks-peak-ladder-4x4')).not.toBeInTheDocument()
  })
})
