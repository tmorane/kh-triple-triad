import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import * as cloudLadderStore from '../../app/cloud/cloudLadderStore'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import { HomePage } from './HomePage'

vi.mock('../../app/cloud/cloudLadderStore', () => ({
  isGlobalLadderEnabled: vi.fn(() => false),
  fetchOwnedCardsLadder: vi.fn(async () => []),
  fetchPeakRankLadder: vi.fn(async () => []),
}))

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function createContextValue(overrides: Partial<GameContextValue> = {}): GameContextValue {
  const profile = createDefaultProfile()

  const baseContextValue: GameContextValue = {
    profile,
    storedProfiles: {
      activeProfileId: 'profile-1',
      profiles: [
        {
          id: 'profile-1',
          playerName: profile.playerName,
          gold: profile.gold,
          played: profile.stats.played,
          wins: profile.stats.won,
          isActive: true,
        },
      ],
    },
    currentMatch: null,
    lastMatchSummary: null,
    startMatch: () => {
      throw new Error('Not implemented in test.')
    },
    selectDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    renamePlayer: () => {
      throw new Error('Not implemented in test.')
    },
    renameDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    toggleDeckSlotCard: () => {
      throw new Error('Not implemented in test.')
    },
    setDeckSlotMode: () => {
      throw new Error('Not implemented in test.')
    },
    setDeckSlotRules: () => {
      throw new Error('Not implemented in test.')
    },
    updateCurrentMatch: () => {
      throw new Error('Not implemented in test.')
    },
    finalizeCurrentMatch: () => {
      throw new Error('Not implemented in test.')
    },
    clearLastMatchSummary: () => {
      throw new Error('Not implemented in test.')
    },
    purchaseShopPack: () => {
      throw new Error('Not implemented in test.')
    },
    openOwnedPack: () => {
      throw new Error('Not implemented in test.')
    },
    buySpecialPack: () => {
      throw new Error('Not implemented in test.')
    },
    addTestGold: () => {
      throw new Error('Not implemented in test.')
    },
    createStoredProfile: () => {
      throw new Error('Not implemented in test.')
    },
    switchStoredProfile: () => {
      throw new Error('Not implemented in test.')
    },
    deleteStoredProfile: () => {
      throw new Error('Not implemented in test.')
    },
    resetProfile: () => {
      throw new Error('Not implemented in test.')
    },
  }

  return {
    ...baseContextValue,
    ...overrides,
    storedProfiles: overrides.storedProfiles ?? baseContextValue.storedProfiles,
  }
}

function renderHome(overrides: Partial<GameContextValue> = {}) {
  render(
    <MemoryRouter>
      <GameContext.Provider value={createContextValue(overrides)}>
        <HomePage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cloudLadderStore.isGlobalLadderEnabled).mockReturnValue(false)
  vi.mocked(cloudLadderStore.fetchOwnedCardsLadder).mockResolvedValue([])
  vi.mocked(cloudLadderStore.fetchPeakRankLadder).mockResolvedValue([])
})

describe('HomePage ranked display', () => {
  test('shows ranked tier, LP and emblem', () => {
    renderHome()

    expect(screen.getByTestId('home-ranked-tier')).toHaveTextContent('Iron IV')
    expect(screen.getByTestId('home-ranked-tier')).toHaveTextContent('Division 4')
    expect(screen.getByTestId('home-ranked-tier-label')).toHaveTextContent('Division 4')
    expect(screen.getByTestId('home-ranked-badge-label')).toHaveTextContent('Division 4')
    expect(screen.getByTestId('home-ranked-lp')).toHaveTextContent('0 LP')
    expect(screen.getByTestId('home-ranked-badge')).toHaveAttribute('src', '/ranks/iron.svg')
    expect(screen.getByText('Card Collection')).toBeInTheDocument()
  })

  test('quick action switches to continue when a match is active', () => {
    renderHome({ currentMatch: {} as GameContextValue['currentMatch'] })

    expect(screen.getByTestId('home-quick-action-play')).toHaveTextContent('Continue')
    expect(screen.getByTestId('home-quick-action-play')).toHaveAttribute('href', '/match')
  })

  test('does not render next best action card', () => {
    renderHome()

    expect(screen.queryByTestId('home-next-action-card')).not.toBeInTheDocument()
  })

  test('default quick action points to setup', () => {
    renderHome()

    expect(screen.getByTestId('home-quick-action-play')).toHaveTextContent('Play')
    expect(screen.getByTestId('home-quick-action-play')).toHaveAttribute('href', '/setup')
    expect(screen.getByTestId('home-quick-action-setup')).toHaveAttribute('href', '/decks')
  })

  test('shows missions block with progress and missions page link', () => {
    renderHome()

    expect(screen.getByTestId('home-missions-block')).toBeInTheDocument()
    expect(screen.getByTestId('home-mission-progress-m1_type_specialist')).toHaveTextContent('0/5')
    expect(screen.getByTestId('home-missions-link')).toHaveAttribute('href', '/missions')
  })

  test('keeps home focused on core actions and hides profile management controls', () => {
    renderHome()

    expect(screen.queryByTestId('home-profiles-block')).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-reset-trigger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-player-name-trigger')).not.toBeInTheDocument()
  })

  test('shows ladder disabled note when global ladders are disabled', () => {
    renderHome()

    expect(screen.getByTestId('home-ladder-disabled-note')).toHaveTextContent(
      'Global ladders are unavailable until cloud auth is configured.',
    )
  })

  test('renders both ladders on home when global ladder mode is enabled (mock without cloud)', async () => {
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

    renderHome()

    expect(await screen.findByTestId('home-owned-ladder')).toBeInTheDocument()
    expect(screen.getByTestId('home-owned-ladder')).toHaveTextContent('Alice')
    expect(screen.getByTestId('home-owned-ladder')).toHaveTextContent('120')
    expect(screen.getByTestId('home-peak-ladder')).toHaveTextContent('Diamond II')
  })
})
