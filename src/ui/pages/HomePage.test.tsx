import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, beforeEach, describe, expect, test, vi } from 'bun:test'
import { __setCloudLadderDependenciesForTests, __setMockLadderEnabledForTests } from '../../app/cloud/cloudLadderStore'
import { GameContext } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { createDefaultProfile } from '../../domain/progression/profile'
import { HomePage } from './HomePage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>
const listStoredProfilesForLadderMock = vi.fn(() => [])
const isCloudAuthEnabledMock = vi.fn(() => false)
const getSupabaseClientMock = vi.fn(() => null)

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
    setAudioEnabled: () => {
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

function getRenderedMissionCards(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('[data-testid^="home-mission-"]')).filter(
    (node) => !node.getAttribute('data-testid')?.startsWith('home-mission-progress-'),
  ) as HTMLElement[]
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

describe('HomePage ranked display', () => {
  test('shows 3x3 ranked tier, LP and emblem', () => {
    renderHome()

    expect(screen.getByTestId('home-ranked-tier-3x3')).toHaveTextContent('Iron IV')
    expect(screen.getByTestId('home-ranked-tier-3x3')).toHaveTextContent('Division 4')
    expect(screen.getByTestId('home-ranked-tier-label-3x3')).toHaveTextContent('3X3')
    expect(screen.getByTestId('home-ranked-badge-label-3x3')).toHaveTextContent('Division 4')
    expect(screen.getByTestId('home-ranked-lp-3x3')).toHaveTextContent('0 LP')
    expect(screen.getByTestId('home-ranked-badge-3x3')).toHaveAttribute('src', '/ranks/iron.png')
    expect(screen.getByText('Pokédex')).toBeInTheDocument()
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

  test('renders hero CTA group with primary and secondary actions', () => {
    renderHome()

    expect(screen.getByTestId('home-hero-cta')).toBeInTheDocument()
    expect(screen.getByTestId('home-quick-action-play')).toBeInTheDocument()
    expect(screen.getByTestId('home-quick-action-packs')).toHaveAttribute('href', '/packs')
    expect(screen.getByTestId('home-quick-action-setup')).toHaveAttribute('href', '/decks')
  })

  test('renders profile art in player profile on home', () => {
    renderHome()

    expect(screen.getByTestId('home-profile-art-image')).toHaveAttribute('src', '/ui/home/season-current.png')
    expect(screen.queryByText('Season spotlight')).not.toBeInTheDocument()
  })

  test('shows missions block with progress and missions page link', () => {
    renderHome()

    expect(screen.getByTestId('home-missions-block')).toBeInTheDocument()
    expect(screen.getByTestId('home-mission-progress-m1_type_specialist')).toHaveTextContent('0/5')
    expect(screen.getByTestId('home-missions-link')).toHaveAttribute('href', '/missions')
  })

  test('renders 6 mission cards on home', () => {
    const { container } = render(
      <MemoryRouter>
        <GameContext.Provider value={createContextValue()}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(getRenderedMissionCards(container)).toHaveLength(6)
  })

  test('highlights one non-completed mission with the highest progress as focus', () => {
    const profile = createDefaultProfile()
    profile.missions.m1_type_specialist.progress = 4
    profile.missions.m1_type_specialist.target = 5
    profile.missions.m2_combo_practitioner.progress = 2
    profile.missions.m2_combo_practitioner.target = 6
    profile.missions.m3_corner_tactician.progress = 1
    profile.missions.m3_corner_tactician.target = 12
    profile.missions.m1_type_specialist.completed = false
    profile.missions.m2_combo_practitioner.completed = false
    profile.missions.m3_corner_tactician.completed = false

    const { container } = render(
      <MemoryRouter>
        <GameContext.Provider value={createContextValue({ profile })}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    const focusCards = container.querySelectorAll('.home-mission-card--focus')
    expect(focusCards).toHaveLength(1)
    expect(screen.getByTestId('home-mission-m1_type_specialist')).toHaveClass('home-mission-card--focus')
    expect(screen.getByTestId('home-mission-m2_combo_practitioner')).not.toHaveClass('home-mission-card--focus')
    expect(screen.getByTestId('home-mission-m3_corner_tactician')).not.toHaveClass('home-mission-card--focus')
  })

  test('renders claim action on completed mission and triggers claim from home', async () => {
    const user = userEvent.setup()
    const claimMission = vi.fn(() => ({ valid: true }))
    const profile = createDefaultProfile()
    profile.missions.m1_type_specialist.progress = 5
    profile.missions.m1_type_specialist.target = 5
    profile.missions.m1_type_specialist.completed = true
    profile.missions.m1_type_specialist.claimed = false

    renderHome({ profile, claimMission })

    const claimButton = screen.getByTestId('home-mission-claim-m1_type_specialist')
    expect(claimButton).toHaveTextContent('Claim')
    await user.click(claimButton)
    expect(claimMission).toHaveBeenCalledWith('m1_type_specialist')
  })

  test('does not render claim action for completed bonus missions', () => {
    const profile = createDefaultProfile()
    profile.stats.streak = 8
    profile.stats.played = 40
    profile.ownedCardIds = cardPool.map((card) => card.id)

    renderHome({ profile })

    expect(screen.queryByTestId('home-mission-claim-b1_win_streak')).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-mission-claim-b2_match_grinder')).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-mission-claim-b3_collection_hunter')).not.toBeInTheDocument()
  })

  test('renders collection hunter target against the full 251-card pokedex', () => {
    const profile = createDefaultProfile()
    profile.ownedCardIds = cardPool.map((card) => card.id)

    renderHome({ profile })

    expect(screen.getByTestId('home-mission-progress-b3_collection_hunter')).toHaveTextContent('251/251')
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

    renderHome()

    expect(await screen.findByTestId('home-owned-ladder')).toBeInTheDocument()
    expect(screen.getByTestId('home-owned-ladder')).toHaveTextContent('Alice')
    expect(screen.getByTestId('home-owned-ladder')).toHaveTextContent('120')
    expect(screen.getByTestId('home-peak-ladder')).toHaveTextContent('Diamond II')
  })
})
