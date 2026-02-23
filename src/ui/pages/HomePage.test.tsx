import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import { HomePage } from './HomePage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function createContextValue(overrides: Partial<GameContextValue> = {}): GameContextValue {
  return {
    profile: createDefaultProfile(),
    currentMatch: null,
    lastMatchSummary: null,
    recentRankRewards: [],
    clearRecentRankRewards: () => {
      throw new Error('Not implemented in test.')
    },
    startMatch: () => {
      throw new Error('Not implemented in test.')
    },
    selectDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    renameDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    toggleDeckSlotCard: () => {
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
    addTestGold: () => {
      throw new Error('Not implemented in test.')
    },
    resetProfile: () => {
      throw new Error('Not implemented in test.')
    },
    ...overrides,
  }
}

describe('HomePage rank rewards banner', () => {
  test('shows rank rewards banner and lets the player dismiss it', async () => {
    const user = userEvent.setup()
    const clearRecentRankRewards = vi.fn()

    const contextValue = createContextValue({
      recentRankRewards: [
        {
          rankId: 'R2',
          rankName: 'Twilight Cadet',
          reward: {
            gold: 60,
            packs: { common: 1 },
          },
        },
      ],
      clearRecentRankRewards,
    })

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('home-rank-rewards-banner')).toBeInTheDocument()
    expect(screen.getByTestId('home-rank-rewards-banner')).toHaveTextContent('Twilight Cadet')
    expect(screen.getByTestId('home-rank-rewards-banner')).toHaveTextContent('+60 gold')

    await user.click(screen.getByTestId('home-rank-rewards-dismiss'))
    expect(clearRecentRankRewards).toHaveBeenCalledTimes(1)
  })

  test('hides rank rewards banner when no rewards are pending', () => {
    const contextValue = createContextValue({
      recentRankRewards: [],
    })

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('home-rank-rewards-banner')).not.toBeInTheDocument()
  })

  test('opens rank modal from rank trigger and renders ordered rows with rewards and statuses', async () => {
    const user = userEvent.setup()
    const contextValue = createContextValue()

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('home-rank-modal')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('home-rank-trigger'))

    const modal = screen.getByTestId('home-rank-modal')
    expect(modal).toBeInTheDocument()

    const rowTestIds = Array.from(modal.querySelectorAll('[data-testid^="home-rank-modal-row-"]')).map((node) =>
      node.getAttribute('data-testid'),
    )
    expect(rowTestIds).toEqual([
      'home-rank-modal-row-R1',
      'home-rank-modal-row-R2',
      'home-rank-modal-row-R3',
      'home-rank-modal-row-R4',
      'home-rank-modal-row-R5',
      'home-rank-modal-row-R6',
      'home-rank-modal-row-R7',
      'home-rank-modal-row-R8',
    ])

    expect(screen.getByTestId('home-rank-modal-reward-R1')).toHaveTextContent('+40 gold')
    expect(screen.getByTestId('home-rank-modal-reward-R2')).toHaveTextContent('+60 gold + 1 common pack')
    expect(screen.getByTestId('home-rank-modal-status-R1')).toHaveTextContent('In progress')
    expect(screen.getByTestId('home-rank-modal-status-R2')).toHaveTextContent('Locked')
  })

  test('marks reached ranks based on current score thresholds', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.stats.played = 3
    profile.stats.won = 0

    const contextValue = createContextValue({ profile })

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    await user.click(screen.getByTestId('home-rank-trigger'))

    expect(screen.getByTestId('home-rank-modal-status-R1')).toHaveTextContent('Reached')
    expect(screen.getByTestId('home-rank-modal-status-R2')).toHaveTextContent('Reached')
    expect(screen.getByTestId('home-rank-modal-status-R3')).toHaveTextContent('Locked')
  })

  test('closes rank modal with close button, backdrop click, and Escape key', async () => {
    const user = userEvent.setup()
    const contextValue = createContextValue()

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    await user.click(screen.getByTestId('home-rank-trigger'))
    await user.click(screen.getByTestId('home-rank-modal-close'))
    expect(screen.queryByTestId('home-rank-modal')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('home-rank-trigger'))
    const backdrop = screen.getByTestId('home-rank-modal-backdrop')
    await user.click(backdrop)
    expect(screen.queryByTestId('home-rank-modal')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('home-rank-trigger'))
    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('home-rank-modal')).not.toBeInTheDocument()
  })

  test('next best action is continue match when a match is active', () => {
    const contextValue = createContextValue({
      currentMatch: {} as GameContextValue['currentMatch'],
    })

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('home-next-action-title')).toHaveTextContent('Continue match')
    expect(screen.getByTestId('home-next-action-cta')).toHaveTextContent('Continue')
    expect(screen.getByTestId('home-next-action-cta')).toHaveAttribute('href', '/match')
  })

  test('next best action prioritizes opening packs when inventory has packs', () => {
    const profile = createDefaultProfile()
    profile.packInventoryByRarity.common = 2
    profile.gold = 10

    const contextValue = createContextValue({ profile })

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('home-next-action-title')).toHaveTextContent('Open packs')
    expect(screen.getByTestId('home-next-action-cta')).toHaveAttribute('href', '/packs')
  })

  test('next best action suggests finishing deck when selected deck is incomplete and no packs are available', () => {
    const profile = createDefaultProfile()
    profile.gold = 10
    profile.packInventoryByRarity.common = 0
    profile.packInventoryByRarity.uncommon = 0
    profile.packInventoryByRarity.rare = 0
    profile.packInventoryByRarity.epic = 0
    profile.packInventoryByRarity.legendary = 0
    profile.deckSlots[0].cards = profile.deckSlots[0].cards.slice(0, 4)

    const contextValue = createContextValue({ profile })

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('home-next-action-title')).toHaveTextContent('Finish deck')
    expect(screen.getByTestId('home-next-action-cta')).toHaveAttribute('href', '/setup')
  })

  test('next best action falls back to start duel when no higher priority action is available', () => {
    const profile = createDefaultProfile()
    profile.gold = 20
    profile.packInventoryByRarity.common = 0
    profile.packInventoryByRarity.uncommon = 0
    profile.packInventoryByRarity.rare = 0
    profile.packInventoryByRarity.epic = 0
    profile.packInventoryByRarity.legendary = 0

    const contextValue = createContextValue({ profile })

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('home-next-action-title')).toHaveTextContent('Start a duel')
    expect(screen.getByTestId('home-next-action-cta')).toHaveAttribute('href', '/setup')
  })

  test('home quick actions are rendered', () => {
    const contextValue = createContextValue()

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('home-quick-action-play')).toHaveTextContent('Play')
    expect(screen.getByTestId('home-quick-action-packs')).toHaveTextContent('Open Packs')
    expect(screen.getByTestId('home-quick-action-setup')).toHaveTextContent('Edit Deck')
  })
})
