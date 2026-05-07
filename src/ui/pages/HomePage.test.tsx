import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'bun:test'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import { HomePage } from './HomePage'

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

describe('HomePage ranked display', () => {
  test('shows 3x3 ranked tier, LP and emblem', () => {
    renderHome()

    expect(screen.getByTestId('home-ranked-tier-3x3')).toHaveTextContent('Fer IV')
    expect(screen.getByTestId('home-ranked-tier-3x3')).toHaveTextContent('Division 4')
    expect(screen.getByTestId('home-ranked-tier-label-3x3')).toHaveTextContent('3X3')
    expect(screen.getByTestId('home-ranked-badge-label-3x3')).toHaveTextContent('Division 4')
    expect(screen.getByTestId('home-ranked-lp-3x3')).toHaveTextContent('0 LP')
    expect(screen.getByTestId('home-ranked-badge-3x3')).toHaveAttribute('src', '/ranks/iron.svg')
    expect(screen.getByText('Pokédex')).toBeInTheDocument()
  })

  test('quick action switches to continue when a match is active', () => {
    renderHome({ currentMatch: {} as GameContextValue['currentMatch'] })

    expect(screen.getByTestId('home-quick-action-play')).toHaveTextContent('Continuer')
    expect(screen.getByTestId('home-quick-action-play')).toHaveAttribute('href', '/match')
  })

  test('renders first-run onboarding and next recommended action', () => {
    renderHome()

    expect(screen.getByTestId('home-onboarding')).toBeInTheDocument()
    expect(screen.getByTestId('home-onboarding-primary')).toHaveTextContent('Faire le tutoriel')
    expect(screen.getByTestId('home-onboarding-step-base_tutorial')).toHaveTextContent('Maintenant')
    expect(screen.getByTestId('home-next-action-start_tutorial')).toHaveTextContent('Faire le tutoriel')
  })

  test('hides onboarding after tutorial and first match while keeping loop actions', () => {
    const profile = createDefaultProfile()
    profile.tutorialProgress = { baseCompleted: true, completedElementById: {} }
    profile.stats.played = 1

    renderHome({ profile })

    expect(screen.queryByTestId('home-onboarding')).not.toBeInTheDocument()
    expect(screen.getByTestId('home-next-actions')).toBeInTheDocument()
    expect(screen.getByTestId('home-long-term-goals')).toBeInTheDocument()
  })

  test('default quick action points to setup', () => {
    renderHome()

    expect(screen.getByTestId('home-quick-action-play')).toHaveTextContent('Jouer')
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

    expect(screen.getByTestId('home-profile-art-image')).toHaveAttribute('src', '/ui/home/season-current.webp')
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
    expect(claimButton).toHaveTextContent('Récupérer')
    await user.click(claimButton)
    expect(claimMission).toHaveBeenCalledWith('m1_type_specialist')
  })

  test('renders claim action for completed streak mission', () => {
    const claimMission = vi.fn(() => ({ valid: true }))
    const profile = createDefaultProfile()
    profile.missions.b1_win_streak.progress = 5
    profile.missions.b1_win_streak.completed = true

    renderHome({ profile, claimMission })

    expect(screen.getByTestId('home-mission-claim-b1_win_streak')).toHaveTextContent('Récupérer')
  })

  test('renders collection hunter mission target from persisted mission progress', () => {
    const profile = createDefaultProfile()
    profile.missions.b3_collection_hunter.progress = 30
    profile.missions.b3_collection_hunter.completed = true

    renderHome({ profile })

    expect(screen.getByTestId('home-mission-progress-b3_collection_hunter')).toHaveTextContent('30/30')
  })

  test('shows tracked pokemon widget in main menu with artwork, name, and gauge', () => {
    const profile = createDefaultProfile()
    profile.trackedPokemon = {
      targetCardId: 'c01',
      gaugePoints: 60,
      completedGaugesInWindow: 2,
      windowStartedAt: '2026-03-10T09:00:00.000Z',
    }

    renderHome({ profile })

    expect(screen.getByTestId('home-tracked-name')).toHaveTextContent('Bulbizarre')
    expect(screen.getByTestId('home-tracked-gauge')).toHaveTextContent('60/100')
    expect(screen.getByTestId('home-tracked-art')).toBeInTheDocument()
  })

  test('shows tracked pokemon as silhouette when target is not owned', () => {
    const profile = createDefaultProfile()
    profile.trackedPokemon = {
      targetCardId: 'c150',
      gaugePoints: 10,
      completedGaugesInWindow: 0,
      windowStartedAt: '2026-03-10T09:00:00.000Z',
    }
    profile.ownedCardIds = profile.ownedCardIds.filter((cardId) => cardId !== 'c150')
    profile.shinyCardCopiesById.c150 = 0

    renderHome({ profile })

    expect(screen.getByTestId('home-tracked-name')).toHaveTextContent('Mewtwo')
    expect(screen.getByTestId('home-tracked-art-wrap')).toHaveClass('is-silhouette')
    expect(screen.queryByTestId('home-tracked-shiny-star')).not.toBeInTheDocument()
  })

  test('shows shiny star on tracked pokemon when shiny copy is owned', () => {
    const profile = createDefaultProfile()
    profile.trackedPokemon = {
      targetCardId: 'c01',
      gaugePoints: 45,
      completedGaugesInWindow: 1,
      windowStartedAt: '2026-03-10T09:00:00.000Z',
    }
    if (!profile.ownedCardIds.includes('c01')) {
      profile.ownedCardIds.push('c01')
    }
    profile.shinyCardCopiesById.c01 = 1

    renderHome({ profile })

    expect(screen.getByTestId('home-tracked-art-wrap')).not.toHaveClass('is-silhouette')
    expect(screen.getByTestId('home-tracked-shiny-star')).toBeInTheDocument()
  })

  test('shows missing, owned, and shiny visual states in tracked pokemon selection', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    if (!profile.ownedCardIds.includes('c25')) {
      profile.ownedCardIds.push('c25')
    }
    if (!profile.ownedCardIds.includes('c01')) {
      profile.ownedCardIds.push('c01')
    }
    profile.ownedCardIds = profile.ownedCardIds.filter((cardId) => cardId !== 'c150')
    profile.shinyCardCopiesById.c01 = 1
    profile.shinyCardCopiesById.c25 = 0
    profile.shinyCardCopiesById.c150 = 0

    renderHome({ profile })

    await user.click(screen.getByTestId('home-tracked-trigger'))

    expect(screen.getByTestId('home-tracked-option-state-c01')).toHaveTextContent('★')
    expect(screen.getByTestId('home-tracked-option-state-c25')).toHaveTextContent('✓')
    expect(screen.getByTestId('home-tracked-option-state-c150')).toHaveTextContent('◌')
    expect(screen.getByTestId('home-tracked-option-art-wrap-c150')).toHaveClass('is-silhouette')
  })

  test('opens tracked pokemon popup from main menu and allows selecting a new target via collapsible', async () => {
    const user = userEvent.setup()
    const setTrackedPokemonTarget = vi.fn(() => ({ valid: true }))

    renderHome({ setTrackedPokemonTarget })

    await user.click(screen.getByTestId('home-tracked-trigger'))
    expect(screen.getByTestId('home-tracked-modal')).toBeInTheDocument()

    await user.click(screen.getByTestId('home-tracked-option-c25'))
    expect(screen.getByTestId('home-tracked-option-panel-c25')).toBeInTheDocument()
    await user.click(screen.getByTestId('home-tracked-option-select-c25'))
    expect(setTrackedPokemonTarget).toHaveBeenCalledWith('c25')
  })

  test('tracked pokemon popup supports search and gen filters', async () => {
    const user = userEvent.setup()

    renderHome()

    await user.click(screen.getByTestId('home-tracked-trigger'))
    expect(screen.getByTestId('home-tracked-modal')).toBeInTheDocument()

    await user.click(screen.getByTestId('home-tracked-filter-gen-2'))
    expect(screen.queryByTestId('home-tracked-option-c01')).not.toBeInTheDocument()
    expect(screen.getByTestId('home-tracked-option-c251')).toBeInTheDocument()

    await user.clear(screen.getByTestId('home-tracked-search-input'))
    await user.type(screen.getByTestId('home-tracked-search-input'), 'bulbi')
    expect(screen.getByTestId('home-tracked-empty')).toBeInTheDocument()

    await user.click(screen.getByTestId('home-tracked-filter-all'))
    await user.clear(screen.getByTestId('home-tracked-search-input'))
    expect(screen.getByTestId('home-tracked-option-c01')).toBeInTheDocument()
  })

  test('keeps home focused on core actions and hides profile management controls', () => {
    renderHome()

    expect(screen.queryByTestId('home-profiles-block')).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-reset-trigger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-player-name-trigger')).not.toBeInTheDocument()
  })

  test('hides global ladder connection block for now', () => {
    renderHome()

    expect(screen.queryByRole('heading', { name: 'Classements globaux' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-ladder-disabled-note')).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-owned-ladder')).not.toBeInTheDocument()
  })
})
